import React, { useEffect, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import htm from 'https://esm.sh/htm@3.1.1?dev';
import {
  ShoppingBag,
  Moon,
  Sun,
  LogIn,
  LogOut,
  UserRound,
  CupSoda,
  Search,
  Plus,
  Minus,
  ArrowLeft,
  ShieldCheck,
} from 'https://esm.sh/lucide-react@0.469.0';
import {
  listCategories,
  listProducts,
  getProduct,
  getCart,
  replaceCartItems,
  clearCart,
  createOrder,
  register,
  login,
  profile,
  setAuthTokens,
  getStoredTokens,
} from './api.js';
import { formatCurrency, priceRange } from './utils/format.js';

const html = htm.bind(React.createElement);
const THEME_KEY = 'zavarka-theme';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return saved || (systemDark ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return [theme, () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))];
}

function parseRoute() {
  const path = location.hash.replace(/^#/, '') || '/';
  const routes = [
    { name: 'home', pattern: /^\/$/, keys: [] },
    { name: 'product', pattern: /^\/product\/([^/]+)$/, keys: ['id'] },
    { name: 'cart', pattern: /^\/cart$/, keys: [] },
    { name: 'checkout', pattern: /^\/checkout$/, keys: [] },
    { name: 'auth', pattern: /^\/auth$/, keys: [] },
  ];
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      const params = {};
      r.keys.forEach((key, i) => (params[key] = m[i + 1]));
      return { name: r.name, params };
    }
  }
  return { name: 'home', params: {} };
}

function useRoute() {
  const [route, setRoute] = useState(parseRoute);
  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (path) => {
    const normalized = path.startsWith('#') ? path : `#${path}`;
    if (location.hash === normalized) {
      setRoute(parseRoute());
    } else {
      location.hash = normalized;
    }
  };
  return [route, navigate];
}

function computeCart(items) {
  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, totalPrice: totalPrice.toFixed(2), totalCount };
}

function useAuth() {
  const [auth, setAuth] = useState({ user: null, tokens: null, loading: false, error: null });

  useEffect(() => {
    const stored = getStoredTokens();
    if (!stored) return;
    setAuthTokens(stored);
    setAuth((p) => ({ ...p, tokens: stored }));
    (async () => {
      try {
        setAuth((p) => ({ ...p, loading: true }));
        const user = await profile();
        setAuth((p) => ({ ...p, user, loading: false }));
      } catch (err) {
        console.warn('Не удалось загрузить профиль', err);
        setAuthTokens(null);
        setAuth({ user: null, tokens: null, loading: false, error: 'Сессия истекла' });
      }
    })();
  }, []);

  const doLogin = async (payload) => {
    setAuth((p) => ({ ...p, loading: true, error: null }));
    const res = await login(payload);
    setAuthTokens(res.tokens);
    setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
  };

  const doRegister = async (payload) => {
    setAuth((p) => ({ ...p, loading: true, error: null }));
    const res = await register(payload);
    setAuthTokens(res.tokens);
    setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
  };

  const logout = () => {
    setAuthTokens(null);
    setAuth({ user: null, tokens: null, loading: false, error: null });
  };

  return { auth, doLogin, doRegister, logout };
}

function useCart(auth) {
  const [cart, setCart] = useState({ items: [], totalPrice: '0.00', totalCount: 0, error: null, loading: false });

  useEffect(() => {
    if (!auth.tokens) {
      setCart({ items: [], totalPrice: '0.00', totalCount: 0, error: null, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      setCart((p) => ({ ...p, loading: true, error: null }));
      try {
        const remote = await getCart();
        if (!cancelled) {
          const calculated = computeCart((remote?.items || []).map((i) => ({ ...i, quantity: i.quantity ?? 1 })));
          setCart({ ...calculated, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) setCart((p) => ({ ...p, loading: false, error: 'Не удалось загрузить корзину' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.tokens]);

  const sync = async (items) => {
    if (!auth.tokens) return;
    try {
      await replaceCartItems(items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })));
      setCart((p) => ({ ...p, error: null }));
    } catch (err) {
      setCart((p) => ({ ...p, error: 'Не удалось синхронизировать корзину' }));
    }
  };

  const addItem = (product, variant, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.items.find((i) => i.productId === product.id && i.variantId === variant.id);
      const items = existing
        ? prev.items.map((i) =>
            i.productId === product.id && i.variantId === variant.id ? { ...i, quantity: i.quantity + quantity } : i,
          )
        : [
            ...prev.items,
            {
              productId: product.id,
              variantId: variant.id,
              quantity,
              price: variant.price,
              productName: product.name,
              variantLabel: variant.weight,
            },
          ];
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const changeQuantity = (productId, variantId, quantity) => {
    setCart((prev) => {
      const items = prev.items
        .map((i) => (i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0);
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const removeItem = (productId, variantId) => {
    setCart((prev) => {
      const items = prev.items.filter((i) => !(i.productId === productId && i.variantId === variantId));
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const reset = () => setCart({ items: [], totalPrice: '0.00', totalCount: 0, error: null, loading: false });
  return { cart, addItem, changeQuantity, removeItem, reset };
}

const Header = ({ theme, toggleTheme, cartCount, user, onNavigate, onLogout }) =>
  html`<header class="nav">
    <a class="brand" href="#/" onClick=${(e) => { e.preventDefault(); onNavigate('/'); }}>
      <span class="brand-badge">${html`<${CupSoda} size=${22} />`}</span>
      Zavarka39
    </a>
    <div class="nav-actions">
      <button class="pill" onClick=${toggleTheme}>
        ${theme === 'dark' ? html`<${Moon} size=${16} />` : html`<${Sun} size=${16} />`}
        ${theme === 'dark' ? 'Тёмная' : 'Светлая'}
      </button>
      ${user
        ? html`<span class="nav-user"><${UserRound} size=${16} />${user.firstName || 'Профиль'}</span>
            <button class="pill" onClick=${onLogout}><${LogOut} size=${16} />Выйти</button>`
        : html`<button class="pill" onClick=${() => onNavigate('/auth')}><${LogIn} size=${16} />Войти</button>`}
      <button class="pill" onClick=${() => onNavigate('/cart')}>
        <${ShoppingBag} size=${16} />
        Корзина
        <span class="badge">${cartCount}</span>
      </button>
    </div>
  </header>`;

function Home({ filters, onFiltersChange, onNavigate, onAdd, user }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listCategories().then((res) => setCategories(res.items || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listProducts({ search: filters.search || undefined, category: filters.category || undefined, limit: 60 })
      .then((res) => {
        setProducts(res.items || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить товары');
        setLoading(false);
      });
  }, [filters.search, filters.category]);

  return html`<div class="stack">
    <section class="hero">
      <h1>Каталог китайского чая</h1>
      <p>Поиск работает по названию и тегам.</p>
      <div class="row" style=${{ gap: '0.5rem' }}>
        <${Search} size=${18} />
        <input
          class="input"
          type="search"
          placeholder="Поиск по каталогу"
          value=${filters.search}
          onInput=${(e) => onFiltersChange({ search: e.target.value })}
        />
      </div>
    </section>
    <section class="section">
      <div class="row" style=${{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <button class=${`pill ${!filters.category ? 'active' : ''}`} onClick=${() => onFiltersChange({ category: '' })}>Все</button>
        ${categories.map(
          (cat) =>
            html`<button
              key=${cat.id}
              class=${`pill ${filters.category === cat.id ? 'active' : ''}`}
              onClick=${() => onFiltersChange({ category: cat.id })}
            >
              ${cat.label}
            </button>`,
        )}
      </div>
    </section>
    <section class="section">
      <div class="row justify-between" style=${{ marginBottom: '0.5rem' }}>
        <h2 style=${{ margin: 0 }}>Товары</h2>
        <span class="muted">${products.length ? `${products.length} позиций` : ''}</span>
      </div>
      ${loading && html`<p class="muted">Загружаем подборку...</p>`}
      ${error && html`<div class="alert danger">${error}</div>`}
      ${!loading && !products.length && html`<p class="muted">Товары не найдены.</p>`}
      <div class="grid">
        ${products.map(
          (product) => html`<article key=${product.id} class="card">
            <img src=${product.image} alt=${product.name} loading="lazy" />
            <div class="row justify-between">
              <h3 style=${{ margin: 0 }}>${product.name}</h3>
              <span class="badge">${product.category}</span>
            </div>
            <p class="muted" style=${{ minHeight: '48px' }}>${product.description.slice(0, 90)}...</p>
            <div class="row justify-between">
              <div class="stack" style=${{ gap: '0.15rem' }}>
                <strong>${priceRange(product.variants)}</strong>
                <span class="muted">от ${product.variants?.[0]?.weight}</span>
              </div>
              <div class="row">
                <button class="button ghost" onClick=${() => onNavigate(`/product/${product.id}`)}>Открыть</button>
                <button
                  class="button"
                  onClick=${() => {
                    if (!user) {
                      onNavigate('/auth');
                      return;
                    }
                    const variant = product.variants?.[0];
                    if (variant) onAdd(product, variant, 1);
                  }}
                >
                  В корзину
                </button>
              </div>
            </div>
          </article>`,
        )}
      </div>
    </section>
  </div>`;
}

function ProductPage({ id, onNavigate, onAdd, user }) {
  const [product, setProduct] = useState(null);
  const [activeVariant, setActiveVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    getProduct(id)
      .then((res) => {
        setProduct(res);
        setActiveVariant(res.variants?.[0]);
      })
      .catch(() => setError('Не удалось загрузить товар'));
  }, [id]);

  if (error) return html`<div class="alert danger">${error}</div>`;
  if (!product) return html`<p class="muted">Загружаем описание...</p>`;

  return html`<div class="stack">
    <div class="row" style=${{ marginBottom: '0.75rem' }}>
      <button class="pill" onClick=${() => onNavigate('/')}>
        <${ArrowLeft} size=${16} /> Назад
      </button>
    </div>
    <section class="product-header">
      <div class="product-visual"><img src=${product.image} alt=${product.name} /></div>
      <div class="stack">
        <div class="row" style=${{ gap: '0.5rem', flexWrap: 'wrap' }}>
          ${product.tags.map((tag) => html`<span key=${tag} class="badge">#${tag}</span>`)}
        </div>
        <h1 style=${{ margin: 0 }}>${product.name}</h1>
        <p class="muted">${product.description}</p>
        <div class="stack">
          <span class="muted">Выберите фасовку</span>
          <div class="variant-list">
            ${product.variants.map(
              (variant) => html`<button
                key=${variant.id}
                class=${`variant ${variant.id === activeVariant?.id ? 'active' : ''}`}
                onClick=${() => setActiveVariant(variant)}
              >
                <strong>${variant.weight}</strong>
                <span class="muted">${formatCurrency(variant.price)}</span>
              </button>`,
            )}
          </div>
        </div>
        <div class="row justify-between" style=${{ alignItems: 'flex-end' }}>
          <div class="stack" style=${{ gap: '0.15rem' }}>
            <span class="muted">Стоимость</span>
            <h2 style=${{ margin: 0 }}>${formatCurrency(activeVariant?.price)}</h2>
          </div>
          <div class="row">
            <input
              type="number"
              min="1"
              value=${quantity}
              class="input"
              style=${{ width: '90px' }}
              onInput=${(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
            <button
              class="button"
              onClick=${() => {
                if (!user) {
                  onNavigate('/auth');
                  return;
                }
                if (activeVariant) onAdd(product, activeVariant, quantity);
              }}
            >
              В корзину
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>`;
}

function CartPage({ cart, onNavigate, onChangeQty, onRemove, user }) {
  if (!user)
    return html`<div class="surface stack" style=${{ alignItems: 'flex-start' }}>
      <h2 style=${{ margin: 0 }}>Только для авторизованных</h2>
      <p class="muted">Войдите, чтобы оформить заказ и увидеть корзину.</p>
      <button class="button" onClick=${() => onNavigate('/auth')}>Перейти к входу</button>
    </div>`;
  if (!cart.items.length)
    return html`<div class="surface stack" style=${{ alignItems: 'flex-start' }}>
      <h2 style=${{ margin: 0 }}>Корзина пуста</h2>
      <p class="muted">Добавьте чай в каталоге.</p>
      <button class="button" onClick=${() => onNavigate('/')}>К каталогу</button>
    </div>`;

  return html`<div class="stack">
    <div class="row justify-between">
      <h2 style=${{ margin: 0 }}>Корзина</h2>
      <span class="muted">${cart.items.length} позиций</span>
    </div>
    ${cart.error && html`<div class="alert danger">${cart.error}</div>`}
    <table class="table">
      <thead>
        <tr><th>Товар</th><th>Цена</th><th>Кол-во</th><th>Сумма</th><th></th></tr>
      </thead>
      <tbody>
        ${cart.items.map(
          (item) => html`<tr key=${`${item.productId}:${item.variantId}`}>
            <td>
              <div class="stack"><strong>${item.productName}</strong><span class="muted">${item.variantLabel}</span></div>
            </td>
            <td>${formatCurrency(item.price)}</td>
            <td>
              <div class="row">
                <button class="pill" onClick=${() => onChangeQty(item.productId, item.variantId, Math.max(1, item.quantity - 1))}>
                  <${Minus} size=${14} />
                </button>
                <input
                  class="input"
                  type="number"
                  min="1"
                  value=${item.quantity}
                  style=${{ width: '80px' }}
                  onInput=${(e) => onChangeQty(item.productId, item.variantId, Math.max(1, Number(e.target.value) || 1))}
                />
                <button class="pill" onClick=${() => onChangeQty(item.productId, item.variantId, item.quantity + 1)}>
                  <${Plus} size=${14} />
                </button>
              </div>
            </td>
            <td>${formatCurrency(parseFloat(item.price) * item.quantity)}</td>
            <td><button class="pill danger" onClick=${() => onRemove(item.productId, item.variantId)}>Удалить</button></td>
          </tr>`,
        )}
      </tbody>
    </table>
    <div class="row justify-between" style=${{ alignItems: 'center' }}>
      <div class="stack" style=${{ gap: '0.15rem' }}>
        <span class="muted">Всего</span>
        <h2 style=${{ margin: 0 }}>${formatCurrency(cart.totalPrice)}</h2>
      </div>
      <button class="button" onClick=${() => onNavigate('/checkout')}>Перейти к оформлению</button>
    </div>
  </div>`;
}

function CheckoutPage({ cart, onNavigate, onSubmit, user }) {
  const [form, setForm] = useState({ customerName: '', phone: '', delivery: 'pickup', address: '', comment: '' });
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  if (!user)
    return html`<div class="surface stack" style=${{ alignItems: 'flex-start' }}>
      <h2 style=${{ margin: 0 }}>Только для авторизованных</h2>
      <p class="muted">Войдите, чтобы оформить заказ.</p>
      <button class="button" onClick=${() => onNavigate('/auth')}>Перейти к входу</button>
    </div>`;
  if (!cart.items.length)
    return html`<div class="surface stack">
      <h2 style=${{ margin: 0 }}>Корзина пуста</h2>
      <button class="button" onClick=${() => onNavigate('/')}>К каталогу</button>
    </div>`;

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await onSubmit({ ...form, address: form.delivery === 'pickup' ? null : form.address });
    } catch (err) {
      setError('Не удалось отправить заказ');
    } finally {
      setSending(false);
    }
  };

  return html`<div class="stack">
    <div class="row" style=${{ gap: '0.75rem' }}>
      <button class="pill" onClick=${() => onNavigate('/cart')}><${ArrowLeft} size=${16} /> Назад</button>
      <h2 style=${{ margin: 0 }}>Оформление заказа</h2>
    </div>
    <div class="section surface">
      <form class="stack" onSubmit=${submit}>
        <label class="stack">
          <span class="muted">Имя и фамилия</span>
          <input class="input" required value=${form.customerName} onInput=${(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} />
        </label>
        <label class="stack">
          <span class="muted">Телефон</span>
          <input class="input" required value=${form.phone} onInput=${(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </label>
        <div class="stack">
          <span class="muted">Доставка</span>
          <div class="row" style=${{ flexWrap: 'wrap', gap: '0.5rem' }}>
            ${['pickup', 'courier', 'cdek'].map(
              (method) => html`<label key=${method} class="pill" style=${{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="delivery"
                  value=${method}
                  checked=${form.delivery === method}
                  onInput=${(e) => setForm((p) => ({ ...p, delivery: e.target.value }))}
                />${' '}
                ${method === 'pickup' ? 'Самовывоз' : method === 'courier' ? 'Курьер' : 'СДЭК'}
              </label>`,
            )}
          </div>
        </div>
        ${form.delivery !== 'pickup' &&
        html`<label class="stack">
          <span class="muted">Адрес</span>
          <input class="input" required value=${form.address} onInput=${(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
        </label>`}
        <label class="stack">
          <span class="muted">Комментарий</span>
          <textarea class="input" rows="3" value=${form.comment} onInput=${(e) => setForm((p) => ({ ...p, comment: e.target.value }))}></textarea>
        </label>
        <hr class="divider" />
        <div class="row justify-between" style=${{ alignItems: 'center' }}>
          <div class="stack" style=${{ gap: '0.15rem' }}>
            <span class="muted">${cart.totalCount} позиций</span>
            <strong>${formatCurrency(cart.totalPrice)}</strong>
          </div>
          <button class="button" type="submit" disabled=${sending}>${sending ? 'Отправляем...' : 'Отправить заказ'}</button>
        </div>
        ${error && html`<div class="alert danger">${error}</div>`}
      </form>
    </div>
    <div class="surface stack">
      <h3 style=${{ margin: 0 }}>Состав заказа</h3>
      ${cart.items.map(
        (item) => html`<div key=${`${item.productId}:${item.variantId}`} class="row justify-between">
          <div class="stack" style=${{ gap: '0.1rem' }}>
            <strong>${item.productName}</strong>
            <span class="muted">${item.variantLabel} · ${formatCurrency(item.price)}</span>
          </div>
          <span>× ${item.quantity}</span>
        </div>`,
      )}
    </div>
  </div>`;
}

function AuthPage({ onNavigate, onLogin, onRegister, auth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await onLogin({ email: form.email, password: form.password });
      } else {
        await onRegister({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName || null });
      }
      onNavigate('/');
    } catch (err) {
      setError('Не удалось выполнить запрос. Проверьте данные.');
    }
  };

  return html`<div class="stack">
    <div class="row" style=${{ gap: '0.5rem' }}>
      <button class="pill" onClick=${() => onNavigate('/')}><${ArrowLeft} size=${16} /> Назад</button>
      <h2 style=${{ margin: 0 }}>${mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
    </div>
    <div class="surface">
      <div class="row" style=${{ gap: '0.5rem', marginBottom: '1rem' }}>
        <button class=${`pill ${mode === 'login' ? 'active' : ''}`} onClick=${() => setMode('login')}>Войти</button>
        <button class=${`pill ${mode === 'register' ? 'active' : ''}`} onClick=${() => setMode('register')}>Создать аккаунт</button>
      </div>
      <form class="stack" onSubmit=${submit}>
        ${mode === 'register' &&
        html`<label class="stack">
          <span class="muted">Имя</span>
          <input class="input" required value=${form.firstName} onInput=${(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
        </label>`}
        <label class="stack">
          <span class="muted">Email</span>
          <input class="input" required type="email" value=${form.email} onInput=${(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </label>
        <label class="stack">
          <span class="muted">Пароль</span>
          <input class="input" required type="password" minLength=${8} value=${form.password} onInput=${(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </label>
        ${mode === 'register' &&
        html`<label class="stack">
          <span class="muted">Фамилия (опционально)</span>
          <input class="input" value=${form.lastName} onInput=${(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
        </label>`}
        ${error && html`<div class="alert danger">${error}</div>`}
        <button class="button" type="submit" disabled=${auth.loading}>${auth.loading ? 'Сохраняем...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
      </form>
    </div>
  </div>`;
}

function App() {
  const [theme, toggleTheme] = useTheme();
  const [route, navigate] = useRoute();
  const { auth, doLogin, doRegister, logout } = useAuth();
  const { cart, addItem, changeQuantity, removeItem, reset } = useCart(auth);
  const [filters, setFilters] = useState({ search: '', category: '' });
  const [orderSummary, setOrderSummary] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const submitOrder = async (payload) => {
    const summary = await createOrder({ ...payload, expectedTotal: cart.totalPrice });
    await clearCart();
    reset();
    setOrderSummary(summary);
  };

  useEffect(() => {
    if (route.name === 'home') setOrderSummary(null);
  }, [route.name]);

  return html`<main class="section" style=${{ paddingTop: 0 }}>
    <${Header}
      theme=${theme}
      toggleTheme=${toggleTheme}
      cartCount=${cart.totalCount}
      user=${auth.user}
      onNavigate=${navigate}
      onLogout=${() => {
        logout();
        reset();
        navigate('/');
      }}
    />
    ${route.name === 'home' &&
    html`<${Home}
      filters=${filters}
      onFiltersChange=${(next) => setFilters((prev) => ({ ...prev, ...next }))}
      onNavigate=${navigate}
      onAdd=${addItem}
      user=${auth.user}
    />`}
    ${route.name === 'product' && html`<${ProductPage} id=${route.params.id} onNavigate=${navigate} onAdd=${addItem} user=${auth.user} />`}
    ${route.name === 'cart' &&
    html`<${CartPage} cart=${cart} onNavigate=${navigate} onChangeQty=${changeQuantity} onRemove=${removeItem} user=${auth.user} />`}
    ${route.name === 'checkout' &&
    (orderSummary
      ? html`<div class="surface stack">
          <div class="alert"><${ShieldCheck} size=${16} /> Заказ создан</div>
          <h2 style=${{ margin: 0 }}>Спасибо! Заказ №${orderSummary.orderId}</h2>
          <p class="muted">Метод доставки: ${orderSummary.deliveryMethod}. Сумма: ${formatCurrency(orderSummary.total)}.</p>
          <button class="button" onClick=${() => navigate('/')}>Вернуться в каталог</button>
        </div>`
      : html`<${CheckoutPage} cart=${cart} onNavigate=${navigate} onSubmit=${submitOrder} user=${auth.user} />`)}
    ${route.name === 'auth' && html`<${AuthPage} onNavigate=${navigate} onLogin=${doLogin} onRegister=${doRegister} auth=${auth} />`}
  </main>`;
}

createRoot(document.getElementById('app')).render(html`<${App} />`);
