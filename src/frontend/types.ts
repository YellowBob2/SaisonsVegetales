export type Plat = {
  id: number;
  name: string;
  available_until: string;
  price: number;
  stock: number;
  created_at: string;
};

export type PlatInput = {
  name: string;
  available_until: string;
  price: string;
  stock: string;
};

export type PlatPayload = {
  name: string;
  available_until: string;
  price: number;
  stock: number;
};

export type OrderStatus = "pending" | "processing" | "confirmed" | "canceled";

export type OrderItem = {
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

export const emptyPlatForm: PlatInput = {
  name: "",
  available_until: "",
  price: "",
  stock: ""
};
