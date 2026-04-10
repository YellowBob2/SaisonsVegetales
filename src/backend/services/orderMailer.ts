import type { OrderedPlatItem } from "../plats.repository";

export function simulateOrderEmailSend(orderedItems: OrderedPlatItem[]): void {
  if (orderedItems.length === 0) {
    return;
  }

  const summary = orderedItems
    .map((item) => `${item.name} x${item.orderedQuantity} (#${item.platId})`)
    .join(", ");
  console.log(`Simulation email commande: ${summary}`);
}
