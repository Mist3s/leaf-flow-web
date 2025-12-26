export type CartItem = {
  productId: string;
  variantId: string;
  quantity: number;
  price: string;
  productName: string;
  variantLabel: string;
  image?: string;
};

export type CartResponse = {
  items: CartItem[];
  totalCount: number;
  totalPrice: string;
};
