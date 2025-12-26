import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { CartItem } from '../types/cart';

type Props = {
  cart: { items: CartItem[]; totalPrice: string; totalCount: number };
  onNavigate: (path: string) => void;
  onSubmit: (payload: { customerName: string; phone: string; delivery: string; address?: string | null; comment?: string }) => Promise<void>;
  user: any;
};

export const CheckoutPage: React.FC<Props> = ({ cart, onNavigate, onSubmit, user }) => {
  const [form, setForm] = useState({ customerName: '', phone: '', delivery: 'pickup', address: '', comment: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user)
    return (
      <div className="surface stack" style={{ alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0 }}>Только для авторизованных</h2>
        <p className="muted">Войдите, чтобы оформить заказ.</p>
        <button className="button" onClick={() => onNavigate('/auth')}>
          Перейти к входу
        </button>
      </div>
    );

  if (!cart.items.length)
    return (
      <div className="surface stack">
        <h2 style={{ margin: 0 }}>Корзина пуста</h2>
        <button className="button" onClick={() => onNavigate('/')}>
          К каталогу
        </button>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
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

  return (
    <div className="stack">
      <div className="row checkout-header" style={{ gap: '0.75rem' }}>
        <button className="pill" onClick={() => onNavigate('/cart')}>
          <ArrowLeft size={16} /> Назад
        </button>
        <h2 style={{ margin: 0 }}>Оформление заказа</h2>
      </div>
      <div className="section surface">
        <form className="stack" onSubmit={submit}>
          <label className="stack">
            <span className="muted">Имя и фамилия</span>
            <input
              className="input"
              required
              value={form.customerName}
              onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
            />
          </label>
          <label className="stack">
            <span className="muted">Телефон</span>
            <input className="input" required value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
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
                    onChange={(e) => setForm((p) => ({ ...p, delivery: e.target.value }))}
                  />{' '}
                  {method === 'pickup' ? 'Самовывоз' : method === 'courier' ? 'Курьер' : 'СДЭК'}
                </label>
              ))}
            </div>
          </div>
          {form.delivery !== 'pickup' && (
            <label className="stack">
              <span className="muted">Адрес</span>
              <input className="input" required value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </label>
          )}
          <label className="stack">
            <span className="muted">Комментарий</span>
            <textarea
              className="input"
              rows={3}
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            />
          </label>
          <hr className="divider" />
          <div className="row justify-between checkout-footer" style={{ alignItems: 'center' }}>
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
};
