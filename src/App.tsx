import React, { useEffect, useState, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
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
import { DeliveryPage } from './pages/DeliveryPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { OfferPage } from './pages/OfferPage';
import { AuthModal } from './components/AuthModal';
import { createOrder, clearCart } from './api';
import { CartItem } from './types/cart';
import { ToastItem, ToastStack } from './components/Toast';
import { updateSEO, SEO_PAGES } from './utils/seo';

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
  const forceScrollTopRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Показываем кнопку "наверх" при скролле + сохраняем позицию главной
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      // Сохраняем позицию скролла для главной страницы
      if (route.name === 'home') {
        homeScrollRef.current = window.scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [route.name]);

  // Функция навигации с принудительным скроллом наверх (для логотипа)
  const navigateToTop = (path: string) => {
    if (path === '/' && route.name === 'home') {
      // Уже на главной — просто скролл наверх
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      forceScrollTopRef.current = true;
      navigate(path);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Динамическое SEO (title, description, canonical, OG)
  useEffect(() => {
    const routeName = route.name as keyof typeof SEO_PAGES;
    
    if (routeName === 'checkout' && orderSummary) {
      updateSEO({
        title: 'Заказ оформлен — Zavarka39',
        description: 'Ваш заказ успешно оформлен. Спасибо за покупку в интернет-магазине китайского чая Zavarka39.',
        canonical: '/checkout',
      });
    } else if (SEO_PAGES[routeName]) {
      updateSEO(SEO_PAGES[routeName]);
    } else if (route.name === 'product') {
      // Для страницы товара SEO обновляется в ProductPage
    } else {
      updateSEO(SEO_PAGES.home);
    }
  }, [route.name, orderSummary]);

  // Скролл при переходе между страницами
  useEffect(() => {
    const prevRoute = prevRouteRef.current;
    
    if (route.name !== prevRoute) {
      if (route.name === 'home') {
        // При переходе на главную
        if (forceScrollTopRef.current) {
          // Клик на логотип — скролл наверх
          window.scrollTo({ top: 0, behavior: 'smooth' });
          forceScrollTopRef.current = false;
        } else {
          // Кнопка "назад" — восстанавливаем позицию
          requestAnimationFrame(() => {
            window.scrollTo(0, homeScrollRef.current);
          });
        }
      } else {
        // Переход на другие страницы — скролл наверх
        window.scrollTo(0, 0);
      }
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
    <>
    <div className="page">
      <Header
        theme={theme}
        cartCount={cart.totalCount}
        user={auth.user}
        authLoading={auth.loading}
        onToggleTheme={toggleTheme}
        onNavigate={(path, scrollToTop) => scrollToTop ? navigateToTop(path) : navigate(path)}
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
          authLoading={auth.loading}
          onNavigate={navigate}
          onOpenAuth={() => openAuth('login')} 
          onLogout={() => {
            logout();
            reset();
            navigate('/');
          }}
        />
      )}

      {route.name === 'delivery' && <DeliveryPage onNavigate={navigate} />}
      {route.name === 'privacy' && <PrivacyPage onNavigate={navigate} />}
      {route.name === 'offer' && <OfferPage onNavigate={navigate} />}

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

    <Footer onNavigate={navigate} />
    </>
  );
};

export default App;
