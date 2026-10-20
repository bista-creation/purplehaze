import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";
import { list } from "@vercel/blob";
import type { ImageFolder, ImageUploadMode } from "@/lib/upload-types";

const FOLDERS: Record<ImageFolder, string[]> = {
  menu: ["menu", path.join("uploads", "menu")],
  venues: ["venues", path.join("uploads", "venues")],
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/**
 * Local disk uploads are a development/self-hosted convenience. Vercel Blob
 * is used for production because the serverless filesystem is ephemeral.
 * UploadThing remains supported for existing deployments.
 */
export function getImageUploadMode(): ImageUploadMode {
  if (process.env.UPLOADTHING_TOKEN?.trim()) return "uploadthing";
  if (
    process.env.BLOB_READ_WRITE_TOKEN?.trim() &&
    process.env.VERCEL_ENV === "production"
  ) {
    return "blob";
  }
  if (process.env.UPLOADS_LOCAL === "true") return "local";
  if (process.env.VERCEL === "1") return "none";
  return "local";
}

export function isLocalUploadAllowed() {
  return getImageUploadMode() === "local";
}

export async function listImageOptions(folder: ImageFolder) {
  const options = new Set<string>();

  for (const relative of FOLDERS[folder]) {
    const directory = path.join(process.cwd(), "public", "images", relative);
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const extension = path.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(extension)) continue;
        const urlPath = `/images/${relative.replaceAll("\\", "/")}/${entry.name}`;
        options.add(urlPath);
      }
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      if (code !== "ENOENT") {
        console.error(`Could not list ${folder} images`, error);
      }
    }
  }

  if (
    process.env.BLOB_READ_WRITE_TOKEN?.trim() &&
    process.env.VERCEL_ENV === "production"
  ) {
    try {
      const { blobs } = await list({
        prefix: `${folder}/`,
        limit: 100,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      for (const blob of blobs) options.add(blob.url);
    } catch (error) {
      console.error(`Could not list ${folder} Blob images`, error);
    }
  }

  return [...options].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}
