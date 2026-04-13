import { createClerkClient } from "@clerk/backend";

export type AppRole = "guest" | "user" | "admin";

const VALID_ROLES: AppRole[] = ["guest", "user", "admin"];

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
});

async function getUserRole(userId: string): Promise<AppRole> {
  try {
    const user = await clerk.users.getUser(userId);
    const metadata = (user as any).publicMetadata;
    const role = metadata?.role as AppRole | undefined;

    if (role && VALID_ROLES.includes(role)) {
      return role;
    }
  } catch {
    // ignore and fallback to default
  }

  return "user";
}

export async function getRequestRole(req: Request): Promise<AppRole> {
  try {
    const authState = await clerk.authenticateRequest(req);
    if (authState.isSignedIn !== true) {
      return "guest";
    }

    const auth = authState.toAuth();
    if (!auth.userId) {
      return "guest";
    }

    return await getUserRole(auth.userId);
  } catch {
    return "guest";
  }
}

export async function isUserAuthenticated(req: Request): Promise<boolean> {
  return (await getRequestRole(req)) !== "guest";
}

export async function hasAnyRole(req: Request, allowedRoles: AppRole[]): Promise<boolean> {
  const role = await getRequestRole(req);
  return allowedRoles.includes(role);
}
