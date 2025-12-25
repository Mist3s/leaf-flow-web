import React, { useEffect, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
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

const THEME_KEY = 'zavarka-theme';

const RouteContext = React.createContext({ path: '/', params: {}, navigate: () => {} });

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

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  return [theme, toggleTheme];
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
    const match = path.match(r.pattern);
    if (match) {
      const params = {};
      r.keys.forEach((key, index) => {
        params[key] = match[index + 1];
      });
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
  const [auth, setAuth] = useState({
    user: null,
    tokens: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const stored = getStoredTokens();
    if (!stored) return;
    setAuthTokens(stored);
    setAuth((prev) => ({ ...prev, tokens: stored }));
    (async () => {
      try {
        setAuth((prev) => ({ ...prev, loading: true }));
        const user = await profile();
        setAuth((prev) => ({ ...prev, user, loading: false }));
      } catch (error) {
        console.warn('Не удалось загрузить профиль', error);
        setAuthTokens(null);
        setAuth({ user: null, tokens: null, loading: false, error: 'Сессия истекла' });
      }
    })();
  }, []);

  const doLogin = async (payload) => {
    setAuth((prev) => ({ ...prev, loading: true, error: null }));
    const res = await login(payload);
    setAuthTokens(res.tokens);
    setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
  };

  const doRegister = async (payload) => {
    setAuth((prev) => ({ ...prev, loading: true, error: null }));
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
      setCart((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const remote = await getCart();
        if (!cancelled) {
          const calculated = computeCart(
            (remote?.items || []).map((item) => ({
              ...item,
              quantity: item.quantity ?? 1,
            })),
          );
          setCart({ ...calculated, error: null, loading: false });
        }
      } catch (error) {
        if (!cancelled) {
          setCart((prev) => ({ ...prev, loading: false, error: 'Не удалось загрузить корзину' }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.tokens]);

  const sync = async (items) => {
    if (!auth.tokens) return;
    try {
      await replaceCartItems(
        items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      );
      setCart((prev) => ({ ...prev, error: null }));
    } catch (error) {
      setCart((prev) => ({ ...prev, error: 'Не удалось синхронизировать корзину' }));
    }
  };

  const updateItems = (items) => {
    const calculated = computeCart(items);
    setCart((prev) => ({ ...prev, ...calculated }));
    sync(items);
  };

  const addItem = (product, variant, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.items.find((i) => i.productId === product.id && i.variantId === variant.id);
      let items;
      if (existing) {
        items = prev.items.map((i) =>
          i.productId === product.id && i.variantId === variant.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      } else {
        items = [
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
      }
      const calculated = computeCart(items);
      sync(items);
      return { ...prev, ...calculated };
    });
  };

  const changeQuantity = (productId, variantId, quantity) => {
    setCart((prev) => {
      const items = prev.items
        .map((item) => (item.productId === productId && item.variantId === variantId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0);
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const removeItem = (productId, variantId) => {
    setCart((prev) => {
      const items = prev.items.filter((item) => !(item.productId === productId && item.variantId === variantId));
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const reset = () => setCart({ items: [], totalPrice: '0.00', totalCount: 0, error: null, loading: false });

  return { cart, addItem, changeQuantity, removeItem, reset };
}

function Header({ theme, toggleTheme, cartCount, user, onNavigate, onLogout }) {
  return (
    <header className="nav">
      <a className="brand" href="#/" onClick={() => onNavigate('/')}>
        <span className="brand-badge">
          <CupSoda size={22} />
        </span>
        Zavarka39
      </a>
      <div className="nav-actions">
        <button className="pill" onClick={toggleTheme}>
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          {theme === 'dark' ? 'Тёмная' : 'Светлая'}
        </button>
        {user ? (
          <>
            <span className="nav-user">
              <UserRound size={16} />
              {user.firstName || 'Профиль'}
            </span>
            <button className="pill" onClick={onLogout}>
              <LogOut size={16} />
              Выйти
            </button>
          </>
        ) : (
          <button className="pill" onClick={() => onNavigate('/auth')}>
            <LogIn size={16} />
            Войти
          </button>
        )}
        <button className="pill" onClick={() => onNavigate('/cart')}>
          <ShoppingBag size={16} />
          Корзина
          <span className="badge">{cartCount}</span>
        </button>
      </div>
    </header>
  );
}

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
    listProducts({
      search: filters.search || undefined,
      category: filters.category || undefined,
      limit: 60,
    })
      .then((res) => {
        setProducts(res.items || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить товары');
        setLoading(false);
      });
  }, [filters.search, filters.category]);

  return (
    <div className="stack">
      <section className="hero">
        <h1>Каталог китайского чая</h1>
        <p>Поиск работает по названию и тегам.</p>
        <div className="row" style={{ gap: '0.5rem' }}>
          <Search size={18} />
          <input
            className="input"
            type="search"
            placeholder="Поиск по каталогу"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
          />
        </div>
      </section>

      <section className="section">
        <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button className={`pill ${!filters.category ? 'active' : ''}`} onClick={() => onFiltersChange({ category: '' })}>
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`pill ${filters.category === cat.id ? 'active' : ''}`}
              onClick={() => onFiltersChange({ category: cat.id })}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="row justify-between" style={{ marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Товары</h2>
          <span className="muted">{products.length ? `${products.length} позиций` : ''}</span>
        </div>
        {loading && <p className="muted">Загружаем подборку...</p>}
        {error && <div className="alert danger">{error}</div>}
        {!loading && !products.length && <p className="muted">Товары не найдены.</p>}
        <div className="grid">
          {products.map((product) => (
            <article key={product.id} className="card">
              <img src={product.image} alt={product.name} loading="lazy" />
              <div className="row justify-between">
                <h3 style={{ margin: 0 }}>{product.name}</h3>
                <span className="badge">{product.category}</span>
              </div>
              <p className="muted" style={{ minHeight: '48px' }}>
                {product.description.slice(0, 90)}...
              </p>
              <div className="row justify-between">
                <div className="stack" style={{ gap: '0.15rem' }}>
                  <strong>{priceRange(product.variants)}</strong>
                  <span className="muted">от {product.variants?.[0]?.weight}</span>
                </div>
                <div className="row">
                  <button className="button ghost" onClick={() => onNavigate(`/product/${product.id}`)}>
                    Открыть
                  </button>
                  <button
                    className="button"
                    onClick={() => {
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
            </article>
          ))}
        </div>
      </section>
    </div>
  );
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

  if (error) return <div className="alert danger">{error}</div>;
  if (!product) return <p className="muted">Загружаем описание...</p>;

  return (
    <div className="stack">
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <button className="pill" onClick={() => onNavigate('/')}>
          <ArrowLeft size={16} /> Назад
        </button>
      </div>
      <section className="product-header">
        <div className="product-visual">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="stack">
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            {product.tags.map((tag) => (
              <span key={tag} className="badge">
                #{tag}
              </span>
            ))}
          </div>
          <h1 style={{ margin: 0 }}>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <div className="stack">
            <span className="muted">Выберите фасовку</span>
            <div className="variant-list">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  className={`variant ${variant.id === activeVariant?.id ? 'active' : ''}`}
                  onClick={() => setActiveVariant(variant)}
                >
                  <strong>{variant.weight}</strong>
                  <span className="muted">{formatCurrency(variant.price)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="row justify-between" style={{ alignItems: 'flex-end' }}>
            <div className="stack" style={{ gap: '0.15rem' }}>
              <span className="muted">Стоимость</span>
              <h2 style={{ margin: 0 }}>{formatCurrency(activeVariant?.price)}</h2>
            </div>
            <div className="row">
              <input
                type="number"
                min="1"
                value={quantity}
                className="input"
                style={{ width: '90px' }}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
              <button
                className="button"
                onClick={() => {
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
    </div>
  );
}

function CartPage({ cart, onNavigate, onChangeQty, onRemove, user }) {
  if (!user) {
    return (
      <div className="surface stack" style={{ alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0 }}>Только для авторизованных</h2>
        <p className="muted">Войдите, чтобы оформить заказ и увидеть корзину.</p>
        <button className="button" onClick={() => onNavigate('/auth')}>
          Перейти к входу
        </button>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="surface stack" style={{ alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0 }}>Корзина пуста</h2>
        <p className="muted">Добавьте чай в каталоге.</p>
        <button className="button" onClick={() => onNavigate('/')}>
          К каталогу
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row justify-between">
        <h2 style={{ margin: 0 }}>Корзина</h2>
        <span className="muted">{cart.items.length} позиций</span>
      </div>
      {cart.error && <div className="alert danger">{cart.error}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Товар</th>
            <th>Цена</th>
            <th>Кол-во</th>
            <th>Сумма</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr key={`${item.productId}:${item.variantId}`}>
              <td>
                <div className="stack">
                  <strong>{item.productName}</strong>
                  <span className="muted">{item.variantLabel}</span>
                </div>
              </td>
              <td>{formatCurrency(item.price)}</td>
              <td>
                <div className="row">
                  <button className="pill" onClick={() => onChangeQty(item.productId, item.variantId, Math.max(1, item.quantity - 1))}>
                    <Minus size={14} />
                  </button>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={item.quantity}
                    style={{ width: '80px' }}
                    onChange={(e) => onChangeQty(item.productId, item.variantId, Math.max(1, Number(e.target.value) || 1))}
                  />
                  <button className="pill" onClick={() => onChangeQty(item.productId, item.variantId, item.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </td>
              <td>{formatCurrency(parseFloat(item.price) * item.quantity)}</td>
              <td>
                <button className="pill danger" onClick={() => onRemove(item.productId, item.variantId)}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row justify-between" style={{ alignItems: 'center' }}>
        <div className="stack" style={{ gap: '0.15rem' }}>
          <span className="muted">Всего</span>
          <h2 style={{ margin: 0 }}>{formatCurrency(cart.totalPrice)}</h2>
        </div>
        <button className="button" onClick={() => onNavigate('/checkout')}>
          Перейти к оформлению
        </button>
      </div>
    </div>
  );
}

function CheckoutPage({ cart, onNavigate, onSubmit, user }) {
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    delivery: 'pickup',
    address: '',
    comment: '',
  });
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <div className="surface stack" style={{ alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0 }}>Только для авторизованных</h2>
        <p className="muted">Войдите, чтобы оформить заказ.</p>
        <button className="button" onClick={() => onNavigate('/auth')}>
          Перейти к входу
        </button>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="surface stack">
        <h2 style={{ margin: 0 }}>Корзина пуста</h2>
        <button className="button" onClick={() => onNavigate('/')}>
          К каталогу
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        address: form.delivery === 'pickup' ? null : form.address,
      });
    } catch (err) {
      setError('Не удалось отправить заказ');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ gap: '0.75rem' }}>
        <button className="pill" onClick={() => onNavigate('/cart')}>
          <ArrowLeft size={16} /> Назад
        </button>
        <h2 style={{ margin: 0 }}>Оформление заказа</h2>
      </div>
      <div className="section surface">
        <form className="stack" onSubmit={handleSubmit}>
          <label className="stack">
            <span className="muted">Имя и фамилия</span>
            <input
              className="input"
              required
              value={form.customerName}
              onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
            />
          </label>
          <label className="stack">
            <span className="muted">Телефон</span>
            <input className="input" required value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </label>
          <div className="stack">
            <span className="muted">Доставка</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              {['pickup', 'courier', 'cdek'].map((method) => (
                <label key={method} className="pill" style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="delivery"
                    value={method}
                    checked={form.delivery === method}
                    onChange={(e) => setForm((prev) => ({ ...prev, delivery: e.target.value }))}
                  />{' '}
                  {method === 'pickup' ? 'Самовывоз' : method === 'courier' ? 'Курьер' : 'СДЭК'}
                </label>
              ))}
            </div>
          </div>
          {form.delivery !== 'pickup' && (
            <label className="stack">
              <span className="muted">Адрес</span>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                required={form.delivery !== 'pickup'}
              />
            </label>
          )}
          <label className="stack">
            <span className="muted">Комментарий</span>
            <textarea
              className="input"
              rows="3"
              value={form.comment}
              onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
            ></textarea>
          </label>
          <hr className="divider" />
          <div className="row justify-between" style={{ alignItems: 'center' }}>
            <div className="stack" style={{ gap: '0.15rem' }}>
              <span className="muted">{cart.totalCount} позиций</span>
              <strong>{formatCurrency(cart.totalPrice)}</strong>
            </div>
            <button className="button" type="submit" disabled={sending}>
              {sending ? 'Отправляем...' : 'Отправить заказ'}
            </button>
          </div>
          {error && <div className="alert danger">{error}</div>}
        </form>
      </div>
      <div className="surface stack">
        <h3 style={{ margin: 0 }}>Состав заказа</h3>
        {cart.items.map((item) => (
          <div key={`${item.productId}:${item.variantId}`} className="row justify-between">
            <div className="stack" style={{ gap: '0.1rem' }}>
              <strong>{item.productName}</strong>
              <span className="muted">
                {item.variantLabel} · {formatCurrency(item.price)}
              </span>
            </div>
            <span>× {item.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
        await onRegister({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName || null,
        });
      }
      onNavigate('/');
    } catch (err) {
      setError('Не удалось выполнить запрос. Проверьте данные.');
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ gap: '0.5rem' }}>
        <button className="pill" onClick={() => onNavigate('/')}>
          <ArrowLeft size={16} /> Назад
        </button>
        <h2 style={{ margin: 0 }}>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
      </div>
      <div className="surface">
        <div className="row" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`pill ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
            Войти
          </button>
          <button className={`pill ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
            Создать аккаунт
          </button>
        </div>
        <form className="stack" onSubmit={submit}>
          {mode === 'register' && (
            <label className="stack">
              <span className="muted">Имя</span>
              <input className="input" required value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            </label>
          )}
          <label className="stack">
            <span className="muted">Email</span>
            <input className="input" required type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </label>
          <label className="stack">
            <span className="muted">Пароль</span>
            <input className="input" required type="password" minLength={8} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </label>
          {mode === 'register' && (
            <label className="stack">
              <span className="muted">Фамилия (опционально)</span>
              <input className="input" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            </label>
          )}
          {error && <div className="alert danger">{error}</div>}
          <button className="button" type="submit" disabled={auth.loading}>
            {auth.loading ? 'Сохраняем...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
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

  return (
    <RouteContext.Provider value={{ ...route, navigate }}>
      <Header theme={theme} toggleTheme={toggleTheme} cartCount={cart.totalCount} user={auth.user} onNavigate={navigate} onLogout={() => { logout(); reset(); navigate('/'); }} />
      <main className="section" style={{ paddingTop: 0 }}>
        {route.name === 'home' && (
          <Home
            filters={filters}
            onFiltersChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
            onNavigate={navigate}
            onAdd={addItem}
            user={auth.user}
          />
        )}
        {route.name === 'product' && (
          <ProductPage id={route.params.id} onNavigate={navigate} onAdd={addItem} user={auth.user} />
        )}
        {route.name === 'cart' && (
          <CartPage cart={cart} onNavigate={navigate} onChangeQty={changeQuantity} onRemove={removeItem} user={auth.user} />
        )}
        {route.name === 'checkout' && (
          <>
            {orderSummary ? (
              <div className="surface stack">
                <div className="alert">
                  <ShieldCheck size={16} /> Заказ создан
                </div>
                <h2 style={{ margin: 0 }}>Спасибо! Заказ №{orderSummary.orderId}</h2>
                <p className="muted">
                  Метод доставки: {orderSummary.deliveryMethod}. Сумма: {formatCurrency(orderSummary.total)}.
                </p>
                <button className="button" onClick={() => navigate('/')}>
                  Вернуться в каталог
                </button>
              </div>
            ) : (
              <CheckoutPage cart={cart} onNavigate={navigate} onSubmit={submitOrder} user={auth.user} />
            )}
          </>
        )}
        {route.name === 'auth' && (
          <AuthPage onNavigate={navigate} onLogin={doLogin} onRegister={doRegister} auth={auth} />
        )}
      </main>
    </RouteContext.Provider>
  );
}

const root = createRoot(document.getElementById('app'));
root.render(<App />);
