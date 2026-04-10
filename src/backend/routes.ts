import { jsonResponse } from "./http";
import { handleAuthRoutes } from "./routes/auth";
import { handlePlatsRoutes } from "./routes/plats";

export async function handleApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);

  if (!url.pathname.startsWith("/api/")) {
    return null;
  }

  const authResponse = handleAuthRoutes(req, url);
  if (authResponse) {
    return authResponse;
  }

  const platsResponse = await handlePlatsRoutes(req, url);
  if (platsResponse) {
    return platsResponse;
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}
