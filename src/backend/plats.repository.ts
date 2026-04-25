import { db } from "./db";

export type plat = {
  id: number;
  name: string;
  available_until: string;
  price: number;
  stock: number;
  description: string;
  allergenes: string[];
  created_at: string;
};

function parseAllergenes(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // fall back to comma-separated list
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapRowToPlat(row: any): plat {
  return {
    id: Number(row.id),
    name: String(row.name),
    available_until: String(row.available_until),
    price: Number(row.price),
    stock: Number(row.stock),
    description: String(row.description ?? ""),
    allergenes: parseAllergenes(row.allergenes),
    created_at: String(row.created_at)
  };
}

const insertplatStmt = db.prepare(
  "INSERT INTO plats (name, available_until, price, stock, description, allergenes) VALUES (?, ?, ?, ?, ?, ?)"
);

const getAllplatsStmt = db.prepare(
  "SELECT id, name, available_until, price, stock, description, allergenes, created_at FROM plats ORDER BY id DESC"
);

const getplatByIdStmt = db.prepare(
  "SELECT id, name, available_until, price, stock, description, allergenes, created_at FROM plats WHERE id = ?"
);

const updateplatStockStmt = db.prepare(
  "UPDATE plats SET stock = ? WHERE id = ?"
);

const updateplatStmt = db.prepare(
  "UPDATE plats SET name = ?, available_until = ?, price = ?, stock = ?, description = ?, allergenes = ? WHERE id = ?"
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
  description: string;
  allergenes: string[];
}): plat {
  const result = insertplatStmt.run(
    input.name,
    input.available_until,
    input.price,
    input.stock,
    input.description,
    JSON.stringify(input.allergenes)
  );

  const createdRow = getplatByIdStmt.get(Number(result.lastInsertRowid)) as any;
  const created = createdRow ? mapRowToPlat(createdRow) : undefined;

  if (!created) {
    throw new Error("Failed to create plat");
  }

  return created;
}

export function getAllplats(): plat[] {
  return (getAllplatsStmt.all() as any[]).map(mapRowToPlat);
}

export function updateplatStock(id: number, newStock: number): plat | null {
  updateplatStockStmt.run(newStock, id);
  const updatedRow = getplatByIdStmt.get(id) as any;
  return updatedRow ? mapRowToPlat(updatedRow) : null;
}

export function updateplat(
  id: number,
  input: {
    name: string;
    available_until: string;
    price: number;
    stock: number;
    description: string;
    allergenes: string[];
  }
): plat | null {
  updateplatStmt.run(
    input.name,
    input.available_until,
    input.price,
    input.stock,
    input.description,
    JSON.stringify(input.allergenes),
    id
  );

  const updatedRow = getplatByIdStmt.get(id) as any;
  return updatedRow ? mapRowToPlat(updatedRow) : null;
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
    {
      name: "Tomate Ancienne",
      available_until: "2026-04-10",
      price: 4.5,
      stock: 12,
      description: "Tomate ancienne pleine de saveur.",
      allergenes: ["aucun"]
    },
    {
      name: "Courge Butternut",
      available_until: "2026-04-10",
      price: 3.9,
      stock: 8,
      description: "Courge douce et onctueuse.",
      allergenes: ["aucun"]
    },
    {
      name: "Poireau Bleu",
      available_until: "2026-04-10",
      price: 2.7,
      stock: 15,
      description: "Poireau frais pour soupes et quiches.",
      allergenes: ["aucun"]
    }
  ];

  const tx = db.transaction((plats: typeof examples) => {
    for (const plat of plats) {
      insertplatStmt.run(
        plat.name,
        plat.available_until,
        plat.price,
        plat.stock,
        plat.description,
        JSON.stringify(plat.allergenes)
      );
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
