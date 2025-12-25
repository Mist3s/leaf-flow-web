import { clearCart, getCart, getProduct, replaceCartItems } from './api.js';

const CART_KEY = 'zavarka-cart';
const THEME_KEY = 'zavarka-theme';

const subscribers = new Set();
const productCache = new Map();

const state = {
  theme: 'light',
  cart: {
    items: [],
    totalCount: 0,
    totalPrice: '0',
  },
  lastSyncError: null,
};

function notify() {
  subscribers.forEach((cb) => cb({ ...state }));
}

export function subscribe(cb) {
  subscribers.add(cb);
  cb({ ...state });
  return () => subscribers.delete(cb);
}

function formatPriceValue(value) {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function recalcCart(items) {
  const totalPriceValue = items.reduce((acc, item) => acc + formatPriceValue(item.price) * item.quantity, 0);
  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);
  return {
    items,
    totalCount,
    totalPrice: totalPriceValue.toFixed(2),
  };
}

function saveCart(items) {
  localStorage.setItem(
    CART_KEY,
    JSON.stringify(
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        productName: item.productName,
        variantLabel: item.variantLabel,
      })),
    ),
  );
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Не удалось прочитать корзину', err);
    return [];
  }
}

export function setTheme(nextTheme) {
  state.theme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
  document.documentElement.setAttribute('data-theme', nextTheme);
  notify();
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const theme = saved || (systemDark ? 'dark' : 'light');
  setTheme(theme);
}

function updateCart(items, { persist = true, silent = false } = {}) {
  state.cart = recalcCart(items);
  if (persist) {
    saveCart(items);
  }
  if (!silent) {
    notify();
  }
}

export function addCartItem(product, variant, quantity = 1) {
  const items = [...state.cart.items];
  const existing = items.find((i) => i.productId === product.id && i.variantId === variant.id);
  if (existing) {
    existing.quantity += quantity;
    existing.price = variant.price;
  } else {
    items.push({
      productId: product.id,
      variantId: variant.id,
      quantity,
      price: variant.price,
      productName: product.name,
      variantLabel: variant.weight,
    });
  }
  updateCart(items);
  scheduleSync();
}

export function changeCartQuantity(productId, variantId, quantity) {
  const items = state.cart.items
    .map((item) =>
      item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item,
    )
    .filter((item) => item.quantity > 0);
  updateCart(items);
  scheduleSync();
}

export function removeFromCart(productId, variantId) {
  const items = state.cart.items.filter((item) => !(item.productId === productId && item.variantId === variantId));
  updateCart(items);
  scheduleSync();
}

export function clearLocalCart() {
  updateCart([]);
  scheduleSync(true);
}

async function enrichItemsWithProductMeta(items) {
  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
  await Promise.all(
    uniqueProductIds.map(async (id) => {
      if (!productCache.has(id)) {
        const product = await getProduct(id);
        productCache.set(id, product);
      }
    }),
  );

  return items.map((item) => {
    const product = productCache.get(item.productId);
    const variant = product?.variants?.find((v) => v.id === item.variantId);
    const price = item.price ?? variant?.price ?? '0';
    return {
      ...item,
      price,
      productName: item.productName || product?.name || 'Товар',
      variantLabel: item.variantLabel || variant?.weight || 'Вариант',
    };
  });
}

let syncTimer;

async function syncCartToBackend(forceClear = false) {
  try {
    if (forceClear) {
      await clearCart();
      state.lastSyncError = null;
      notify();
      return;
    }
    const payload = state.cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));
    await replaceCartItems(payload);
    state.lastSyncError = null;
    notify();
  } catch (error) {
    console.warn('Синхронизация корзины не удалась', error);
    state.lastSyncError = 'Не удалось синхронизировать корзину с сервером';
    notify();
  }
}

function scheduleSync(forceClear = false) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncCartToBackend(forceClear), 350);
}

export async function hydrateCart() {
  const localItems = loadCart();
  if (localItems.length) {
    updateCart(localItems, { persist: false, silent: true });
  }

  try {
    const remote = await getCart();
    if (remote?.items?.length) {
      const enriched = await enrichItemsWithProductMeta(
        remote.items.map((item) => ({
          ...item,
          quantity: item.quantity ?? 1,
        })),
      );
      updateCart(enriched);
      return;
    }
    if (localItems.length) {
      scheduleSync();
    }
  } catch (error) {
    console.warn('Не удалось получить корзину', error);
    if (!state.cart.items.length && localItems.length) {
      updateCart(localItems);
    }
  }
}

export function getState() {
  return { ...state };
}
