import {
  createplat,
  deleteplat,
  getAllplats,
  seedExampleplats,
  updateplat,
  updateplatStock
} from "../plats.repository";
import { jsonResponse } from "../http";

export async function handlePlatsRoutes(req: Request, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/plats" && req.method === "GET") {
    return jsonResponse({ plats: getAllplats() });
  }

  if (url.pathname === "/api/plats" && req.method === "POST") {
    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonResponse({ error: "JSON body is required" }, 400);
    }

    const { name, available_until, price, stock } = body as {
      name?: string;
      available_until?: string;
      price?: number;
      stock?: number;
    };

    if (!name || !available_until || typeof price !== "number" || typeof stock !== "number") {
      return jsonResponse(
        { error: "name, available_until, price (number), stock (number) are required" },
        400
      );
    }

    const created = createplat({ name, available_until, price, stock });
    return jsonResponse({ plat: created }, 201);
  }

  if (url.pathname === "/api/plats" && req.method === "PATCH") {
    const id = Number(url.searchParams.get("id"));
    const body = await req.json().catch(() => null);
    const newStock = body?.stock;

    if (!Number.isInteger(id) || typeof newStock !== "number") {
      return jsonResponse({ error: "id query param and stock number are required" }, 400);
    }

    const updated = updateplatStock(id, newStock);

    if (!updated) {
      return jsonResponse({ error: "plat not found" }, 404);
    }

    return jsonResponse({ plat: updated });
  }

  if (url.pathname === "/api/plats" && req.method === "PUT") {
    const id = Number(url.searchParams.get("id"));
    const body = await req.json().catch(() => null);

    if (!Number.isInteger(id) || !body) {
      return jsonResponse({ error: "id query param and JSON body are required" }, 400);
    }

    const { name, available_until, price, stock } = body as {
      name?: string;
      available_until?: string;
      price?: number;
      stock?: number;
    };

    if (!name || !available_until || typeof price !== "number" || typeof stock !== "number") {
      return jsonResponse(
        { error: "name, available_until, price (number), stock (number) are required" },
        400
      );
    }

    const updated = updateplat(id, { name, available_until, price, stock });

    if (!updated) {
      return jsonResponse({ error: "plat not found" }, 404);
    }

    return jsonResponse({ plat: updated });
  }

  if (url.pathname === "/api/plats" && req.method === "DELETE") {
    const id = Number(url.searchParams.get("id"));

    if (!Number.isInteger(id)) {
      return jsonResponse({ error: "id query param is required" }, 400);
    }

    const deleted = deleteplat(id);

    if (!deleted) {
      return jsonResponse({ error: "plat not found" }, 404);
    }

    return jsonResponse({ deleted: true });
  }

  if (url.pathname === "/api/plats/seed" && req.method === "POST") {
    return jsonResponse(seedExampleplats());
  }

  return null;
}
