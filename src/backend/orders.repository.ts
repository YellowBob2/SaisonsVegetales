import { db } from "./db";

export type OrderStatus = "pending" | "processing" | "confirmed" | "canceled";

export type OrderItem = {
  id: number;
  orderId: number;
  platId: number;
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: number;
  userId: string;
  userEmail: string;
  userName: string;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
};

const insertOrderStmt = db.prepare(
  "INSERT INTO orders (user_id, user_email, user_name, status) VALUES (?, ?, ?, ?)"
);

const insertOrderItemStmt = db.prepare(
  "INSERT INTO order_items (order_id, plat_id, name, quantity, price) VALUES (?, ?, ?, ?, ?)"
);

const getOrdersStmt = db.prepare(
  `
    SELECT
      o.id AS order_id,
      o.user_id,
      o.user_email,
      o.user_name,
      o.status,
      o.created_at,
      oi.id AS item_id,
      oi.plat_id,
      oi.name AS item_name,
      oi.quantity,
      oi.price
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ORDER BY o.created_at DESC, oi.id ASC
  `
);

const getOrderByIdStmt = db.prepare(
  `
    SELECT
      o.id AS order_id,
      o.user_id,
      o.user_email,
      o.user_name,
      o.status,
      o.created_at,
      oi.id AS item_id,
      oi.plat_id,
      oi.name AS item_name,
      oi.quantity,
      oi.price
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ?
    ORDER BY oi.id ASC
  `
);

const updateOrderStatusStmt = db.prepare("UPDATE orders SET status = ? WHERE id = ?");
const deleteOldOrdersStmt = db.prepare(
  `
    DELETE FROM orders
    WHERE datetime(created_at) <= datetime('now', '-21 days')
  `
);

export function cleanupOldOrders(): void {
  deleteOldOrdersStmt.run();
}

function buildOrderFromRows(rows: Array<Record<string, unknown>>): Order | null {
  if (rows.length === 0) {
    return null;
  }

  const first = rows[0];
  if (!first) {
    return null;
  }

  const order: Order = {
    id: Number(first.order_id),
    userId: String(first.user_id),
    userEmail: String(first.user_email),
    userName: String(first.user_name),
    status: String(first.status) as OrderStatus,
    created_at: String(first.created_at),
    items: []
  };

  for (const row of rows) {
    if (row.item_id != null) {
      order.items.push({
        id: Number(row.item_id),
        orderId: order.id,
        platId: Number(row.plat_id),
        name: String(row.item_name),
        quantity: Number(row.quantity),
        price: Number(row.price)
      });
    }
  }

  return order;
}

export function createOrder(params: {
  userId: string;
  userEmail: string;
  userName: string;
  status: OrderStatus;
  items: Array<{
    platId: number;
    name: string;
    quantity: number;
    price: number;
  }>;
}): Order {
  const result = insertOrderStmt.run(
    params.userId,
    params.userEmail,
    params.userName,
    params.status
  );

  const orderId = Number(result.lastInsertRowid);

  const tx = db.transaction((items: Array<{ platId: number; name: string; quantity: number; price: number }>) => {
    for (const item of items) {
      insertOrderItemStmt.run(orderId, item.platId, item.name, item.quantity, item.price);
    }
  });

  tx(params.items);

  const order = getOrderById(orderId);
  if (!order) {
    throw new Error("Impossible de créer la commande.");
  }

  return order;
}

export function getOrders(): Order[] {
  cleanupOldOrders();

  const rows = getOrdersStmt.all() as Array<Record<string, unknown>>;
  const groupedOrders = new Map<number, Order>();

  for (const row of rows) {
    const orderId = Number(row.order_id);
    let order = groupedOrders.get(orderId);

    if (!order) {
      order = {
        id: orderId,
        userId: String(row.user_id),
        userEmail: String(row.user_email),
        userName: String(row.user_name),
        status: String(row.status) as OrderStatus,
        created_at: String(row.created_at),
        items: []
      };
      groupedOrders.set(orderId, order);
    }

    if (row.item_id != null) {
      order.items.push({
        id: Number(row.item_id),
        orderId,
        platId: Number(row.plat_id),
        name: String(row.item_name),
        quantity: Number(row.quantity),
        price: Number(row.price)
      });
    }
  }

  return Array.from(groupedOrders.values());
}

export function getOrderById(orderId: number): Order | null {
  const rows = getOrderByIdStmt.all(orderId) as Array<Record<string, unknown>>;
  return buildOrderFromRows(rows);
}

export function updateOrderStatus(orderId: number, status: OrderStatus): boolean {
  const result = updateOrderStatusStmt.run(status, orderId);
  return result.changes > 0;
}
