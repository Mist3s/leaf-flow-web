const API_BASE = 'https://app-stage.zavarka39.ru/api';
const AUTH_KEY = 'zavarka-auth';

let authTokens = null;

export function setAuthTokens(next) {
  authTokens = next;
  if (next) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function getStoredTokens() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Не удалось прочитать токены', error);
    return null;
  }
}

async function request(path, options = {}, { skipAuthRetry = false } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authTokens?.accessToken ? { Authorization: `Bearer ${authTokens.accessToken}` } : {}),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  if (res.status === 401 && authTokens?.refreshToken && !skipAuthRetry) {
    try {
      const fresh = await refreshTokens(authTokens.refreshToken);
      if (fresh?.accessToken) {
        setAuthTokens(fresh);
        return request(path, options, { skipAuthRetry: true });
      }
    } catch (err) {
      setAuthTokens(null);
      throw err;
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function listCategories() {
  return request('/v1/catalog/categories');
}

export async function listProducts(params = {}) {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.search) qs.set('search', params.search);
  qs.set('limit', params.limit ?? 50);
  qs.set('offset', params.offset ?? 0);
  return request(`/v1/catalog/products?${qs.toString()}`);
}

export async function getProduct(productId) {
  return request(`/v1/catalog/products/${productId}`);
}

export async function getCart() {
  return request('/v1/cart');
}

export async function replaceCartItems(items) {
  return request('/v1/cart/items', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export async function updateCartItemQuantity(productId, variantId, quantity) {
  return request(`/v1/cart/items/${productId}/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(productId, variantId) {
  return request(`/v1/cart/items/${productId}/${variantId}`, {
    method: 'DELETE',
  });
}

export async function clearCart() {
  return request('/v1/cart', { method: 'DELETE' });
}

export async function createOrder(payload) {
  return request('/v1/orders', { method: 'POST', body: JSON.stringify(payload) });
}

export async function register(payload) {
  return request('/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function login(payload) {
  return request('/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export async function profile() {
  return request('/v1/auth/profile');
}

export async function refreshTokens(refreshToken) {
  return request('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, { skipAuthRetry: true });
}
