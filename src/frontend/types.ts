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

export const emptyPlatForm: PlatInput = {
  name: "",
  available_until: "",
  price: "",
  stock: ""
};
