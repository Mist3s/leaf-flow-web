import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useRoute } from './hooks/useRoute';
import { useTheme } from './hooks/useTheme';
import { Home } from './pages/Home';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AuthPage } from './pages/AuthPage';
import { createOrder, clearCart } from './api';
import { formatCurrency } from './utils/format';
import { CartItem } from './types/cart';
import { ToastItem, ToastStack } from './components/Toast';

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const [route, navigate] = useRoute();
  const { auth, doLogin, doRegister, logout } = useAuth();
  const { cart, addItem, changeQuantity, removeItem, reset } = useCart(Boolean(auth.tokens));
  const [filters, setFilters] = useState({ search: '', category: '' });
  const [orderSummary, setOrderSummary] = useState<{ orderId: string; deliveryMethod: string; total: string } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const pushToast = (toast: Omit<ToastItem, 'id'> & { duration?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const duration = toast.duration ?? 5500;
    setToasts((prev) => [...prev, { ...toast, id }]);
    if (duration !== 0) {
      setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), duration);
    }
  };

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    navigate('/auth');
  };

  const addToCart = (payload: Omit<CartItem, 'productName' | 'variantLabel' | 'price'> & {
    price: string;
    productName: string;
    variantLabel: string;
    image?: string;
  }) => {
    if (!auth.user) {
      pushToast({
        tone: 'warning',
        message: 'Корзина доступна только авторизованным пользователям.',
        actions: [
          { label: 'Войти', onClick: () => openAuth('login') },
          { label: 'Регистрация', onClick: () => openAuth('register') },
        ],
      });
      return;
    }
    addItem(payload);
    pushToast({
      tone: 'success',
      message: `${payload.productName} (${payload.variantLabel}) добавлен в корзину.`,
      actions: [{ label: 'Открыть корзину', onClick: () => navigate('/cart') }],
    });
  };

  const submitOrder = async (payload: { customerName: string; phone: string; delivery: string; address?: string | null; comment?: string }) => {
    const summary = await createOrder({ ...payload, expectedTotal: cart.totalPrice });
    await clearCart();
    reset();
    setOrderSummary(summary);
  };

  useEffect(() => {
    if (route.name !== 'checkout') setOrderSummary(null);
  }, [route.name]);

  return (
    <div className="page">
      <Header
        theme={theme}
        cartCount={cart.totalCount}
        user={auth.user}
        onToggleTheme={toggleTheme}
        onNavigate={(path) => {
          if (path === '/auth') setAuthMode('login');
          navigate(path);
        }}
        onLogout={() => {
          logout();
          reset();
          navigate('/');
        }}
      />

      {route.name === 'home' && (
        <Home
          filters={filters}
          onFiltersChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
          onNavigate={navigate}
        />
      )}

      {route.name === 'product' && (
        <ProductPage
          id={route.params.id}
          onNavigate={navigate}
          cart={cart}
          onChangeQty={changeQuantity}
          onAdd={(product, variant, quantity) =>
            addToCart({
              productId: product.id,
              variantId: variant.id,
              quantity,
              price: variant.price,
              productName: product.name,
              variantLabel: variant.weight,
              image: product.image,
            })
          }
        />
      )}

      {route.name === 'cart' && (
        <CartPage cart={cart} onNavigate={navigate} onChangeQty={changeQuantity} onRemove={removeItem} user={auth.user} />
      )}

      {route.name === 'checkout' &&
        (orderSummary ? (
          <div className="surface stack">
            <div className="alert">Заказ создан</div>
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
        ))}

      {route.name === 'auth' && (
        <AuthPage
          onNavigate={navigate}
          onLogin={doLogin}
          onRegister={doRegister}
          auth={auth}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      )}

      <ToastStack toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
};

export default App;
