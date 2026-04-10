export type DemoRole = "guest" | "user" | "admin";

export const roleLabels: Record<DemoRole, string> = {
  guest: "Non authentifie",
  user: "Utilisateur",
  admin: "Administrateur"
};

export type RolePermissions = {
  canViewPlats: boolean;
  canOrderPlats: boolean;
  canCreatePlat: boolean;
  canEditPlat: boolean;
  canDeletePlat: boolean;
};

export const permissionsByRole: Record<DemoRole, RolePermissions> = {
  guest: {
    canViewPlats: false,
    canOrderPlats: false,
    canCreatePlat: false,
    canEditPlat: false,
    canDeletePlat: false
  },
  user: {
    canViewPlats: true,
    canOrderPlats: true,
    canCreatePlat: false,
    canEditPlat: false,
    canDeletePlat: false
  },
  admin: {
    canViewPlats: true,
    canOrderPlats: true,
    canCreatePlat: true,
    canEditPlat: true,
    canDeletePlat: true
  }
};

const ROLE_STORAGE_KEY = "demo-role";

export function readStoredRole(): DemoRole {
  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (stored === "guest" || stored === "user" || stored === "admin") {
    return stored;
  }

  return "guest";
}

export function persistRole(role: DemoRole): void {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}
