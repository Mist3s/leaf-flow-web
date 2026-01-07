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
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { AuthModal } from './components/AuthModal';
import { createOrder, clearCart } from './api';
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Динамический title для SEO
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Zavarka39 — Китайский чай в Калининграде | Купить чай с доставкой',
      product: 'Zavarka39 — Китайский чай',
      cart: 'Корзина — Zavarka39',
      checkout: orderSummary ? 'Заказ оформлен — Zavarka39' : 'Оформление заказа — Zavarka39',
    };
    document.title = titles[route.name] || 'Zavarka39';
  }, [route.name, orderSummary]);

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
    setAuthModalOpen(true);
  };

  const closeAuth = () => {
    setAuthModalOpen(false);
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

  const submitOrder = async (payload: { customerName: string; phone: string; delivery: string; payment: string; address?: string | null; comment?: string }) => {
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
        authLoading={auth.loading}
        onToggleTheme={toggleTheme}
        onNavigate={navigate}
        onOpenAuth={() => openAuth('login')}
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
        <CartPage cart={cart} onNavigate={navigate} onChangeQty={changeQuantity} onRemove={removeItem} user={auth.user} authLoading={auth.loading} onOpenAuth={() => openAuth('login')} />
      )}

      {route.name === 'checkout' &&
        (orderSummary ? (
          <OrderSuccessPage order={orderSummary} onNavigate={navigate} />
        ) : (
          <CheckoutPage cart={cart} onNavigate={navigate} onSubmit={submitOrder} user={auth.user} authLoading={auth.loading} onOpenAuth={() => openAuth('login')} />
        ))}

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuth}
        onLogin={doLogin}
        onRegister={doRegister}
        auth={auth}
        initialMode={authMode}
      />

      <ToastStack toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </div>
  );
};

export default App;
