"use server";

import { revalidatePath } from "next/cache";
import { assertSameOrigin, requireStaff } from "@/lib/security";
import {
  deleteEventMenu,
  saveEventMenu,
  type EventMenuPackage,
} from "@/lib/event-menus-store";

export type EventMenuActionResult = {
  success: boolean;
  message: string;
};

export async function saveEventMenuAction(
  data: Partial<EventMenuPackage>,
  id?: string,
): Promise<EventMenuActionResult> {
  try {
    await assertSameOrigin();
    await requireStaff("/admin/event-menus");

    if (!data.name || data.name.trim().length < 2) {
      return { success: false, message: "Package name is required." };
    }

    if (!data.pricePerPerson || Number(data.pricePerPerson) <= 0) {
      return { success: false, message: "Enter a valid price per person." };
    }

    await saveEventMenu(data, id);

    revalidatePath("/events");
    revalidatePath("/events/menu");
    revalidatePath("/admin/event-menus");
    revalidatePath("/");

    return {
      success: true,
      message: id ? "Event menu package updated." : "Event menu package created.",
    };
  } catch (error) {
    console.error("Error saving event menu:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save event menu package.",
    };
  }
}

export async function deleteEventMenuAction(
  id: string,
): Promise<EventMenuActionResult> {
  try {
    await assertSameOrigin();
    await requireStaff("/admin/event-menus");

    const deleted = await deleteEventMenu(id);
    if (!deleted) {
      return { success: false, message: "Package not found." };
    }

    revalidatePath("/events");
    revalidatePath("/events/menu");
    revalidatePath("/admin/event-menus");
    revalidatePath("/");

    return { success: true, message: "Event menu package deleted." };
  } catch (error) {
    console.error("Error deleting event menu:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete event menu package.",
    };
  }
}

export async function toggleEventMenuStatusAction(
  id: string,
  isActive: boolean,
): Promise<EventMenuActionResult> {
  try {
    await assertSameOrigin();
    await requireStaff("/admin/event-menus");

    await saveEventMenu({ isActive }, id);

    revalidatePath("/events");
    revalidatePath("/events/menu");
    revalidatePath("/admin/event-menus");
    revalidatePath("/");

    return {
      success: true,
      message: isActive ? "Package is now public." : "Package is now hidden.",
    };
  } catch (error) {
    console.error("Error toggling event menu status:", error);
    return {
      success: false,
      message: "Could not update package status.",
    };
  }
}
