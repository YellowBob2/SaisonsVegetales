import type { DemoRole } from "../auth/roles";
import type { Plat, PlatPayload } from "../types";

function roleHeaders(role: DemoRole): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-demo-role": role
  };
}

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as T;
}

export async function fetchPlatsApi(role: DemoRole): Promise<Plat[]> {
  const response = await fetch("/api/plats", {
    headers: { "x-demo-role": role }
  });
  const data = await parseOrThrow<{ plats: Plat[] }>(response, "Impossible de charger les plats.");
  return data.plats ?? [];
}

export async function createPlatApi(role: DemoRole, payload: PlatPayload): Promise<void> {
  const response = await fetch("/api/plats", {
    method: "POST",
    headers: roleHeaders(role),
    body: JSON.stringify(payload)
  });

  await parseOrThrow(response, "Ajout impossible.");
}

export async function updatePlatApi(role: DemoRole, id: number, payload: PlatPayload): Promise<void> {
  const response = await fetch(`/api/plats?id=${id}`, {
    method: "PUT",
    headers: roleHeaders(role),
    body: JSON.stringify(payload)
  });

  await parseOrThrow(response, "Modification impossible.");
}

export async function deletePlatApi(role: DemoRole, id: number): Promise<void> {
  const response = await fetch(`/api/plats?id=${id}`, {
    method: "DELETE",
    headers: { "x-demo-role": role }
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

export async function fetchSessionApi(role: DemoRole): Promise<{ role: DemoRole; authenticated: boolean }> {
  const response = await fetch("/api/auth/session", {
    headers: { "x-demo-role": role }
  });

  return await parseOrThrow<{ role: DemoRole; authenticated: boolean }>(
    response,
    "Impossible de recuperer la session."
  );
}

export async function orderPlatsApi(role: DemoRole, items: OrderPlatsApiItem[]): Promise<OrderPlatsApiResult> {
  const response = await fetch("/api/plats/order", {
    method: "POST",
    headers: roleHeaders(role),
    body: JSON.stringify({ items })
  });

  return await parseOrThrow<OrderPlatsApiResult>(response, "Commande impossible.");
}
