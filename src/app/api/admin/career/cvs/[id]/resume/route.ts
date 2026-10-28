import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const { id } = await params;
  const application = await prisma.careerApplication.findUnique({
    where: { id },
    select: { resumeUrl: true, resumeFileName: true },
  });
  if (!application?.resumeUrl.startsWith("resumes/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const token = process.env.CAREER_BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Private resume storage is not configured." }, { status: 503 });
  }

  const blob = await get(application.resumeUrl, { access: "private", token });
  if (blob?.statusCode !== 200) return new NextResponse("Not found", { status: 404 });

  const filename = (application.resumeFileName || "resume").replace(/[\r\n"\\]/g, "_");
  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
