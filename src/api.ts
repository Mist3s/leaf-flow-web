import { AuthResponse, AuthTokens, UserProfile, TelegramLoginWidgetPayload } from './types/auth';
import { CartResponse } from './types/cart';
import { Category, Product, ProductDetail, ProductListResponse } from './types/catalog';
import { ReviewsData } from './types/reviews';
import { API_BASE_URL, STORAGE_KEYS, CHAT_API_URL } from './config';

const API_BASE = API_BASE_URL;
const AUTH_KEY = STORAGE_KEYS.AUTH;

let authTokens: AuthTokens | null = null;
let isRefreshing = false;
let refreshPromise: Promise<AuthTokens | null> | null = null;

const readJSON = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText;
    try {
      const json = JSON.parse(text);
      message = json.detail || json.message || json.error || text;
    } catch {
      message = text || res.statusText;
    }
    throw new Error(message);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
};

export const setAuthTokens = (next: AuthTokens | null) => {
  authTokens = next;
  if (next) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
};

export const getStoredTokens = (): AuthTokens | null => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch (error) {
    console.warn('Не удалось прочитать токены', error);
    return null;
  }
};

// Получаем актуальный токен: из памяти или из localStorage
const getActiveTokens = (): AuthTokens | null => {
  if (authTokens) {
    return authTokens;
  }
  // Fallback: читаем из localStorage если переменная не инициализирована
  const stored = getStoredTokens();
  if (stored) {
    authTokens = stored; // Синхронизируем переменную
    return stored;
  }
  return null;
};

// Обновление токена
const refreshTokens = async (): Promise<AuthTokens | null> => {
  const tokens = getActiveTokens();
  if (!tokens?.refreshToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!res.ok) {
      // Refresh token invalid or expired
      setAuthTokens(null);
      return null;
    }

    const newTokens = (await res.json()) as AuthTokens;
    setAuthTokens(newTokens);
    return newTokens;
  } catch (error) {
    console.error('Token refresh failed:', error);
    setAuthTokens(null);
    return null;
  }
};

// Обёртка для предотвращения параллельных запросов на обновление
const ensureRefreshTokens = async (): Promise<AuthTokens | null> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = refreshTokens().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
};

const request = async <T>(path: string, options: RequestInit = {}, retry = true, customBaseUrl?: string): Promise<T> => {
  const tokens = getActiveTokens();
  const baseUrl = customBaseUrl || API_BASE;
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Если 401 и есть refresh token, пробуем обновить токен
  if (res.status === 401 && retry) {
    const currentTokens = getActiveTokens();
    if (currentTokens?.refreshToken) {
      const newTokens = await ensureRefreshTokens();
      if (newTokens) {
        // Повторяем запрос с новым токеном
        return request<T>(path, options, false, customBaseUrl);
      }
    }
    // Если не удалось обновить токен, выбрасываем ошибку
    throw new Error('Unauthorized');
  }

  return readJSON<T>(res);
};

export const listCategories = () => request<{ items: Category[] }>('/v1/catalog/categories');

export const listProducts = (params: { category?: string; search?: string; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.search) qs.set('search', params.search);
  qs.set('limit', String(params.limit ?? 60));
  qs.set('offset', String(params.offset ?? 0));
  return request<ProductListResponse>(`/v1/catalog/products?${qs.toString()}`);
};

export const getProduct = (id: string) => request<ProductDetail>(`/v1/catalog/products/${id}`);
export const getCart = () => request<CartResponse>('/v1/cart');
export const replaceCartItems = (items: { productId: string; variantId: string; quantity: number }[]) =>
  request<CartResponse>('/v1/cart/items', { method: 'PUT', body: JSON.stringify({ items }) });
export const clearCart = () => request<null>('/v1/cart', { method: 'DELETE' });
export const createOrder = (payload: Record<string, unknown>) =>
  request<{ orderId: string; customerName: string; deliveryMethod: string; total: string }>('/v1/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Типы для заказов
export interface OrderListItem {
  orderId: string;
  customerName: string;
  deliveryMethod: 'pickup' | 'courier' | 'cdek';
  total: string;
  status: 'created' | 'processing' | 'paid' | 'fulfilled' | 'cancelled';
  createdAt: string;
}

export interface OrderDetails extends OrderListItem {
  items: {
    productId: string;
    variantId: string;
    quantity: number;
    price: string;
    total: string;
    productName: string;
    variantWeight: string;
  }[];
  address: string | null;
  comment: string | null;
}

export const listOrders = (params: { limit?: number; offset?: number } = {}) => {
  const qs = new URLSearchParams();
  qs.set('limit', String(params.limit ?? 10));
  qs.set('offset', String(params.offset ?? 0));
  return request<OrderListItem[]>(`/v1/orders?${qs.toString()}`);
};

export const getOrder = (orderId: string) => request<OrderDetails>(`/v1/orders/${orderId}`);
export const register = (payload: { email: string; password: string; firstName: string; lastName?: string | null }) =>
  request<AuthResponse>('/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) });
export const login = (payload: { email: string; password: string }) =>
  request<AuthResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const telegramLogin = (payload: TelegramLoginWidgetPayload) =>
  request<AuthResponse>('/v1/auth/telegram/login-widget', { method: 'POST', body: JSON.stringify(payload) });

// Telegram Link/Unlink/Merge
export const telegramLink = async (payload: TelegramLoginWidgetPayload): Promise<{ user?: UserProfile; conflict?: boolean; error?: string }> => {
  const tokens = getActiveTokens();
  const res = await fetch(`${API_BASE}/v1/auth/telegram/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    // Conflict — telegram уже привязан к другому аккаунту
    return { conflict: true };
  }

  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText;
    try {
      const json = JSON.parse(text);
      message = json.detail || json.message || json.error || text;
    } catch {
      message = text || res.statusText;
    }
    return { error: message };
  }

  return { user: await res.json() };
};

export const telegramUnlink = () =>
  request<UserProfile>('/v1/auth/telegram/link', { method: 'DELETE' });

export const telegramMerge = (payload: TelegramLoginWidgetPayload) =>
  request<UserProfile>('/v1/auth/telegram/merge', { method: 'POST', body: JSON.stringify(payload) });

export const profile = () => request<UserProfile>('/v1/auth/profile');

// Обновление профиля (имя, фамилия, email)
export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string | null;
  email?: string;
};

export const updateProfile = (payload: UpdateProfilePayload) =>
  request<UserProfile>('/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) });

// Изменение или создание пароля
export type ChangePasswordPayload = {
  currentPassword?: string | null;  // Обязателен, если пароль уже есть
  newPassword: string;              // Минимум 8 символов
};

export const changePassword = (payload: ChangePasswordPayload) =>
  request<UserProfile>('/v1/auth/password', { method: 'POST', body: JSON.stringify(payload) });

// Установка email для Telegram-пользователей
export type SetEmailPayload = {
  email: string;
  password: string;  // Минимум 8 символов
};

export const setEmail = (payload: SetEmailPayload) =>
  request<UserProfile>('/v1/auth/email', { method: 'POST', body: JSON.stringify(payload) });

// Типы ответа API для отзывов
interface ApiExternalReviewsStats {
  platform: 'yandex' | 'google' | 'telegram' | 'avito';
  avg_rating: number;
  reviews_count: number;
}

interface ApiExternalReview {
  id: number;
  platform: 'yandex' | 'google' | 'telegram' | 'avito';
  author: string;
  rating: number;
  text: string;
  date: string;
}

interface ApiReviewsStatsResponse {
  platforms: ApiExternalReviewsStats[];
  total_count: number;
  overall_avg: number;
}

interface ApiReviewsFullResponse extends ApiReviewsStatsResponse {
  reviews: ApiExternalReview[];
}

// Статичные данные платформ (иконки и ссылки)
const PLATFORM_CONFIG: Record<'yandex' | 'google' | 'telegram' | 'avito', { iconUrl: string; reviewsUrl: string }> = {
  yandex: {
    iconUrl: '/icon/yandex_icon.svg',
    reviewsUrl: 'https://yandex.ru/maps/org/zavarka39_kitayskiy_chay/136643377826?si=f6gx50r3r16h0uuh3qv5prfrk4',
  },
  google: {
    iconUrl: '/icon/google_icon.svg',
    reviewsUrl: 'https://g.page/r/CbZTi645XHMyEBM/review',
  },
  telegram: {
    iconUrl: '/icon/tg_icon.svg',
    reviewsUrl: 'https://t.me/zavarka39_ru',
  },
  avito: {
    iconUrl: '/icon/avito_icon.svg',
    reviewsUrl: 'https://www.avito.ru/brands/496c10b485c0cc17027cc587d150d0d1',
  },
};

const ALL_PLATFORMS: Array<'yandex' | 'google' | 'telegram' | 'avito'> = ['yandex', 'google', 'telegram', 'avito'];

// Преобразование ответа API к формату фронтенда
const mapApiPlatformsToFrontend = (apiPlatforms: ApiExternalReviewsStats[]) => {
  const platformMap = new Map(apiPlatforms.map((p) => [p.platform, p]));

  return ALL_PLATFORMS.map((platform) => {
    const apiData = platformMap.get(platform);
    const config = PLATFORM_CONFIG[platform];

    return {
      platform,
      rating: apiData?.avg_rating ?? 0.0,
      reviewCount: apiData?.reviews_count ?? 0,
      iconUrl: config.iconUrl,
      reviewsUrl: config.reviewsUrl,
    };
  });
};

const mapApiReviewToFrontend = (apiReview: ApiExternalReview) => ({
  id: String(apiReview.id),
  platform: apiReview.platform,
  author: apiReview.author,
  rating: apiReview.rating,
  text: apiReview.text,
  date: apiReview.date,
});

// Получение полных данных отзывов (статистика + список отзывов)
export const getReviews = async (): Promise<ReviewsData> => {
  const res = await fetch(`${API_BASE}/v1/reviews/external`);
  const data = await readJSON<ApiReviewsFullResponse>(res);

  return {
    averageRating: data.overall_avg,
    totalReviews: data.total_count,
    platforms: mapApiPlatformsToFrontend(data.platforms),
    reviews: data.reviews.map(mapApiReviewToFrontend),
  };
};

// Получение только статистики отзывов (для главной страницы, если нужна лёгкая загрузка)
export const getReviewsStats = async (): Promise<Omit<ReviewsData, 'reviews'>> => {
  const res = await fetch(`${API_BASE}/v1/reviews/external/stats`);
  const data = await readJSON<ApiReviewsStatsResponse>(res);

  return {
    averageRating: data.overall_avg,
    totalReviews: data.total_count,
    platforms: mapApiPlatformsToFrontend(data.platforms),
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// Чат
// ═══════════════════════════════════════════════════════════════════════════

import { Conversation, ChatMessage } from './types/chat';

export const fetchConversations = (params: { limit?: number } = {}) => {
  const qs = new URLSearchParams();
  qs.set('limit', String(params.limit ?? 20));
  return request<Conversation[]>(`/v1/chat/conversations?${qs.toString()}`, {}, true, CHAT_API_URL);
};

export const fetchMessages = (conversationId: string, params: { limit?: number; cursor?: string } = {}) => {
  const qs = new URLSearchParams();
  qs.set('limit', String(params.limit ?? 50));
  if (params.cursor) qs.set('cursor', params.cursor);
  return request<ChatMessage[]>(`/v1/chat/conversations/${conversationId}/messages?${qs.toString()}`, {}, true, CHAT_API_URL);
};

export const createSupportConversation = () =>
  request<Conversation>('/v1/chat/conversations/support', { method: 'POST' }, true, CHAT_API_URL);

export const sendMessageRest = (conversationId: string, clientMsgId: string, body: string) =>
  request<ChatMessage>(`/v1/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      client_msg_id: clientMsgId,
      type: 'text',
      body,
    }),
  }, true, CHAT_API_URL);
