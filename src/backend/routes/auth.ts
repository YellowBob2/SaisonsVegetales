import { getRequestRole, isUserAuthenticated } from "../authentification";
import { jsonResponse } from "../http";

export function handleAuthRoutes(req: Request, url: URL): Response | null {
  if (url.pathname === "/api/auth/session" && req.method === "GET") {
    const role = getRequestRole(req);
    return jsonResponse({
      role,
      authenticated: isUserAuthenticated(req)
    });
  }

  return null;
}
