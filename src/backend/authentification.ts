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

export type AuthenticatedUser = {
  userId: string;
  email: string;
  fullName: string;
};

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

export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  try {
    const authState = await clerk.authenticateRequest(req);
    if (authState.isSignedIn !== true) {
      return null;
    }

    const auth = authState.toAuth();
    if (!auth.userId) {
      return null;
    }

    const user = await clerk.users.getUser(auth.userId);
    const email =
      (user as any).primaryEmailAddress?.emailAddress ??
      (user as any).emailAddresses?.[0]?.emailAddress;

    if (!email) {
      return null;
    }

    const firstName = (user as any).firstName ?? "";
    const lastName = (user as any).lastName ?? "";
    const fullName =
      (user as any).fullName || [firstName, lastName].filter(Boolean).join(" ").trim() || email;

    return {
      userId: auth.userId,
      email,
      fullName
    };
  } catch {
    return null;
  }
}

export async function isUserAuthenticated(req: Request): Promise<boolean> {
  return (await getRequestRole(req)) !== "guest";
}

export async function hasAnyRole(req: Request, allowedRoles: AppRole[]): Promise<boolean> {
  const role = await getRequestRole(req);
  return allowedRoles.includes(role);
}
