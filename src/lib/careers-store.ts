import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type CareerVacancy = {
  id: string;
  title: string;
  department: string;
  type: string; // "Full-time"
  experience: string;
  salary?: string;
  description: string;
  skills: string[];
  image?: string;
  status: "ACTIVE" | "CLOSED" | "DRAFT";
  location: string;
  createdAt: string;
  updatedAt: string;
};

export type ReceivedCV = {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: string;
  employmentType: string;
  message: string;
  resumeUrl: string;
  resumeFileName?: string;
  status: "NEW" | "REVIEWED" | "SHORTLISTED" | "REJECTED";
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const VACANCIES_FILE = path.join(DATA_DIR, "vacancies.json");
const CVS_FILE = path.join(DATA_DIR, "career-applications.json");

function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getVacancies(): Promise<CareerVacancy[]> {
  try {
    const dbVacancies = await prisma.careerVacancy.findMany({
      orderBy: { createdAt: "desc" },
    });
    return dbVacancies.map((v) => ({
      id: v.id,
      title: v.title,
      department: v.department,
      type: v.type,
      experience: v.experience,
      salary: v.salary ?? undefined,
      description: v.description,
      skills: parseSkills(v.skills),
      image: v.image ?? undefined,
      status: v.status as CareerVacancy["status"],
      location: v.location,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));
  } catch (error) {
    if (process.env.VERCEL === "1") throw error;
    console.warn("Database lookup for vacancies failed, attempting local fallback:", error);
  }

  // Fallback to local data file only if database query errored
  try {
    const content = await readFile(VACANCIES_FILE, "utf-8");
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getActiveVacancies(): Promise<CareerVacancy[]> {
  const all = await getVacancies();
  return all.filter((v) => v.status === "ACTIVE");
}

export async function getVacancyById(id: string): Promise<CareerVacancy | null> {
  try {
    const v = await prisma.careerVacancy.findUnique({ where: { id } });
    if (v) {
      return {
        id: v.id,
        title: v.title,
        department: v.department,
        type: v.type,
        experience: v.experience,
        salary: v.salary ?? undefined,
        description: v.description,
        skills: parseSkills(v.skills),
        image: v.image ?? undefined,
        status: v.status as CareerVacancy["status"],
        location: v.location,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      };
    }
  } catch (error) {
    if (process.env.VERCEL === "1") throw error;
    // Local development fallback.
  }

  const all = await getVacancies();
  return all.find((v) => v.id === id) ?? null;
}

export async function saveVacancy(
  input: Omit<CareerVacancy, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<CareerVacancy> {
  const now = new Date();
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  const id = input.id || `${slug || "role"}-${randomUUID().slice(0, 6)}`;
  const skillsJson = JSON.stringify(input.skills || []);

  try {
    const record = await prisma.careerVacancy.upsert({
      where: { id },
      create: {
        id,
        title: input.title,
        department: input.department,
        type: input.type || "Full-time",
        experience: input.experience,
        salary: input.salary || null,
        description: input.description,
        skills: skillsJson,
        image: input.image || null,
        status: input.status || "ACTIVE",
        location: input.location || "Airport Road, Biratnagar",
      },
      update: {
        title: input.title,
        department: input.department,
        type: input.type || "Full-time",
        experience: input.experience,
        salary: input.salary || null,
        description: input.description,
        skills: skillsJson,
        image: input.image || null,
        status: input.status || "ACTIVE",
        location: input.location || "Airport Road, Biratnagar",
      },
    });

    return {
      id: record.id,
      title: record.title,
      department: record.department,
      type: record.type,
      experience: record.experience,
      salary: record.salary ?? undefined,
      description: record.description,
      skills: parseSkills(record.skills),
      image: record.image ?? undefined,
      status: record.status as CareerVacancy["status"],
      location: record.location,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  } catch (dbError) {
    if (process.env.VERCEL === "1") throw dbError;
    console.error("Database saveVacancy failed, falling back to JSON:", dbError);
    // Local JSON fallback
    const all = await getVacancies();
    const existingIndex = all.findIndex((v) => v.id === id);
    const newVacancy: CareerVacancy = {
      ...input,
      id,
      createdAt: existingIndex !== -1 ? all[existingIndex]!.createdAt : now.toISOString(),
      updatedAt: now.toISOString(),
    };
    if (existingIndex !== -1) {
      all[existingIndex] = newVacancy;
    } else {
      all.unshift(newVacancy);
    }
    await writeFile(VACANCIES_FILE, JSON.stringify(all, null, 2), "utf-8").catch(() => {});
    return newVacancy;
  }
}

export async function deleteVacancy(id: string): Promise<boolean> {
  try {
    // Unlink any applications referencing this vacancy to prevent foreign key errors
    await prisma.careerApplication.updateMany({
      where: { vacancyId: id },
      data: { vacancyId: null },
    }).catch((error) => {
      if (process.env.VERCEL === "1") throw error;
    });

    await prisma.careerVacancy.delete({ where: { id } });
    if (process.env.VERCEL === "1") return true;
  } catch (dbErr: unknown) {
    const isP2025 = typeof dbErr === "object" && dbErr !== null && "code" in dbErr && (dbErr as { code: string }).code === "P2025";
    if (isP2025 && process.env.VERCEL === "1") return true;
    if (!isP2025) {
      if (process.env.VERCEL === "1") throw dbErr;
      console.warn("Database deleteVacancy failed, trying local fallback:", dbErr);
    }
  }

  try {
    const all = await getVacancies();
    const filtered = all.filter((v) => v.id !== id);
    await writeFile(VACANCIES_FILE, JSON.stringify(filtered, null, 2), "utf-8").catch(() => {});
  } catch {
    // Ignore read-only filesystem errors
  }

  return true;
}

export async function toggleVacancyStatus(id: string): Promise<CareerVacancy | null> {
  try {
    const current = await prisma.careerVacancy.findUnique({ where: { id } });
    if (current) {
      const nextStatus = current.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
      const updated = await prisma.careerVacancy.update({
        where: { id },
        data: { status: nextStatus },
      });
      return {
        id: updated.id,
        title: updated.title,
        department: updated.department,
        type: updated.type,
        experience: updated.experience,
        salary: updated.salary ?? undefined,
        description: updated.description,
        skills: parseSkills(updated.skills),
        image: updated.image ?? undefined,
        status: updated.status as CareerVacancy["status"],
        location: updated.location,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }
  } catch (error) {
    if (process.env.VERCEL === "1") throw error;
    // Local development fallback.
  }

  const all = await getVacancies();
  const item = all.find((v) => v.id === id);
  if (!item) return null;
  item.status = item.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
  item.updatedAt = new Date().toISOString();
  await writeFile(VACANCIES_FILE, JSON.stringify(all, null, 2), "utf-8").catch(() => {});
  return item;
}

export async function getReceivedCVs(): Promise<ReceivedCV[]> {
  try {
    const dbApps = await prisma.careerApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    return dbApps.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      position: a.position,
      experience: a.experience,
      employmentType: a.employmentType,
      message: a.message ?? "",
      resumeUrl: a.resumeUrl,
      resumeFileName: a.resumeFileName ?? undefined,
      status: a.status as ReceivedCV["status"],
      createdAt: a.createdAt.toISOString(),
    }));
  } catch (error) {
    if (process.env.VERCEL === "1") throw error;
    console.warn("Database lookup for applications failed, trying local fallback:", error);
  }

  try {
    const content = await readFile(CVS_FILE, "utf-8");
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveReceivedCV(
  input: Omit<ReceivedCV, "id" | "createdAt" | "status">,
): Promise<ReceivedCV> {
  const id = randomUUID();
  const now = new Date();

  try {
    const record = await prisma.careerApplication.create({
      data: {
        id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        position: input.position,
        experience: input.experience,
        employmentType: input.employmentType || "Full-time",
        message: input.message || null,
        resumeUrl: input.resumeUrl,
        resumeFileName: input.resumeFileName || null,
        status: "NEW",
      },
    });

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      position: record.position,
      experience: record.experience,
      employmentType: record.employmentType,
      message: record.message ?? "",
      resumeUrl: record.resumeUrl,
      resumeFileName: record.resumeFileName ?? undefined,
      status: record.status as ReceivedCV["status"],
      createdAt: record.createdAt.toISOString(),
    };
  } catch (dbError) {
    if (process.env.VERCEL === "1") throw dbError;
    console.error("Database saveReceivedCV failed, trying fallback:", dbError);
    const all = await getReceivedCVs();
    const newCV: ReceivedCV = {
      ...input,
      id,
      status: "NEW",
      createdAt: now.toISOString(),
    };
    all.unshift(newCV);
    await writeFile(CVS_FILE, JSON.stringify(all, null, 2), "utf-8").catch(() => {});
    return newCV;
  }
}

export async function updateCVStatus(
  id: string,
  status: ReceivedCV["status"],
): Promise<boolean> {
  try {
    await prisma.careerApplication.update({
      where: { id },
      data: { status },
    });
    return true;
  } catch (dbError: unknown) {
    const isP2025 = typeof dbError === "object" && dbError !== null && "code" in dbError && (dbError as { code: string }).code === "P2025";
    if (isP2025) {
      return true;
    }
    if (process.env.VERCEL === "1") throw dbError;
    console.warn("Database updateCVStatus failed, trying local fallback:", dbError);
  }

  try {
    const all = await getReceivedCVs();
    const item = all.find((c) => c.id === id);
    if (!item) return false;
    item.status = status;
    await writeFile(CVS_FILE, JSON.stringify(all, null, 2), "utf-8").catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function deleteReceivedCV(id: string): Promise<boolean> {
  try {
    await prisma.careerApplication.delete({ where: { id } });
    if (process.env.VERCEL === "1") return true;
  } catch (dbError: unknown) {
    const isP2025 = typeof dbError === "object" && dbError !== null && "code" in dbError && (dbError as { code: string }).code === "P2025";
    if (isP2025 && process.env.VERCEL === "1") return true;
    if (!isP2025) {
      if (process.env.VERCEL === "1") throw dbError;
      console.warn("Database deleteReceivedCV failed, trying local fallback:", dbError);
    }
  }

  try {
    const all = await getReceivedCVs();
    const filtered = all.filter((c) => c.id !== id);
    await writeFile(CVS_FILE, JSON.stringify(filtered, null, 2), "utf-8").catch(() => {});
  } catch {
    // Ignore read-only filesystem errors
  }

  return true;
}
