import { AuthResponse, AuthTokens, UserProfile } from './types/auth';
import { CartResponse } from './types/cart';
import { Category, Product, ProductListResponse } from './types/catalog';

const API_BASE = 'https://app.zavarka39.ru/api';
const AUTH_KEY = 'zavarka-auth';

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
export const profile = () => request<UserProfile>('/v1/auth/profile');
