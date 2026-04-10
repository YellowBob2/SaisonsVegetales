import { hasAnyRole } from "../authentification";
import { forbiddenResponse, jsonResponse } from "../http";
import {
  createplat,
  deleteplat,
  getAllplats,
  orderplats,
  seedExampleplats,
  updateplat,
  updateplatStock
} from "../plats.repository";
import { simulateOrderEmailSend } from "../services/orderMailer";

function requireAnyRole(req: Request, roles: Array<"guest" | "user" | "admin">): Response | null {
  if (hasAnyRole(req, roles)) {
    return null;
  }

  return forbiddenResponse("Access denied for current role");
}

export async function handlePlatsRoutes(req: Request, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/plats" && req.method === "GET") {
    const denied = requireAnyRole(req, ["user", "admin"]);
    if (denied) {
      return denied;
    }

    return jsonResponse({ plats: getAllplats() });
  }

  if (url.pathname === "/api/plats" && req.method === "POST") {
    const denied = requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

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
    const denied = requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

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
    const denied = requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

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
    const denied = requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

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
    const denied = requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

    return jsonResponse(seedExampleplats());
  }

  if (url.pathname === "/api/plats/order" && req.method === "POST") {
    const denied = requireAnyRole(req, ["user", "admin"]);
    if (denied) {
      return denied;
    }

    const body = await req.json().catch(() => null);
    const inputItems = body?.items;
    const platIds = body?.platIds;

    const items = Array.isArray(inputItems)
      ? inputItems
          .map((item: unknown) => {
            const platId = Number((item as { platId?: unknown })?.platId);
            const quantity = Number((item as { quantity?: unknown })?.quantity);
            return { platId, quantity };
          })
          .filter((item: { platId: number; quantity: number }) =>
            Number.isInteger(item.platId) && Number.isInteger(item.quantity) && item.quantity > 0
          )
      : [];

    const fallbackItems = Array.isArray(platIds)
      ? platIds
          .map((value: unknown) => Number(value))
          .filter((id: number) => Number.isInteger(id))
          .map((platId: number) => ({ platId, quantity: 1 }))
      : [];

    const effectiveItems = items.length > 0 ? items : fallbackItems;

    if (effectiveItems.length === 0) {
      return jsonResponse({ error: "items array with { platId, quantity } is required" }, 400);
    }

    const result = orderplats(effectiveItems);
    simulateOrderEmailSend(result.orderedItems);

    return jsonResponse({
      ...result,
      message: "Simulation d'envoi de mail !"
    });
  }

  return null;
}
