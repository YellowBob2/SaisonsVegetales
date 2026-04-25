import { getAuthenticatedUser, hasAnyRole } from "../authentification";
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
import { createOrder, getOrders, updateOrderStatus } from "../orders.repository";
import { sendOrderConfirmationEmail } from "../services/orderMailer";

const VALID_ORDER_STATUSES = ["pending", "processing", "confirmed", "canceled"] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function normalizeAllergenes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

async function requireAnyRole(req: Request, roles: Array<"guest" | "user" | "admin">): Promise<Response | null> {
  if (await hasAnyRole(req, roles)) {
    return null;
  }

  return forbiddenResponse("Access denied for current role");
}

export async function handlePlatsRoutes(req: Request, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/plats" && req.method === "GET") {
    const denied = await requireAnyRole(req, ["user", "admin"]);
    if (denied) {
      return denied;
    }

    return jsonResponse({ plats: getAllplats() });
  }

  if (url.pathname === "/api/plats" && req.method === "POST") {
    const denied = await requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonResponse({ error: "JSON body is required" }, 400);
    }

    const { name, available_until, price, stock, description, allergenes } = body as {
      name?: string;
      available_until?: unknown;
      price?: number;
      stock?: number;
      description?: string;
      allergenes?: unknown;
    };

    if (
      !name ||
      !isValidDate(available_until) ||
      typeof price !== "number" ||
      typeof stock !== "number" ||
      typeof description !== "string"
    ) {
      return jsonResponse(
        { error: "name, available_until (valid date), price (number), stock (number), description are required" },
        400
      );
    }

    const created = createplat({
      name,
      available_until: new Date(available_until).toISOString().slice(0, 10),
      price,
      stock,
      description: description.trim(),
      allergenes: normalizeAllergenes(allergenes)
    });
    return jsonResponse({ plat: created }, 201);
  }

  if (url.pathname === "/api/plats" && req.method === "PATCH") {
    const denied = await requireAnyRole(req, ["admin"]);
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
    const denied = await requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

    const id = Number(url.searchParams.get("id"));
    const body = await req.json().catch(() => null);

    if (!Number.isInteger(id) || !body) {
      return jsonResponse({ error: "id query param and JSON body are required" }, 400);
    }

    const { name, available_until, price, stock, description, allergenes } = body as {
      name?: string;
      available_until?: unknown;
      price?: number;
      stock?: number;
      description?: string;
      allergenes?: unknown;
    };

    if (
      !name ||
      !isValidDate(available_until) ||
      typeof price !== "number" ||
      typeof stock !== "number" ||
      typeof description !== "string"
    ) {
      return jsonResponse(
        { error: "name, available_until (valid date), price (number), stock (number), description are required" },
        400
      );
    }

    const updated = updateplat(id, {
      name,
      available_until: new Date(available_until).toISOString().slice(0, 10),
      price,
      stock,
      description: description.trim(),
      allergenes: normalizeAllergenes(allergenes)
    });

    if (!updated) {
      return jsonResponse({ error: "plat not found" }, 404);
    }

    return jsonResponse({ plat: updated });
  }

  if (url.pathname === "/api/plats" && req.method === "DELETE") {
    const denied = await requireAnyRole(req, ["admin"]);
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
    const denied = await requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

    return jsonResponse(seedExampleplats());
  }

  if (url.pathname === "/api/orders" && req.method === "GET") {
    const denied = await requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

    return jsonResponse({ orders: getOrders() });
  }

  if (url.pathname === "/api/orders" && req.method === "PATCH") {
    const denied = await requireAnyRole(req, ["admin"]);
    if (denied) {
      return denied;
    }

    const id = Number(url.searchParams.get("id"));
    const body = await req.json().catch(() => null);
    const status = body?.status;

    if (!Number.isInteger(id) || typeof status !== "string" || !VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
      return jsonResponse({ error: "id query param and valid status are required" }, 400);
    }

    const updated = updateOrderStatus(id, status as OrderStatus);
    if (!updated) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    return jsonResponse({ success: true });
  }

  if (url.pathname === "/api/plats/order" && req.method === "POST") {
    const denied = await requireAnyRole(req, ["user", "admin"]);
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

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ error: "Impossible de récupérer l'utilisateur authentifié." }, 401);
    }

    const result = orderplats(effectiveItems);
    const createdOrder = createOrder({
      userId: user.userId,
      userEmail: user.email,
      userName: user.fullName,
      status: "pending",
      items: result.orderedItems.map((item) => ({
        platId: item.platId,
        name: item.name,
        quantity: item.orderedQuantity,
        price: item.price
      }))
    });

    try {
      await sendOrderConfirmationEmail({
        userEmail: user.email,
        userName: user.fullName,
        orderedItems: result.orderedItems,
        unavailableIds: result.unavailableIds,
        notFoundIds: result.notFoundIds
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de confirmation :", error);
      return jsonResponse({ error: "Impossible d'envoyer l'email de confirmation." }, 500);
    }

    return jsonResponse({
      orderId: createdOrder.id,
      ...result,
      message: "Email de confirmation envoyé."
    });
  }

  return null;
}
