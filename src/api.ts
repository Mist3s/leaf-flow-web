import { AuthResponse, AuthTokens, UserProfile } from './types/auth';
import { CartResponse } from './types/cart';
import { Category, Product, ProductListResponse } from './types/catalog';

const API_BASE = 'https://app-stage.zavarka39.ru/api';
const AUTH_KEY = 'zavarka-auth';

let authTokens: AuthTokens | null = null;

const readJSON = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
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

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authTokens?.accessToken ? { Authorization: `Bearer ${authTokens.accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
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
export const register = (payload: { email: string; password: string; firstName: string; lastName?: string | null }) =>
  request<AuthResponse>('/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) });
export const login = (payload: { email: string; password: string }) =>
  request<AuthResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const profile = () => request<UserProfile>('/v1/auth/profile');
