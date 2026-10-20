"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  actionErrorMessage,
  adminActionUser,
  auditAction,
  refreshAdmin,
} from "@/lib/admin";
import { setSettings } from "@/lib/settings";
import { rupeesToPaisa } from "@/lib/money";
import type { AdminActionResult } from "@/actions/admin/orders";

const SETTING_GROUPS: Record<
  string,
  { keys: string[]; booleans: string[]; numbers: Record<string, [number, number]>; required: string[] }
> = {
  general: {
    keys: [
      "restaurant.name",
      "restaurant.tagline",
      "restaurant.email",
      "restaurant.phone",
      "restaurant.landline",
      "restaurant.address",
      "restaurant.hours",
      "restaurant.facebook",
    ],
    booleans: [],
    numbers: {},
    required: [
      "restaurant.name",
      "restaurant.email",
      "restaurant.phone",
      "restaurant.address",
      "restaurant.hours",
    ],
  },
  content: {
    keys: [
      "content.heroEyebrow",
      "content.heroTitle",
      "content.heroSubtitle",
      "content.aboutTitle",
      "content.aboutBody",
      "seo.title",
      "seo.description",
    ],
    booleans: [],
    numbers: {},
    required: [
      "content.heroTitle",
      "content.heroSubtitle",
      "content.aboutTitle",
      "content.aboutBody",
      "seo.title",
      "seo.description",
    ],
  },
  ordering: {
    keys: [
      "order.taxRate",
      "order.serviceChargeRate",
      "order.minDeliveryOrder",
      "order.prepTimeMinutes",
      "order.cancellationWindowMinutes",
    ],
    booleans: ["order.acceptingOrders"],
    numbers: {
      "order.taxRate": [0, 100],
      "order.serviceChargeRate": [0, 100],
      "order.minDeliveryOrder": [0, 100000],
      "order.prepTimeMinutes": [1, 180],
      "order.cancellationWindowMinutes": [0, 10080],
    },
    required: [],
  },
  payments: {
    keys: [],
    booleans: [
      "payment.codEnabled",
      "payment.esewaEnabled",
      "payment.khaltiEnabled",
    ],
    numbers: {},
    required: [],
  },
};

export async function updateSettingsAction(
  group: string,
  values: Record<string, string>,
): Promise<AdminActionResult> {
  const definition = SETTING_GROUPS[group];
  if (!definition) {
    return { success: false, message: "Unknown settings group." };
  }
  try {
    const user = await adminActionUser();
    const entries: Array<{ key: string; value: string; group: string }> = [];

    for (const key of [...definition.keys, ...definition.booleans]) {
      if (definition.booleans.includes(key)) {
        const raw = values[key];
        if (raw !== "true" && raw !== "false") {
          return { success: false, message: "Choose an on/off value for every toggle." };
        }
        entries.push({ key, value: raw, group });
        continue;
      }

      const raw = (values[key] ?? "").trim();
      if (definition.required.includes(key) && raw.length === 0) {
        return { success: false, message: `${key.split(".").pop()} is required.` };
      }
      if (raw.length > 5000) {
        return { success: false, message: "One of the fields is too long." };
      }

      const range = definition.numbers[key];
      if (range) {
        const number = Number(raw);
        if (!Number.isFinite(number) || number < range[0] || number > range[1]) {
          return {
            success: false,
            message: `${key.split(".").pop()} must be between ${range[0]} and ${range[1]}.`,
          };
        }
        entries.push({
          key,
          value:
            key === "order.minDeliveryOrder"
              ? String(rupeesToPaisa(number))
              : String(number),
          group,
        });
        continue;
      }

      if (key === "restaurant.email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) {
        return { success: false, message: "Enter a valid restaurant email." };
      }
      if (
        (key === "restaurant.facebook" || key === "restaurant.image") &&
        raw &&
        !/^https?:\/\/|^\//.test(raw)
      ) {
        return { success: false, message: "Links must start with https:// or /." };
      }
      entries.push({ key, value: raw, group });
    }

    await setSettings(entries);
    await auditAction(user, "settings.update", "Setting", null, {
      group,
      keys: entries.map((entry) => entry.key),
    });
    refreshAdmin("/admin/settings", "/admin/content");
    revalidatePath("/", "layout");
    return { success: true, message: "Settings saved." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the settings."),
    };
  }
}

function zoneData(input: {
  name: string;
  fee: number;
  minOrder: number;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 80) {
    return { ok: false as const, message: "Give the delivery zone a name." };
  }
  if (!Number.isFinite(input.fee) || input.fee < 0 || input.fee > 100000) {
    return { ok: false as const, message: "Enter a valid delivery fee." };
  }
  if (
    !Number.isFinite(input.minOrder) ||
    input.minOrder < 0 ||
    input.minOrder > 1000000
  ) {
    return { ok: false as const, message: "Enter a valid minimum order." };
  }
  return {
    ok: true as const,
    data: {
      name,
      fee: rupeesToPaisa(input.fee),
      minOrder: rupeesToPaisa(input.minOrder),
      sortOrder: Math.max(0, Math.round(input.sortOrder ?? 0)),
      isActive: input.isActive ?? true,
    },
  };
}

export async function saveDeliveryZoneAction(
  input: {
    name: string;
    fee: number;
    minOrder: number;
    sortOrder?: number;
    isActive?: boolean;
  },
  id?: string,
): Promise<AdminActionResult> {
  const parsed = zoneData(input);
  if (!parsed.ok) return { success: false, message: parsed.message };
  try {
    const user = await adminActionUser();
    if (id) {
      await prisma.deliveryZone.update({ where: { id }, data: parsed.data });
    } else {
      await prisma.deliveryZone.create({ data: parsed.data });
    }
    await auditAction(
      user,
      id ? "zone.update" : "zone.create",
      "DeliveryZone",
      id,
      { name: parsed.data.name, fee: parsed.data.fee },
    );
    refreshAdmin("/admin/settings", "/checkout");
    return { success: true, message: id ? "Delivery zone updated." : "Delivery zone added." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't save the delivery zone."),
    };
  }
}

export async function deleteDeliveryZoneAction(
  id: string,
): Promise<AdminActionResult> {
  try {
    const user = await adminActionUser();
    const zone = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) return { success: false, message: "Delivery zone not found." };
    await prisma.deliveryZone.delete({ where: { id } });
    await auditAction(user, "zone.delete", "DeliveryZone", id, { name: zone.name });
    refreshAdmin("/admin/settings", "/checkout");
    return { success: true, message: "Delivery zone deleted." };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "We couldn't delete the delivery zone."),
    };
  }
}
