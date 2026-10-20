export function isAdminRole(role: string | undefined | null) {
  return role === "ADMIN";
}

export function isStaffRole(role: string | undefined | null) {
  return role === "STAFF" || role === "ADMIN";
}
