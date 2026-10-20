import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  assertSameOrigin,
  getCurrentUser,
  isAdminRole,
} from "@/lib/security";
import { getImageUploadMode } from "@/lib/uploads";
import type { ImageFolder } from "@/lib/upload-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const FOLDER_NAMES: Record<ImageFolder, string> = {
  menu: "menu",
  venues: "venues",
};

type ImageKind = "jpg" | "png" | "webp" | "avif" | "gif";

function detectImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
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
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "gif";
  }

  const ascii = new TextDecoder("ascii").decode(bytes.slice(0, 32));
  if (ascii.includes("ftyp") && ascii.includes("avif")) return "avif";
  return null;
}

function safeFileName(originalName: string, kind: ImageKind) {
  const base = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "photo"}-${randomUUID().slice(0, 8)}.${kind}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ folder: string }> },
) {
  try {
    await assertSameOrigin();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to upload photos." },
        { status: 401 },
      );
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: "Only administrators can upload catalogue photos." },
        { status: 403 },
      );
    }
    if (getImageUploadMode() !== "local") {
      return NextResponse.json(
        { error: "Local uploads are disabled in this environment." },
        { status: 403 },
      );
    }

    const limit = await checkRateLimit(`catalogue-photo:${user.id}`, 30, 10 * 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }

    const { folder } = await params;
    if (!(folder in FOLDER_NAMES)) {
      return NextResponse.json(
        { error: "Unknown image folder." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Choose an image file to upload." },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Choose an image smaller than 10 MB." },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectImage(bytes);
    if (!kind) {
      return NextResponse.json(
        { error: "That file is not a JPG, PNG, WebP, AVIF or GIF image." },
        { status: 415 },
      );
    }

    const relativeFolder = path.join(
      "uploads",
      FOLDER_NAMES[folder as ImageFolder],
    );
    const directory = path.join(
      process.cwd(),
      "public",
      "images",
      relativeFolder,
    );
    await mkdir(directory, { recursive: true });

    const fileName = safeFileName(file.name, kind);
    await writeFile(path.join(directory, fileName), bytes);

    return NextResponse.json({
      url: `/images/${relativeFolder.replaceAll("\\", "/")}/${fileName}`,
      size: bytes.byteLength,
    });
  } catch (error) {
    console.error("Catalogue photo upload failed", error);
    return NextResponse.json(
      { error: "The photo could not be uploaded. Please try again." },
      { status: 500 },
    );
  }
}
