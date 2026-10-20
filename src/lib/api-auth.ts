import "server-only";
import { getCurrentUser } from "@/lib/security";
import type { Role } from "@/lib/constants";

export function apiForbidden(message = "You do not have access to this export.") {
  return new Response(message, {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export function apiUnauthorized() {
  return new Response("Please sign in to continue.", {
    status: 401,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function requireExportUser(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: apiUnauthorized() } as const;
  if (!roles.includes(user.role as Role)) {
    return { user: null, response: apiForbidden() } as const;
  }
  return { user, response: null } as const;
}
