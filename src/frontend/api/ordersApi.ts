import type { Order, OrderStatus } from "../types";
import { authHeaders, parseOrThrow } from "./platsApi";

export async function fetchOrdersApi(token: string): Promise<{ orders: Order[] }> {
  const response = await fetch("/api/orders", {
    headers: authHeaders(token)
  });

  return await parseOrThrow<{ orders: Order[] }>(response, "Impossible de charger les commandes.");
}

export async function updateOrderStatusApi(
  token: string,
  orderId: number,
  status: OrderStatus
): Promise<void> {
  const response = await fetch(`/api/orders?id=${orderId}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  await parseOrThrow(response, "Impossible de modifier le statut de la commande.");
}
