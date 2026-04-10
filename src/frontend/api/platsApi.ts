import type { Plat, PlatPayload } from "../types";

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as T;
}

export async function fetchPlatsApi(): Promise<Plat[]> {
  const response = await fetch("/api/plats");
  const data = await parseOrThrow<{ plats: Plat[] }>(response, "Impossible de charger les plats.");
  return data.plats ?? [];
}

export async function createPlatApi(payload: PlatPayload): Promise<void> {
  const response = await fetch("/api/plats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  await parseOrThrow(response, "Ajout impossible.");
}

export async function updatePlatApi(id: number, payload: PlatPayload): Promise<void> {
  const response = await fetch(`/api/plats?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  await parseOrThrow(response, "Modification impossible.");
}

export async function deletePlatApi(id: number): Promise<void> {
  const response = await fetch(`/api/plats?id=${id}`, { method: "DELETE" });
  await parseOrThrow(response, "Suppression impossible.");
}
