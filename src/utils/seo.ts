import { SITE_URL } from '../config';

type SEOConfig = {
  title: string;
  description: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  image?: string;
  price?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  productName?: string;
  productId?: string;
  category?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
};

const BASE_URL = SITE_URL;

const defaultMeta = {
  title: 'Zavarka39 — Китайский чай в Калининграде | Купить чай с доставкой',
  description: 'Интернет-магазин премиального китайского чая в Калининграде. Пуэр, улун, зелёный, белый чай. Прямые поставки из Китая. Доставка по России.',
};

// Кэш для избежания лишних DOM операций
let lastSEOHash = '';

const computeHash = (config: SEOConfig): string => {
  return JSON.stringify(config);
};

export const updateSEO = (config: SEOConfig) => {
  const hash = computeHash(config);
  if (hash === lastSEOHash) return; // Пропускаем если ничего не изменилось
  lastSEOHash = hash;

  const { title, description, canonical, type = 'website', image } = config;
  
  // Title
  document.title = title;
  
  // Meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  }
  
  // Meta title
  const metaTitle = document.querySelector('meta[name="title"]');
  if (metaTitle) {
    metaTitle.setAttribute('content', title);
  }
  
  // Canonical
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink && canonical) {
    canonicalLink.setAttribute('href', `${BASE_URL}${canonical}`);
  }
  
  // Open Graph
  updateMetaProperty('og:title', title);
  updateMetaProperty('og:description', description);
  if (canonical) updateMetaProperty('og:url', `${BASE_URL}${canonical}`);
  updateMetaProperty('og:type', type);
  if (image) updateMetaProperty('og:image', image.startsWith('http') ? image : `${BASE_URL}${image}`);
  
  // Twitter
  updateMetaProperty('twitter:title', title);
  updateMetaProperty('twitter:description', description);
  if (canonical) updateMetaProperty('twitter:url', `${BASE_URL}${canonical}`);
  if (image) updateMetaProperty('twitter:image', image.startsWith('http') ? image : `${BASE_URL}${image}`);
};

const updateMetaProperty = (property: string, content: string) => {
  const meta = document.querySelector(`meta[property="${property}"]`);
  if (meta) {
    meta.setAttribute('content', content);
  }
};

export const resetSEO = () => {
  updateSEO({
    title: defaultMeta.title,
    description: defaultMeta.description,
    canonical: '/',
  });
};

// Обновление структурированных данных для продукта
export const updateProductSchema = (product: {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: string;
  category?: string;
  availability?: 'InStock' | 'OutOfStock';
}) => {
  // Удаляем существующую схему продукта
  const existingSchema = document.querySelector('script[data-schema="product"]');
  if (existingSchema) {
    existingSchema.remove();
  }

  // Создаём новую схему
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${BASE_URL}/product/${product.id}`,
    name: product.name,
    description: product.description || `${product.name} — купить китайский чай в Калининграде`,
    image: product.image?.startsWith('http') ? product.image : `${BASE_URL}${product.image || '/logo.png'}`,
    url: `${BASE_URL}/product/${product.id}`,
    brand: {
      '@type': 'Brand',
      name: 'Zavarka39',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'RUB',
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      seller: {
        '@type': 'Organization',
        name: 'Zavarka39',
        url: BASE_URL,
      },
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    category: product.category || 'Чай',
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-schema', 'product');
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};

// Обновление хлебных крошек
export const updateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  const existingSchema = document.querySelector('script[data-schema="breadcrumb"]');
  if (existingSchema) {
    existingSchema.remove();
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-schema', 'breadcrumb');
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};

// Очистка динамических схем при уходе со страницы
export const clearDynamicSchemas = () => {
  document.querySelectorAll('script[data-schema]').forEach((el) => el.remove());
};

// SEO конфигурации для страниц
export const SEO_PAGES = {
  home: {
    title: 'Zavarka39 — Китайский чай в Калининграде | Купить чай с доставкой',
    description: 'Интернет-магазин премиального китайского чая в Калининграде. Пуэр, улун, зелёный, белый чай. Прямые поставки из Китая. Доставка по России. ☎ +7 (995) 325-71-19',
    canonical: '/',
  },
  cart: {
    title: 'Корзина — Zavarka39',
    description: 'Ваша корзина покупок в интернет-магазине китайского чая Zavarka39. Оформите заказ с доставкой по Калининграду.',
    canonical: '/cart',
  },
  checkout: {
    title: 'Оформление заказа — Zavarka39',
    description: 'Оформление заказа китайского чая с доставкой по Калининграду и области. Быстрая доставка, удобная оплата.',
    canonical: '/checkout',
  },
  profile: {
    title: 'Мой профиль — Zavarka39',
    description: 'Личный кабинет в интернет-магазине китайского чая Zavarka39. История заказов и настройки профиля.',
    canonical: '/profile',
  },
  delivery: {
    title: 'Доставка и оплата — Zavarka39 | Калининград',
    description: 'Способы доставки и оплаты в интернет-магазине Zavarka39. Самовывоз бесплатно, курьерская доставка по Калининграду. Оплата наличными или переводом.',
    canonical: '/delivery',
  },
  privacy: {
    title: 'Политика конфиденциальности — Zavarka39',
    description: 'Политика конфиденциальности интернет-магазина Zavarka39. Защита персональных данных покупателей, порядок обработки и хранения информации.',
    canonical: '/privacy',
  },
  offer: {
    title: 'Публичная оферта — Zavarka39',
    description: 'Публичная оферта интернет-магазина Zavarka39. Условия продажи товаров, доставки, оплаты и возврата. Договор купли-продажи.',
    canonical: '/offer',
  },
  about: {
    title: 'О компании Zavarka39 — Китайский чай с 2022 года',
    description: 'Zavarka39 — продолжение дела, начатого более 20 лет назад. Настоящий китайский чай с понятным происхождением, выбранный за качество сырья и традиционную технологию производства.',
    canonical: '/about',
  },
} as const;
