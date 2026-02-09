import type { ProductImage } from './catalog';

export type CartItem = {
  productId: string;
  variantId: string;
  quantity: number;
  price: string;
  total: string;
  productName: string;
  variantWeight: string;
  image?: string;
  images?: ProductImage[];
};

export type CartResponse = {
  items: CartItem[];
  totalCount: number;
  totalPrice: string;
};
