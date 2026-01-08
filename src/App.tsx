import React, { useEffect, useState, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
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
import { ProfilePage } from './pages/ProfilePage';
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
  const [orderSummary, setOrderSummary] = useState<{ orderId: string; customerName: string; deliveryMethod: string; total: string } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const prevRouteRef = useRef(route.name);
  const homeScrollRef = useRef(0);
  const isRestoringScroll = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Показываем кнопку "наверх" при скролле + сохраняем позицию главной
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      // Сохраняем позицию скролла для главной страницы
      if (route.name === 'home' && !isRestoringScroll.current) {
        homeScrollRef.current = window.scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [route.name]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Динамический title для SEO
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Zavarka39 — Китайский чай в Калининграде | Купить чай с доставкой',
      product: 'Zavarka39 — Китайский чай',
      cart: 'Корзина — Zavarka39',
      checkout: orderSummary ? 'Заказ оформлен — Zavarka39' : 'Оформление заказа — Zavarka39',
      profile: 'Мой профиль — Zavarka39',
    };
    document.title = titles[route.name] || 'Zavarka39';
  }, [route.name, orderSummary]);

  // Скролл при переходе между страницами
  useEffect(() => {
    const prevRoute = prevRouteRef.current;
    
    // Восстанавливаем позицию при возврате на главную
    if (route.name === 'home' && prevRoute !== 'home') {
      isRestoringScroll.current = true;
      requestAnimationFrame(() => {
        window.scrollTo(0, homeScrollRef.current);
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 100);
      });
    } else if (route.name !== 'home') {
      // Скролл наверх для остальных страниц
      window.scrollTo(0, 0);
    }
    
    prevRouteRef.current = route.name;
  }, [route.name, route.params && 'id' in route.params ? route.params.id : null]);

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
    setOrderSummary({ ...summary, customerName: payload.customerName });
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

      {route.name === 'profile' && (
        <ProfilePage 
          user={auth.user} 
          onNavigate={navigate}
          onOpenAuth={() => openAuth('login')} 
          onLogout={() => {
            logout();
            reset();
            navigate('/');
          }}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuth}
          onLogin={doLogin}
          onRegister={doRegister}
          auth={auth}
        initialMode={authMode}
        />

      <ToastStack toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />

      {showScrollTop && route.name === 'home' && (
        <button className="scroll-to-top" onClick={scrollToTop} aria-label="Наверх">
          <ChevronUp size={24} />
        </button>
      )}
    </div>
  );
};

export default App;
