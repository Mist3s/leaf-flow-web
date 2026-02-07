import { IMAGE_BASE_URL } from '../config';
import type { ProductImage } from '../types/catalog';

export const getImageUrl = (path: string | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${IMAGE_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

/**
 * Получить URL нужного варианта из одного ProductImage.
 * Возвращает storage_key варианта или null, если не найден.
 */
export const getImageVariantUrl = (
  image: ProductImage,
  variant: 'original' | 'thumb' | 'md' | 'lg',
): string | null => {
  const v = image.variants?.find(v => v.variant === variant);
  return v?.storage_key || null;
};

/**
 * Получить URL первого активного изображения продукта в нужном варианте.
 * Если изображений нет или вариант не найден — возвращает fallback (обычно product.image).
 */
export const getProductImageUrl = (
  images: ProductImage[] | undefined,
  variant: 'original' | 'thumb' | 'md' | 'lg',
  fallback?: string,
): string => {
  if (images && images.length > 0) {
    const activeImages = images
      .filter(img => img.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (activeImages.length > 0) {
      const url = getImageVariantUrl(activeImages[0], variant);
      if (url) return url;
    }
  }
  return fallback || '';
};

export const formatCurrency = (value: string | number | undefined) => {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(
    Number.isFinite(num) ? num : 0,
  );
};

export const priceRange = (variants: { price: string }[] = []) => {
  if (!variants.length) return '';
  const prices = variants.map((v) => parseFloat(v.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};
