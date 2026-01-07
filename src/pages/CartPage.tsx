import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { CartItem } from '../types/cart';

type Props = {
  cart: { items: CartItem[]; totalPrice: string; totalCount: number; error: string | null };
  onNavigate: (path: string) => void;
  onChangeQty: (productId: string, variantId: string, quantity: number) => void;
  onRemove: (productId: string, variantId: string) => void;
  user: any;
};

export const CartPage: React.FC<Props> = ({ cart, onNavigate, onChangeQty, onRemove, user }) => {
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="%23f2f4f8"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="%235b6475" font-family="Inter, sans-serif" font-size="14">Нет фото</text></svg>`,
    );

  if (!user)
    return (
      <div className="surface stack" style={{ alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0 }}>Только для авторизованных</h2>
        <p className="muted">Войдите, чтобы оформить заказ и увидеть корзину.</p>
        <button className="button" onClick={() => onNavigate('/auth')}>
          Перейти к входу
        </button>
      </div>
    );

  if (!cart.items.length)
    return (
      <div className="surface stack" style={{ alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0 }}>Корзина пуста</h2>
        <p className="muted">Добавьте чай в каталоге.</p>
        <button className="button" onClick={() => onNavigate('/')}>
          К каталогу
        </button>
      </div>
    );

  return (
    <div className="stack">
      <div className="row justify-between">
        <h2 style={{ margin: 0 }}>Корзина</h2>
        <span className="muted">{cart.items.length} позиций</span>
      </div>
      {cart.error && <div className="alert danger">{cart.error}</div>}
      <div className="cart-grid">
        {cart.items.map((item) => (
          <article key={`${item.productId}:${item.variantId}`} className="cart-card">
            <div className="cart-card__media">
              <img src={item.image || placeholder} alt={item.productName} loading="lazy" />
            </div>
            <div className="cart-card__content">
              <div className="cart-card__header">
                <div className="stack" style={{ gap: '0.15rem' }}>
                  <strong className="cart-card__title">{item.productName}</strong>
                  <span className="muted">Упаковка: {item.variantLabel}</span>
                </div>
                <button className="pill ghost" onClick={() => onRemove(item.productId, item.variantId)}>
                  Удалить
                </button>
              </div>
              <div className="cart-card__row">
                <span className="muted">Цена</span>
                <strong>{formatCurrency(item.price)}</strong>
              </div>
              <div className="cart-card__controls">
                <div className="row cart-qty">
                  <button className="pill" onClick={() => onChangeQty(item.productId, item.variantId, Math.max(1, item.quantity - 1))}>
                    <Minus size={14} />
                  </button>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={item.quantity}
                    style={{ width: '90px' }}
                    onChange={(e) => onChangeQty(item.productId, item.variantId, Math.max(1, Number(e.target.value) || 1))}
                  />
                  <button className="pill" onClick={() => onChangeQty(item.productId, item.variantId, item.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div className="stack" style={{ alignItems: 'flex-end', gap: '0.2rem' }}>
                  <span className="muted">Сумма</span>
                  <strong className="cart-card__total">{formatCurrency(parseFloat(item.price) * item.quantity)}</strong>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="row justify-between cart-summary" style={{ alignItems: 'center', gap: '1rem' }}>
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
};
