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
  images?: ProductImage[];
};

// Расширенный вариант для детальной страницы
export type ProductVariantOut = ProductVariant & {
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sort_order: number;
};

// Профиль заваривания
export type BrewProfile = {
  id: number;
  method: string;
  teaware: string;
  temperature: string;
  brew_time: string;
  weight: string;
  note: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Значение атрибута
export type ProductAttributeValue = {
  id: number;
  attribute_id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

// Атрибут продукта
export type ProductAttribute = {
  id: number;
  code: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  kind: 'single' | 'multi' | 'bool' | 'range';
  ui_hint: 'chips' | 'radio' | 'toggle' | 'scale';
  values: ProductAttributeValue[];
};

// Вариант размера изображения (thumb, md, lg, original)
export type ImageVariant = {
  id: number;
  product_image_id: number;
  variant: 'original' | 'thumb' | 'md' | 'lg';
  format: string;
  storage_key: string;
  width: number;
  height: number;
  byte_size: number;
};

// Изображение продукта
export type ProductImage = {
  id: number;
  product_id: string;
  title: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  variants: ImageVariant[];
};

// Детальная информация о продукте
export type ProductDetail = Product & {
  variants: ProductVariantOut[];
  product_type_code: string;
  attributes: ProductAttribute[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sort_order: number;
  brewing_profiles: BrewProfile[];
  images: ProductImage[];
};

export type Category = {
  id: string;
  label: string;
};

export type ProductListResponse = {
  total: number;
  items: Product[];
};
