import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

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

async function ensureDataFiles() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function getVacancies(): Promise<CareerVacancy[]> {
  try {
    await ensureDataFiles();
    const content = await readFile(VACANCIES_FILE, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.error("Error reading vacancies file:", error);
    return [];
  }
}

export async function getActiveVacancies(): Promise<CareerVacancy[]> {
  const all = await getVacancies();
  return all.filter((v) => v.status === "ACTIVE");
}

export async function getVacancyById(id: string): Promise<CareerVacancy | null> {
  const all = await getVacancies();
  return all.find((v) => v.id === id) ?? null;
}

export async function saveVacancy(
  input: Omit<CareerVacancy, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<CareerVacancy> {
  await ensureDataFiles();
  const all = await getVacancies();
  const now = new Date().toISOString();

  if (input.id) {
    // Update existing
    const index = all.findIndex((v) => v.id === input.id);
    if (index !== -1) {
      const updated: CareerVacancy = {
        ...all[index],
        ...input,
        id: input.id,
        updatedAt: now,
      };
      all[index] = updated;
      await writeFile(VACANCIES_FILE, JSON.stringify(all, null, 2), "utf-8");
      return updated;
    }
  }

  // Create new
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  const newVacancy: CareerVacancy = {
    ...input,
    id: `${slug || "role"}-${randomUUID().slice(0, 6)}`,
    createdAt: now,
    updatedAt: now,
  };

  all.unshift(newVacancy);
  await writeFile(VACANCIES_FILE, JSON.stringify(all, null, 2), "utf-8");
  return newVacancy;
}

export async function deleteVacancy(id: string): Promise<boolean> {
  await ensureDataFiles();
  const all = await getVacancies();
  const filtered = all.filter((v) => v.id !== id);
  if (filtered.length === all.length) return false;
  await writeFile(VACANCIES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}

export async function toggleVacancyStatus(id: string): Promise<CareerVacancy | null> {
  await ensureDataFiles();
  const all = await getVacancies();
  const item = all.find((v) => v.id === id);
  if (!item) return null;

  item.status = item.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
  item.updatedAt = new Date().toISOString();

  await writeFile(VACANCIES_FILE, JSON.stringify(all, null, 2), "utf-8");
  return item;
}

export async function getReceivedCVs(): Promise<ReceivedCV[]> {
  try {
    await ensureDataFiles();
    const content = await readFile(CVS_FILE, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveReceivedCV(
  input: Omit<ReceivedCV, "id" | "createdAt" | "status">,
): Promise<ReceivedCV> {
  await ensureDataFiles();
  const all = await getReceivedCVs();
  const newCV: ReceivedCV = {
    ...input,
    id: randomUUID(),
    status: "NEW",
    createdAt: new Date().toISOString(),
  };

  all.unshift(newCV);
  await writeFile(CVS_FILE, JSON.stringify(all, null, 2), "utf-8");
  return newCV;
}

export async function updateCVStatus(
  id: string,
  status: ReceivedCV["status"],
): Promise<boolean> {
  await ensureDataFiles();
  const all = await getReceivedCVs();
  const item = all.find((c) => c.id === id);
  if (!item) return false;

  item.status = status;
  await writeFile(CVS_FILE, JSON.stringify(all, null, 2), "utf-8");
  return true;
}

export async function deleteReceivedCV(id: string): Promise<boolean> {
  await ensureDataFiles();
  const all = await getReceivedCVs();
  const filtered = all.filter((c) => c.id !== id);
  if (filtered.length === all.length) return false;
  await writeFile(CVS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}
