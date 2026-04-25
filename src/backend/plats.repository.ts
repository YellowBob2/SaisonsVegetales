import { db } from "./db";

export type plat = {
  id: number;
  name: string;
  available_until: string;
  price: number;
  stock: number;
  created_at: string;
};

const insertplatStmt = db.prepare(
  "INSERT INTO plats (name, available_until, price, stock) VALUES (?, ?, ?, ?)"
);

const getAllplatsStmt = db.prepare(
  "SELECT id, name, available_until, price, stock, created_at FROM plats ORDER BY id DESC"
);

const getplatByIdStmt = db.prepare(
  "SELECT id, name, available_until, price, stock, created_at FROM plats WHERE id = ?"
);

const updateplatStockStmt = db.prepare(
  "UPDATE plats SET stock = ? WHERE id = ?"
);

const updateplatStmt = db.prepare(
  "UPDATE plats SET name = ?, available_until = ?, price = ?, stock = ? WHERE id = ?"
);

const decrementplatStockByQtyStmt = db.prepare(
  "UPDATE plats SET stock = stock - ? WHERE id = ? AND stock >= ?"
);

const deleteplatStmt = db.prepare("DELETE FROM plats WHERE id = ?");

const countplatsStmt = db.prepare("SELECT COUNT(*) AS count FROM plats");

export function createplat(input: {
  name: string;
  available_until: string;
  price: number;
  stock: number;
}): plat {
  const result = insertplatStmt.run(
    input.name,
    input.available_until,
    input.price,
    input.stock
  );

  const created = getplatByIdStmt.get(Number(result.lastInsertRowid)) as
    | plat
    | undefined;

  if (!created) {
    throw new Error("Failed to create plat");
  }

  return created;
}

export function getAllplats(): plat[] {
  return getAllplatsStmt.all() as plat[];
}

export function updateplatStock(id: number, newStock: number): plat | null {
  updateplatStockStmt.run(newStock, id);
  const updated = getplatByIdStmt.get(id) as plat | undefined;
  return updated ?? null;
}

export function updateplat(
  id: number,
  input: { name: string; available_until: string; price: number; stock: number }
): plat | null {
  updateplatStmt.run(
    input.name,
    input.available_until,
    input.price,
    input.stock,
    id
  );

  const updated = getplatByIdStmt.get(id) as plat | undefined;
  return updated ?? null;
}

export function deleteplat(id: number): boolean {
  const result = deleteplatStmt.run(id);
  return result.changes > 0;
}

export function seedExampleplats(): { inserted: number; total: number } {
  const total = countplatsStmt.get() as { count: number };

  if (total.count > 0) {
    return { inserted: 0, total: total.count };
  }

  const examples = [
    { name: "Tomate Ancienne", available_until: "10/04/2026", price: 4.5, stock: 12 },
    { name: "Courge Butternut", available_until: "10/04/2026", price: 3.9, stock: 8 },
    { name: "Poireau Bleu", available_until: "10/04/2026", price: 2.7, stock: 15 }
  ];

  const tx = db.transaction((plats: typeof examples) => {
    for (const plat of plats) {
      insertplatStmt.run(plat.name, plat.available_until, plat.price, plat.stock);
    }
  });

  tx(examples);

  const newTotal = countplatsStmt.get() as { count: number };
  return { inserted: examples.length, total: newTotal.count };
}

export type PlatOrderRequestItem = {
  platId: number;
  quantity: number;
};

export type OrderedPlatItem = {
  platId: number;
  name: string;
  orderedQuantity: number;
  price: number;
  remainingStock: number;
};

export function orderplats(items: PlatOrderRequestItem[]): {
  orderedItems: OrderedPlatItem[];
  unavailableIds: number[];
  notFoundIds: number[];
} {
  const orderedItems: OrderedPlatItem[] = [];
  const unavailableIds: number[] = [];
  const notFoundIds: number[] = [];

  const quantities = new Map<number, number>();
  for (const item of items) {
    const current = quantities.get(item.platId) ?? 0;
    quantities.set(item.platId, current + item.quantity);
  }

  const tx = db.transaction((entries: Array<[number, number]>) => {
    for (const [id, requestedQuantity] of entries) {
      const existing = getplatByIdStmt.get(id) as plat | undefined;

      if (!existing) {
        notFoundIds.push(id);
        continue;
      }

      if (existing.stock <= 0) {
        unavailableIds.push(id);
        continue;
      }

      const orderQuantity = Math.min(requestedQuantity, existing.stock);

      if (orderQuantity <= 0) {
        unavailableIds.push(id);
        continue;
      }

      decrementplatStockByQtyStmt.run(orderQuantity, id, orderQuantity);
      const updated = getplatByIdStmt.get(id) as plat | undefined;

      if (updated) {
        orderedItems.push({
          platId: id,
          name: updated.name,
          orderedQuantity: orderQuantity,
          price: updated.price,
          remainingStock: updated.stock
        });
      }

      if (requestedQuantity > orderQuantity) {
        unavailableIds.push(id);
      }
    }
  });

  tx([...quantities.entries()]);

  return { orderedItems, unavailableIds, notFoundIds };
}
