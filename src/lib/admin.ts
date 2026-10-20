import "server-only";
import { revalidatePath } from "next/cache";
import {
  assertSameOrigin,
  getActionUser,
  type AuthorizationError,
} from "@/lib/security";
import { writeAuditLog } from "@/lib/audit";

export async function staffActionUser() {
  await assertSameOrigin();
  return getActionUser(["ADMIN", "STAFF"]);
}

export async function adminActionUser() {
  await assertSameOrigin();
  return getActionUser(["ADMIN"]);
}

export function refreshAdmin(...paths: string[]) {
  revalidatePath("/admin");
  for (const path of paths) revalidatePath(path);
}

export async function auditAction(
  user: { id: string; email: string },
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown> | string | null,
) {
  await writeAuditLog({
    userId: user.id,
    actorEmail: user.email,
    action,
    entity,
    entityId,
    details,
  });
}

export function actionErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AuthorizationError"
  ) {
    return (error as AuthorizationError).message || "You do not have permission.";
  }
  console.error(fallback, error);
  return fallback;
}
