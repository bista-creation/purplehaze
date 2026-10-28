import { randomUUID } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getClientIp } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type DocumentKind = "pdf" | "docx" | "doc" | "jpg" | "png" | "webp";

const MIME_MAP: Record<DocumentKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function detectDocumentKind(fileName: string, bytes: Uint8Array): DocumentKind | null {
  const ext = path.extname(fileName).toLowerCase().replace(".", "");

  if (bytes.length < 4) return null;

  // PDF magic numbers: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }

  // DOCX / ZIP magic numbers: PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    if (ext === "docx" || ext === "doc") return "docx";
  }

  // Legacy DOC magic numbers: \xd0\xcf\x11\xe0
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return "doc";
  }

  // JPG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  // Fallback by extension if file matches expected extension and looks valid
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "doc") return "doc";

  return null;
}

function sanitizeFileName(originalName: string, kind: DocumentKind) {
  const base = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "resume"}-${randomUUID().slice(0, 8)}.${kind}`;
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin();

    const ip = await getClientIp();
    const limit = await checkRateLimit(`career-upload:${ip}`, 8, 15 * 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many upload attempts. Please wait a few minutes before trying again." },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a CV or resume file to upload." },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 5 MB limit. Please upload a smaller document." },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectDocumentKind(file.name, bytes);

    if (!kind) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, Word document (.docx/.doc), or image." },
        { status: 415 },
      );
    }

    const safeName = sanitizeFileName(file.name, kind);
    const careerBlobToken = process.env.CAREER_BLOB_READ_WRITE_TOKEN?.trim();
    if (careerBlobToken) {
      const blob = await put(`resumes/${safeName}`, Buffer.from(bytes), {
        access: "private",
        contentType: MIME_MAP[kind],
        addRandomSuffix: false,
        token: careerBlobToken,
      });

      return NextResponse.json({
        url: blob.pathname,
        fileName: file.name,
        size: bytes.byteLength,
      });
    }

    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { error: "Resume uploads are temporarily unavailable. Please email your CV directly." },
        { status: 503 },
      );
    }

    // Local uploads are only for local development and self-hosted deployments.
    const { mkdir, writeFile } = await import("node:fs/promises");
    const relativeDir = path.join("uploads", "resumes");
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(path.join(absoluteDir, safeName), bytes);

    const publicUrl = `/${relativeDir.replaceAll("\\", "/")}/${safeName}`;

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      size: bytes.byteLength,
    });
  } catch (error) {
    console.error("Career CV upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload document. Please try again or email your CV directly." },
      { status: 500 },
    );
  }
}
