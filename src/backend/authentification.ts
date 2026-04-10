export type AppRole = "guest" | "user" | "admin";

const VALID_ROLES: AppRole[] = ["guest", "user", "admin"];

export function getRequestRole(req: Request): AppRole {
  const headerRole = req.headers.get("x-demo-role")?.toLowerCase();
  if (headerRole && VALID_ROLES.includes(headerRole as AppRole)) {
    return headerRole as AppRole;
  }

  return "guest";
}

export function isUserAuthenticated(req: Request): boolean {
  return getRequestRole(req) !== "guest";
}

export function hasAnyRole(req: Request, allowedRoles: AppRole[]): boolean {
  const role = getRequestRole(req);
  return allowedRoles.includes(role);
}
