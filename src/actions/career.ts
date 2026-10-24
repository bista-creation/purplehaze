"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, getClientIp, requireStaff } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  careerApplicationSchema,
  type CareerApplicationInput,
} from "@/lib/validations";
import { sendContactNotification } from "@/lib/email";
import {
  saveReceivedCV,
  saveVacancy,
  deleteVacancy,
  toggleVacancyStatus,
  updateCVStatus,
  deleteReceivedCV,
  type ReceivedCV,
} from "@/lib/careers-store";

export type CareerActionResult = {
  success: boolean;
  message: string;
};

export async function submitCareerApplicationAction(
  input: CareerApplicationInput,
): Promise<CareerActionResult> {
  const parsed = careerApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check the application form.",
    };
  }

  try {
    await assertSameOrigin();

    const ip = await getClientIp();
    const limit = await checkRateLimit(`career-apply:${ip}`, 4, 15 * 60_000);
    if (!limit.success) {
      return {
        success: false,
        message: "You have submitted multiple applications recently. Please wait a while before trying again.",
      };
    }

    // 1. Always save in dynamic CV store
    await saveReceivedCV({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      position: parsed.data.position,
      experience: parsed.data.experience,
      employmentType: "Full-time",
      message: parsed.data.message,
      resumeUrl: parsed.data.resumeUrl,
      resumeFileName: parsed.data.resumeFileName,
    });

    const applicationSummary = [
      `--- Purple Haze Restro & Garden - Job Application ---`,
      `Position: ${parsed.data.position}`,
      `Experience Level: ${parsed.data.experience}`,
      `Employment Type: Full-time`,
      `Applicant: ${parsed.data.name}`,
      `Phone: ${parsed.data.phone}`,
      `Email: ${parsed.data.email}`,
      `CV / Resume File: ${parsed.data.resumeUrl}${
        parsed.data.resumeFileName ? ` (${parsed.data.resumeFileName})` : ""
      }`,
      ``,
      `--- Applicant Message / Background ---`,
      parsed.data.message,
    ].join("\n");

    // 2. Try recording in Prisma contactMessage and Notification if DB is connected
    try {
      const created = await prisma.contactMessage.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          subject: `[Job Application: ${parsed.data.position}] ${parsed.data.name}`,
          message: applicationSummary,
        },
      });

      await prisma.notification.upsert({
        where: { eventKey: `career:${created.id}:created` },
        update: {},
        create: {
          eventKey: `career:${created.id}:created`,
          type: "MESSAGE",
          title: `Job Application: ${parsed.data.position}`,
          message: `${parsed.data.name} applied for ${parsed.data.position} in Biratnagar.`,
          link: `/admin/career?tab=cvs`,
        },
      });

      after(async () => {
        await sendContactNotification({
          name: created.name,
          email: created.email,
          phone: created.phone,
          subject: created.subject,
          message: created.message,
        }).catch(() => undefined);
      });
    } catch (dbError) {
      // Local dev might not have Docker PostgreSQL active, but CV is saved in store
      console.warn("Prisma contactMessage save skipped:", dbError);
    }

    revalidatePath("/admin/career");
    revalidatePath("/career");

    return {
      success: true,
      message:
        "Thank you! Your job application and CV have been received. Our management team at Airport Road, Biratnagar will review your credentials and contact you soon.",
    };
  } catch (error) {
    console.error("Career application submission failed:", error);
    return {
      success: false,
      message:
        "Unable to submit your application at this moment. Please call us or visit Purple Haze directly.",
    };
  }
}

/* =========================================================================
   ADMIN ACTIONS (ANNOUNCE VACANCIES & MANAGE RECEIVED CVS)
   ========================================================================= */

export async function adminSaveVacancyAction(input: {
  id?: string;
  title: string;
  department: string;
  type?: string;
  experience: string;
  salary?: string;
  description: string;
  skills: string; // comma separated
  image?: string;
  status: "ACTIVE" | "CLOSED" | "DRAFT";
  location?: string;
}): Promise<CareerActionResult> {
  await requireStaff("/admin/career");
  await assertSameOrigin();

  if (!input.title.trim()) {
    return { success: false, message: "Please provide a job title." };
  }
  if (!input.description.trim()) {
    return { success: false, message: "Please enter a job description." };
  }

  const skillsArray = input.skills
    ? input.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  await saveVacancy({
    id: input.id,
    title: input.title.trim(),
    department: input.department.trim() || "Front of House",
    type: "Full-time",
    experience: input.experience.trim() || "1+ Years Experience",
    salary: input.salary?.trim() || undefined,
    description: input.description.trim(),
    skills: skillsArray.length > 0 ? skillsArray : ["Full-time Dedication"],
    image: input.image?.trim() || undefined,
    status: input.status || "ACTIVE",
    location: input.location?.trim() || "Airport Road, Biratnagar",
  });

  revalidatePath("/career");
  revalidatePath("/admin/career");

  return {
    success: true,
    message: input.id
      ? "Vacancy updated successfully!"
      : "New vacancy announced successfully!",
  };
}

export async function adminDeleteVacancyAction(
  id: string,
): Promise<CareerActionResult> {
  await requireStaff("/admin/career");
  await assertSameOrigin();

  const success = await deleteVacancy(id);
  if (!success) {
    return { success: false, message: "Vacancy not found." };
  }

  revalidatePath("/career");
  revalidatePath("/admin/career");
  return { success: true, message: "Vacancy deleted." };
}

export async function adminToggleVacancyAction(
  id: string,
): Promise<CareerActionResult> {
  await requireStaff("/admin/career");
  await assertSameOrigin();

  const item = await toggleVacancyStatus(id);
  if (!item) {
    return { success: false, message: "Vacancy not found." };
  }

  revalidatePath("/career");
  revalidatePath("/admin/career");
  return {
    success: true,
    message: `Vacancy marked as ${item.status.toLowerCase()}.`,
  };
}

export async function adminUpdateCVStatusAction(
  id: string,
  status: ReceivedCV["status"],
): Promise<CareerActionResult> {
  await requireStaff("/admin/career");
  await assertSameOrigin();

  const ok = await updateCVStatus(id, status);
  if (!ok) return { success: false, message: "Candidate CV not found." };

  revalidatePath("/admin/career");
  return { success: true, message: `Applicant marked as ${status.toLowerCase()}.` };
}

export async function adminDeleteCVAction(
  id: string,
): Promise<CareerActionResult> {
  await requireStaff("/admin/career");
  await assertSameOrigin();

  const ok = await deleteReceivedCV(id);
  if (!ok) return { success: false, message: "Candidate CV not found." };

  revalidatePath("/admin/career");
  return { success: true, message: "Application record removed." };
}
