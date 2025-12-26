import React, { useEffect, useMemo, useState } from 'react';
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

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const [route, navigate] = useRoute();
  const { auth, doLogin, doRegister, logout } = useAuth();
  const { cart, addItem, changeQuantity, removeItem, reset } = useCart(Boolean(auth.tokens));
  const [filters, setFilters] = useState({ search: '', category: '' });
  const [orderSummary, setOrderSummary] = useState<{ orderId: string; deliveryMethod: string; total: string } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addToCart = (payload: Omit<CartItem, 'productName' | 'variantLabel' | 'price'> & { price: string; productName: string; variantLabel: string }) => {
    if (!auth.user) {
      navigate('/auth');
      return;
    }
    addItem(payload);
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
        onNavigate={navigate}
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
            })
          }
          user={auth.user}
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

      {route.name === 'auth' && <AuthPage onNavigate={navigate} onLogin={doLogin} onRegister={doRegister} auth={auth} />}
    </div>
  );
};

export default App;
