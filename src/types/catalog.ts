export type ProductVariant = {
  id: string;
  weight: string;
  price: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  image: string;
  variants: ProductVariant[];
};

export type Category = {
  id: string;
  label: string;
};

export type ProductListResponse = {
  total: number;
  items: Product[];
};
