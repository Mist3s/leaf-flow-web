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
      <div className="table-wrapper">
        <table className="table cart-table">
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
                      min={1}
                      value={item.quantity}
                      style={{ width: '90px' }}
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
      </div>
      <div className="row justify-between cart-summary" style={{ alignItems: 'center' }}>
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
