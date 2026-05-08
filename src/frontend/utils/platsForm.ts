import type { PlatInput, PlatPayload } from "../types";

function normalizeAllergenes(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isValidDate(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function toPlatPayload(input: PlatInput): PlatPayload | null {
  const price = Number(input.price);
  const stock = Number(input.stock);

  if (!input.name.trim() || !input.available_until.trim() || !isValidDate(input.available_until)) {
    return null;
  }

  if (!Number.isFinite(price) || !Number.isFinite(stock)) {
    return null;
  }

  return {
    name: input.name.trim(),
    available_until: input.available_until.trim(),
    price,
    stock,
    description: input.description.trim(),
    allergenes: normalizeAllergenes(input.allergenes)
  };
}
