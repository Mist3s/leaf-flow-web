const IMAGE_BASE_URL = 'https://app.zavarka39.ru';

export const getImageUrl = (path: string | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${IMAGE_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
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
