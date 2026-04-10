import type { PlatInput, PlatPayload } from "../types";

export function toPlatPayload(input: PlatInput): PlatPayload | null {
  const price = Number(input.price);
  const stock = Number(input.stock);

  if (!input.name.trim() || !input.available_until.trim()) {
    return null;
  }

  if (!Number.isFinite(price) || !Number.isFinite(stock)) {
    return null;
  }

  return {
    name: input.name.trim(),
    available_until: input.available_until.trim(),
    price,
    stock
  };
}
