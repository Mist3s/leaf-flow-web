export type CartItem = {
  productId: string;
  variantId: string;
  quantity: number;
  price: string;
  total: string;
  productName: string;
  variantWeight: string;
  image?: string;
};

export type CartResponse = {
  items: CartItem[];
  totalCount: number;
  totalPrice: string;
};
