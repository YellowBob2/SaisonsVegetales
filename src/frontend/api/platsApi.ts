import type { DemoRole } from "../auth/roles";
import type { Plat, PlatPayload } from "../types";

export function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as T;
}

export async function fetchPlatsApi(token: string): Promise<Plat[]> {
  const response = await fetch("/api/plats", {
    headers: authHeaders(token)
  });

  const data = await parseOrThrow<{ plats: Plat[] }>(response, "Impossible de charger les plats.");
  return data.plats ?? [];
}

export async function createPlatApi(token: string, payload: PlatPayload): Promise<void> {
  const response = await fetch("/api/plats", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });

  await parseOrThrow(response, "Ajout impossible.");
}

export async function updatePlatApi(token: string, id: number, payload: PlatPayload): Promise<void> {
  const response = await fetch(`/api/plats?id=${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });

  await parseOrThrow(response, "Modification impossible.");
}

export async function deletePlatApi(token: string, id: number): Promise<void> {
  const response = await fetch(`/api/plats?id=${id}`, {
    method: "DELETE",
    headers: authHeaders(token)
  });

  await parseOrThrow(response, "Suppression impossible.");
}

export type OrderPlatsApiResult = {
  orderedItems: Array<{
    platId: number;
    name: string;
    orderedQuantity: number;
    remainingStock: number;
  }>;
  unavailableIds: number[];
  notFoundIds: number[];
  message: string;
};

export type OrderPlatsApiItem = {
  platId: number;
  quantity: number;
};

export async function fetchSessionApi(token: string): Promise<{ role: DemoRole; authenticated: boolean }> {
  const response = await fetch("/api/auth/session", {
    headers: authHeaders(token)
  });

  return await parseOrThrow<{ role: DemoRole; authenticated: boolean }>(
    response,
    "Impossible de recuperer la session."
  );
}

export async function orderPlatsApi(token: string, items: OrderPlatsApiItem[]): Promise<OrderPlatsApiResult> {
  const response = await fetch("/api/plats/order", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ items })
  });

  return await parseOrThrow<OrderPlatsApiResult>(response, "Commande impossible.");
}
