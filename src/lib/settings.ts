import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/constants";

export type SettingsMap = Record<string, string>;

export interface PublicSettings {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  landline: string;
  address: string;
  hours: string;
  facebook: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutBody: string;
  seoTitle: string;
  seoDescription: string;
  acceptingOrders: boolean;
  taxRate: number;
  serviceChargeRate: number;
  minDeliveryOrder: number;
  prepTimeMinutes: number;
  cancellationWindowMinutes: number;
  codEnabled: boolean;
  esewaEnabled: boolean;
  khaltiEnabled: boolean;
}

export const getSettings = cache(async (): Promise<SettingsMap> => {
  try {
    const rows = await prisma.setting.findMany();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { ...DEFAULT_SETTINGS, ...values };
  } catch {
    console.warn("Database offline; using default settings.");
    return { ...DEFAULT_SETTINGS };
  }
});

export async function getPublicSettings(): Promise<PublicSettings> {
  const settings = await getSettings();
  return {
    name: settings["restaurant.name"],
    tagline: settings["restaurant.tagline"],
    email: settings["restaurant.email"],
    phone: settings["restaurant.phone"],
    landline: settings["restaurant.landline"],
    address: settings["restaurant.address"],
    hours: settings["restaurant.hours"],
    facebook: settings["restaurant.facebook"],
    heroEyebrow: settings["content.heroEyebrow"],
    heroTitle: settings["content.heroTitle"],
    heroSubtitle: settings["content.heroSubtitle"],
    aboutTitle: settings["content.aboutTitle"],
    aboutBody: settings["content.aboutBody"],
    seoTitle: settings["seo.title"],
    seoDescription: settings["seo.description"],
    acceptingOrders: settings["order.acceptingOrders"] === "true",
    taxRate: Number(settings["order.taxRate"] ?? 13),
    serviceChargeRate: Number(settings["order.serviceChargeRate"] ?? 0),
    minDeliveryOrder: Number(settings["order.minDeliveryOrder"] ?? 0),
    prepTimeMinutes: Number(settings["order.prepTimeMinutes"] ?? 25),
    cancellationWindowMinutes: Number(
      settings["order.cancellationWindowMinutes"] ?? 10,
    ),
    codEnabled: settings["payment.codEnabled"] === "true",
    esewaEnabled: settings["payment.esewaEnabled"] === "true",
    khaltiEnabled: settings["payment.khaltiEnabled"] === "true",
  };
}

export async function setSettings(
  entries: Array<{ key: string; value: string; group?: string }>,
) {
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.setting.upsert({
        where: { key: entry.key },
        create: {
          key: entry.key,
          value: entry.value,
          group: entry.group ?? "general",
        },
        update: { value: entry.value, group: entry.group ?? "general" },
      }),
    ),
  );
}
