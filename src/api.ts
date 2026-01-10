import { AuthResponse, AuthTokens, UserProfile, TelegramLoginWidgetPayload } from './types/auth';
import { CartResponse } from './types/cart';
import { Category, Product, ProductListResponse } from './types/catalog';
import { ReviewsData } from './types/reviews';
import { API_BASE_URL, STORAGE_KEYS } from './config';

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

const request = async <T>(path: string, options: RequestInit = {}, retry = true): Promise<T> => {
  const tokens = getActiveTokens();
  const res = await fetch(`${API_BASE}${path}`, {
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
        return request<T>(path, options, false);
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

export const getProduct = (id: string) => request<Product>(`/v1/catalog/products/${id}`);
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

// Мок-данные для отзывов (будет заменено на API-эндпоинт)
const mockReviewsData: ReviewsData = {
  averageRating: 5.0,
  totalReviews: 22,
  platforms: [
    { platform: 'yandex', rating: 5.0, reviewCount: 1, iconUrl: '/icon/yandex_icon.svg', reviewsUrl: 'https://yandex.ru/maps/org/zavarka39_kitayskiy_chay/136643377826?si=f6gx50r3r16h0uuh3qv5prfrk4' },
    { platform: 'google', rating: 0.0, reviewCount: 0, iconUrl: '/icon/google_icon.svg', reviewsUrl: '#' },
    { platform: 'telegram', rating: 5.0, reviewCount: 3, iconUrl: '/icon/tg_icon.svg', reviewsUrl: 'https://t.me/zavarka39_ru' },
    { platform: 'avito', rating: 5.0, reviewCount: 18, iconUrl: '/icon/avito_icon.svg', reviewsUrl: 'https://www.avito.ru/brands/496c10b485c0cc17027cc587d150d0d1' },
  ],
  reviews: [
    {
      id: '22',
      platform: 'yandex',
      author: 'kir-dacha2014',
      rating: 5,
      text: 'Отличный сайт и очень вкусный чай🔥',
      date: '2026-01-09',
    },
    {
      id: '1',
      platform: 'avito',
      author: 'Елена',
      rating: 5,
      text: 'Советую продавца, все чётко, чай хороший 👍',
      date: '2026-01-03',
    },
    {
      id: '2',
      platform: 'avito',
      author: 'Анастасия',
      rating: 5,
      text: 'Все отлично, спасибо',
      date: '2025-12-27',
    },
    {
      id: '3',
      platform: 'avito',
      author: 'Ирина Р.',
      rating: 5,
      text: 'Спасибо огромное\nСупер чай. Но брала в подарок, поэтому вкус оценить не могу. По запаху, понятно, что супер.\nСупер продавец. Отправил быстро, был всегда на связи. На сообщения отвечал быстро\nБлагодарю 🙏',
      date: '2025-12-21',
    },
    {
      id: '4',
      platform: 'avito',
      author: 'Сергей',
      rating: 5,
      text: 'Советую !',
      date: '2025-12-08',
    },
    {
      id: '5',
      platform: 'avito',
      author: 'Лаванда',
      rating: 5,
      text: 'Супер бодряк!!♥️♥️♥️',
      date: '2025-10-22',
    },
    {
      id: '6',
      platform: 'avito',
      author: 'Айрат',
      rating: 5,
      text: 'Всё отлично!',
      date: '2025-09-13',
    },
    {
      id: '7',
      platform: 'avito',
      author: 'Максим С.',
      rating: 5,
      text: 'Все хорошо,товар в порядке,ещё и на пробу несколько других сортов чая прислали.',
      date: '2025-05-31',
    },
    {
      id: '8',
      platform: 'avito',
      author: 'Carattere',
      rating: 5,
      text: 'Спасибо😊Всё прошло хорошо\nИ подарочки положили😘',
      date: '2025-05-08',
    },
    {
      id: '9',
      platform: 'avito',
      author: 'Вячеслав В.',
      rating: 5,
      text: 'Прекрасный продавец, прекрасный товар, рекомендую!',
      date: '2025-03-28',
    },
    {
      id: '10',
      platform: 'avito',
      author: 'Александр К.',
      rating: 5,
      text: 'Хороший продавец',
      date: '2025-02-10',
    },
    {
      id: '11',
      platform: 'avito',
      author: 'Владимир',
      rating: 5,
      text: 'Рекомендую продавца 👍\nПродукт соответствует действительности\nПродавец доброжелателен',
      date: '2025-01-27',
    },
    {
      id: '12',
      platform: 'avito',
      author: 'Сергей',
      rating: 5,
      text: 'Чай просто великолепный, энергия ЦИ ощущается очень мягко, приятно и полезно!) Продавец описал, как правильно пить и заваривать чай, чтоб получить максимум пользы. Очень душевный продавец, понравилось общение, подход к покупателю и сам продукт!)',
      date: '2025-01-18',
    },
    {
      id: '13',
      platform: 'avito',
      author: 'Наталья',
      rating: 5,
      text: 'Шикарный, насыщенный и ароматный чай! Очень компетентный продавец, все подсказал и рассказал, приятно иметь дело! Однозначно рекомендую!',
      date: '2024-10-26',
    },
    {
      id: '14',
      platform: 'avito',
      author: 'Павел',
      rating: 5,
      text: 'Всё отлично.Чай хороший👍',
      date: '2024-10-16',
    },
    {
      id: '15',
      platform: 'avito',
      author: 'Руслан',
      rating: 5,
      text: 'Товар соответствует. Плюс подарок на пробу. Обязательно обращусь ещё 👍',
      date: '2024-08-19',
    },
    {
      id: '16',
      platform: 'avito',
      author: 'Покупатель',
      rating: 5,
      text: 'Хороший вежливый продавец. \nХороший чай.\nСписались, договорились. В назначенное время подъехала и встретились. \nВсе понравилось. Буду брать еще.',
      date: '2024-08-10',
    },
    {
      id: '17',
      platform: 'avito',
      author: 'Ангелина',
      rating: 5,
      text: 'Спасибо большое, габа обалденная, обязательно буду покупать ещё ♥️\nОчень приятно было общаться, продавец общительный и внимательный 😊',
      date: '2024-07-02',
    },
    {
      id: '18',
      platform: 'avito',
      author: 'JuD',
      rating: 5,
      text: 'Благодарю, чай зашёл ❤️ обязательно будем обращаться 🌞🙏👍',
      date: '2024-05-07',
    },
    {
      id: '19',
      platform: 'telegram',
      author: 'Леночка',
      rating: 5,
      text: 'Чай великолепного качества, продавцы очень грамотные, знающие свое дело.',
      date: '2025-03-26',
    },
    {
      id: '20',
      platform: 'telegram',
      author: 'Сергей Д.',
      rating: 5,
      text: '🔥',
      date: '2025-05-03',
    },
    {
      id: '21',
      platform: 'telegram',
      author: 'Татьяна И.',
      rating: 5,
      text: 'Чай просто бомбический👍👏🙏',
      date: '2025-10-11',
    },
  ],
};

export const getReviews = (): Promise<ReviewsData> => {
  // TODO: Заменить на реальный API-эндпоинт
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockReviewsData), 300);
  });
};
