import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { ContentNav } from "@/components/admin/content-nav";
import { TestimonialAdmin } from "@/components/admin/testimonial-admin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";

export const metadata: Metadata = { title: "Testimonials" };
export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  await requireAdmin("/admin/content/testimonials");
  const testimonials = await prisma.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Website content"
        title="Testimonials"
        description="Only publish permissioned quotes. Customer reviews from completed orders are moderated separately under Reviews and automatically feed the public review section."
      />
      <ContentNav />
      <TestimonialAdmin
        testimonials={testimonials.map((testimonial) => ({
          id: testimonial.id,
          name: testimonial.name,
          location: testimonial.location,
          quote: testimonial.quote,
          rating: testimonial.rating,
          sortOrder: testimonial.sortOrder,
          isActive: testimonial.isActive,
        }))}
      />
    </>
  );
}
