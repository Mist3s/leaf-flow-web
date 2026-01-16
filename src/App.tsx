import React, { useEffect, useState, useRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { ChevronUp } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PageLoader } from './components/PageLoader';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useRoute } from './hooks/useRoute';
import { useTheme } from './hooks/useTheme';
import { createOrder, clearCart } from './api';
import { CartItem } from './types/cart';
import { ToastItem, ToastStack } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { updateSEO, SEO_PAGES, getCategorySEO, getCategoryH1 } from './utils/seo';
import { getIdBySlug } from './utils/categories';

// Lazy loaded pages для code splitting
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const ProductPage = lazy(() => import('./pages/ProductPage').then(m => ({ default: m.ProductPage })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage').then(m => ({ default: m.OrderSuccessPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage').then(m => ({ default: m.DeliveryPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const OfferPage = lazy(() => import('./pages/OfferPage').then(m => ({ default: m.OfferPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const [route, navigate] = useRoute();
  const { auth, doLogin, doRegister, doTelegramLogin, doTelegramLink, doTelegramUnlink, doTelegramMerge, doUpdateProfile, doChangePassword, doSetEmail, logout } = useAuth();
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
  const navigateToTop = useCallback((path: string) => {
    if (path === '/' && route.name === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      forceScrollTopRef.current = true;
      navigate(path);
    }
  }, [route.name, navigate]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Динамическое SEO (title, description, canonical, OG)
  useEffect(() => {
    const routeName = route.name as keyof typeof SEO_PAGES;
    
    if (routeName === 'checkout' && orderSummary) {
      updateSEO({
        title: 'Заказ оформлен — Zavarka39',
        description: 'Ваш заказ успешно оформлен. Спасибо за покупку в интернет-магазине китайского чая Zavarka39.',
        canonical: '/checkout',
      });
    } else if (route.name === 'catalog' && 'slug' in route.params) {
      // SEO для страницы категории
      const categorySEO = getCategorySEO(route.params.slug);
      if (categorySEO) {
        updateSEO(categorySEO);
      } else {
        // Fallback если категория не найдена
        updateSEO(SEO_PAGES.home);
      }
    } else if (route.name === 'notfound') {
      updateSEO(SEO_PAGES.notfound);
    } else if (SEO_PAGES[routeName]) {
      updateSEO(SEO_PAGES[routeName]);
    } else if (route.name === 'product') {
      // Для страницы товара SEO обновляется в ProductPage
    } else {
      updateSEO(SEO_PAGES.home);
    }
  }, [route.name, route.params && 'slug' in route.params ? route.params.slug : null, orderSummary]);

  // Скролл при переходе между страницами
  useEffect(() => {
    const prevRoute = prevRouteRef.current;
    
    if (route.name !== prevRoute) {
      if (route.name === 'home') {
        if (forceScrollTopRef.current) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          forceScrollTopRef.current = false;
        } else {
          requestAnimationFrame(() => {
            window.scrollTo(0, homeScrollRef.current);
          });
        }
      } else {
        window.scrollTo(0, 0);
      }
    }
    
    prevRouteRef.current = route.name;
  }, [route.name, route.params && 'id' in route.params ? route.params.id : null]);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'> & { duration?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const duration = toast.duration ?? 5500;
    setToasts((prev) => [...prev, { ...toast, id }]);
    if (duration !== 0) {
      setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), duration);
    }
  }, []);

  const openAuth = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const addToCart = useCallback((payload: Omit<CartItem, 'productName' | 'variantLabel' | 'price'> & {
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
  }, [auth.user, addItem, pushToast, openAuth, navigate]);

  const submitOrder = useCallback(async (payload: { customerName: string; phone: string; delivery: string; payment: string; address?: string | null; comment?: string }) => {
    const summary = await createOrder({ ...payload, expectedTotal: cart.totalPrice });
    await clearCart();
    reset();
    setOrderSummary({ ...summary, customerName: payload.customerName });
  }, [cart.totalPrice, reset]);

  useEffect(() => {
    if (route.name !== 'checkout') setOrderSummary(null);
  }, [route.name]);

  const handleLogout = useCallback(() => {
    logout();
    reset();
    navigate('/');
  }, [logout, reset, navigate]);

  const handleNavigate = useCallback((path: string, scrollToTop?: boolean) => {
    if (scrollToTop) {
      navigateToTop(path);
    } else {
      navigate(path);
    }
  }, [navigateToTop, navigate]);

  const handleFiltersChange = useCallback((next: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const handleCloseToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Мемоизация пропсов для Header
  const headerProps = useMemo(() => ({
    theme,
    cartCount: cart.totalCount,
    user: auth.user,
    authLoading: auth.loading,
    onToggleTheme: toggleTheme,
    onNavigate: handleNavigate,
    onOpenAuth: () => openAuth('login'),
    onLogout: handleLogout,
  }), [theme, cart.totalCount, auth.user, auth.loading, toggleTheme, handleNavigate, openAuth, handleLogout]);

  // Рендер контента страницы
  const renderPageContent = () => {
    switch (route.name) {
      case 'home':
        return (
          <Suspense fallback={<PageLoader message="Загрузка каталога..." />}>
            <Home
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onNavigate={navigate}
            />
          </Suspense>
        );

      case 'catalog': {
        // Страница категории с SEO-friendly URL
        const slug = 'slug' in route.params ? route.params.slug : '';
        const categoryId = getIdBySlug(slug) || slug; // Fallback на slug как id
        const h1 = getCategoryH1(slug);
        
        return (
          <Suspense fallback={<PageLoader message="Загрузка каталога..." />}>
            <Home
              filters={{ ...filters, category: categoryId }}
              onFiltersChange={handleFiltersChange}
              onNavigate={navigate}
              categoryH1={h1}
            />
          </Suspense>
        );
      }

      case 'product':
        return (
          <Suspense fallback={<PageLoader message="Загрузка товара..." />}>
            <ProductPage
              id={route.params.id}
              onNavigate={navigate}
              cart={cart}
              onChangeQty={changeQuantity}
              onShowToast={pushToast}
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
          </Suspense>
        );

      case 'cart':
        return (
          <Suspense fallback={<PageLoader message="Загрузка корзины..." />}>
            <CartPage 
              cart={cart} 
              onNavigate={navigate} 
              onChangeQty={changeQuantity} 
              onRemove={removeItem} 
              user={auth.user} 
              authLoading={auth.loading} 
              onOpenAuth={() => openAuth('login')} 
            />
          </Suspense>
        );

      case 'checkout':
        return orderSummary ? (
          <Suspense fallback={<PageLoader />}>
            <OrderSuccessPage order={orderSummary} onNavigate={navigate} />
          </Suspense>
        ) : (
          <Suspense fallback={<PageLoader message="Загрузка оформления..." />}>
            <CheckoutPage 
              cart={cart} 
              onNavigate={navigate} 
              onSubmit={submitOrder} 
              user={auth.user} 
              authLoading={auth.loading} 
              onOpenAuth={() => openAuth('login')} 
            />
          </Suspense>
        );

      case 'profile':
        return (
          <Suspense fallback={<PageLoader message="Загрузка профиля..." />}>
            <ProfilePage 
              user={auth.user}
              authLoading={auth.loading}
              onNavigate={navigate}
              onOpenAuth={() => openAuth('login')} 
              onLogout={handleLogout}
              onShowToast={pushToast}
              onTelegramLink={doTelegramLink}
              onTelegramUnlink={doTelegramUnlink}
              onTelegramMerge={doTelegramMerge}
              onUpdateProfile={doUpdateProfile}
              onChangePassword={doChangePassword}
              onSetEmail={doSetEmail}
            />
          </Suspense>
        );

      case 'delivery':
        return (
          <Suspense fallback={<PageLoader />}>
            <DeliveryPage onNavigate={navigate} />
          </Suspense>
        );

      case 'privacy':
        return (
          <Suspense fallback={<PageLoader />}>
            <PrivacyPage onNavigate={navigate} />
          </Suspense>
        );

      case 'offer':
        return (
          <Suspense fallback={<PageLoader />}>
            <OfferPage onNavigate={navigate} />
          </Suspense>
        );

      case 'about':
        return (
          <Suspense fallback={<PageLoader />}>
            <AboutPage onNavigate={navigate} />
          </Suspense>
        );

      case 'notfound':
        return (
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage onNavigate={navigate} />
          </Suspense>
        );

      default:
        return (
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage onNavigate={navigate} />
          </Suspense>
        );
    }
  };

  return (
    <>
      <div className="page">
        <Header {...headerProps} />

        {renderPageContent()}

        <AuthModal
          isOpen={authModalOpen}
          onClose={closeAuth}
          onLogin={doLogin}
          onRegister={doRegister}
          onTelegramLogin={doTelegramLogin}
          auth={auth}
          initialMode={authMode}
        />

        <ToastStack toasts={toasts} onClose={handleCloseToast} />

        {showScrollTop && (route.name === 'home' || route.name === 'catalog') && (
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
