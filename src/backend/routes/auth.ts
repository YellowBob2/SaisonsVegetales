import { getRequestRole, isUserAuthenticated } from "../authentification";
import { jsonResponse } from "../http";

export async function handleAuthRoutes(req: Request, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/auth/session" && req.method === "GET") {
    const role = await getRequestRole(req);
    const authenticated = await isUserAuthenticated(req);
    return jsonResponse({
      role,
      authenticated
    });
  }

  return null;
}
