"use server";

import { prisma } from "@/lib/prisma";
import {
  actionErrorMessage,
  adminActionUser,
  auditAction,
  refreshAdmin,
  staffActionUser,
} from "@/lib/admin";
import {
  bannerAdminSchema,
  galleryAdminSchema,
  testimonialAdminSchema,
  type BannerAdminInput,
  type GalleryAdminInput,
  type TestimonialAdminInput,
} from "@/lib/validations";
import type { AdminActionResult } from "@/actions/admin/orders";
import { parseNepalDateTime } from "@/lib/time";

export async function saveGalleryImageAction(
  input: GalleryAdminInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = galleryAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the gallery details.",
    };
  }
  try {
    const user = await adminActionUser();
    const data = {
      url: parsed.data.url,
      title: parsed.data.title,
      category: parsed.data.category || "Restaurant",
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    };
    if (id) await prisma.galleryImage.update({ where: { id }, data });
    else await prisma.galleryImage.create({ data });
    await auditAction(
      user,
      id ? "gallery.update" : "gallery.create",
      "GalleryImage",
      id,
      {
        title: data.title,
      },
    );
    refreshAdmin("/admin/content/gallery", "/gallery");
    return { success: true, message: id ? "Photo updated." : "Photo added." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the photo."),
    };
  }
}

export async function deleteGalleryImageAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const image = await prisma.galleryImage.findUnique({ where: { id } });
    if (!image) return { success: false, message: "Photo not found." };
    await prisma.galleryImage.delete({ where: { id } });
    await auditAction(user, "gallery.delete", "GalleryImage", id, {
      title: image.title,
    });
    refreshAdmin("/admin/content/gallery", "/gallery");
    return { success: true, message: "Photo removed from the gallery." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't remove the photo."),
    };
  }
}

export async function saveBannerAction(
  input: BannerAdminInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = bannerAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the banner details.",
    };
  }
  try {
    const user = await adminActionUser();
    const startsAt = parsed.data.startsAt
      ? parseNepalDateTime(parsed.data.startsAt)
      : null;
    const endsAt = parsed.data.endsAt
      ? parseNepalDateTime(parsed.data.endsAt)
      : null;
    if (startsAt && endsAt && endsAt <= startsAt) {
      return {
        success: false,
        message: "The banner end must be after its start time.",
      };
    }
    const data = {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      image: parsed.data.image || null,
      ctaLabel: parsed.data.ctaLabel || null,
      ctaHref: parsed.data.ctaHref || null,
      sortOrder: parsed.data.sortOrder,
      startsAt,
      endsAt,
      isActive: parsed.data.isActive,
    };
    if (id) await prisma.banner.update({ where: { id }, data });
    else await prisma.banner.create({ data });
    await auditAction(
      user,
      id ? "banner.update" : "banner.create",
      "Banner",
      id,
      {
        title: data.title,
      },
    );
    refreshAdmin("/admin/content/banners", "/");
    return {
      success: true,
      message: id ? "Banner updated." : "Banner created.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the banner."),
    };
  }
}

export async function deleteBannerAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) return { success: false, message: "Banner not found." };
    await prisma.banner.delete({ where: { id } });
    await auditAction(user, "banner.delete", "Banner", id, {
      title: banner.title,
    });
    refreshAdmin("/admin/content/banners", "/");
    return { success: true, message: "Banner deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the banner."),
    };
  }
}

export async function saveTestimonialAction(
  input: TestimonialAdminInput,
  id?: string,
): Promise<AdminActionResult> {
  const parsed = testimonialAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Check the testimonial.",
    };
  }
  try {
    const user = await adminActionUser();
    const data = {
      name: parsed.data.name,
      location: parsed.data.location || null,
      quote: parsed.data.quote,
      rating: parsed.data.rating,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    };
    if (id) await prisma.testimonial.update({ where: { id }, data });
    else await prisma.testimonial.create({ data });
    await auditAction(
      user,
      id ? "testimonial.update" : "testimonial.create",
      "Testimonial",
      id,
      { name: data.name },
    );
    refreshAdmin("/admin/content/testimonials", "/");
    return {
      success: true,
      message: id ? "Testimonial updated." : "Testimonial created.",
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the testimonial."),
    };
  }
}

export async function deleteTestimonialAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const testimonial = await prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial)
      return { success: false, message: "Testimonial not found." };
    await prisma.testimonial.delete({ where: { id } });
    await auditAction(user, "testimonial.delete", "Testimonial", id, {
      name: testimonial.name,
    });
    refreshAdmin("/admin/content/testimonials", "/");
    return { success: true, message: "Testimonial deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the testimonial."),
    };
  }
}

export async function setReviewStatusAction(
  id: string,
  input: { isApproved?: boolean; isFeatured?: boolean },
): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return { success: false, message: "Review not found." };
    const isApproved = input.isApproved ?? review.isApproved;
    const isFeatured = input.isFeatured ?? review.isFeatured;
    await prisma.review.update({
      where: { id },
      data: {
        isApproved,
        isFeatured: isApproved ? isFeatured : false,
      },
    });
    await auditAction(user, "review.moderate", "Review", id, {
      isApproved,
      isFeatured,
    });
    refreshAdmin("/admin/reviews", "/");
    return { success: true, message: "Review updated." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update the review."),
    };
  }
}

export async function deleteReviewAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return { success: false, message: "Review not found." };
    await prisma.review.delete({ where: { id } });
    await auditAction(user, "review.delete", "Review", id, {
      rating: review.rating,
    });
    refreshAdmin("/admin/reviews", "/");
    return { success: true, message: "Review deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the review."),
    };
  }
}

export async function updateContactMessageAction(
  id: string,
  status: "NEW" | "READ" | "ARCHIVED",
): Promise<AdminActionResult> {
  try {
    const user = await staffActionUser();
    if (!["NEW", "READ", "ARCHIVED"].includes(status)) {
      return { success: false, message: "Choose a valid message status." };
    }
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) return { success: false, message: "Message not found." };
    await prisma.contactMessage.update({ where: { id }, data: { status } });
    await auditAction(user, "message.status.change", "ContactMessage", id, {
      status,
    });
    refreshAdmin("/admin/messages", "/admin");
    return {
      success: true,
      message: `Message marked ${status.toLowerCase()}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't update the message."),
    };
  }
}
