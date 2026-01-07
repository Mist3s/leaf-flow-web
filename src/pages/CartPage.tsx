import React from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Package, LogIn, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { CartItem } from '../types/cart';

type Props = {
  cart: { items: CartItem[]; totalPrice: string; totalCount: number; error: string | null; loading: boolean };
  onNavigate: (path: string) => void;
  onChangeQty: (productId: string, variantId: string, quantity: number) => void;
  onRemove: (productId: string, variantId: string) => void;
  user: any;
  authLoading?: boolean;
  onOpenAuth?: () => void;
};

export const CartPage: React.FC<Props> = ({ cart, onNavigate, onChangeQty, onRemove, user, authLoading = false, onOpenAuth }) => {
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="%23f2f4f8"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="%235b6475" font-family="Inter, sans-serif" font-size="14">Нет фото</text></svg>`,
    );

  if (authLoading)
    return (
      <div className="cart-empty">
        <div className="cart-empty__icon">
          <Loader2 size={32} className="cart-empty__spinner" />
        </div>
        <h2 className="cart-empty__title">Загрузка...</h2>
        <p className="cart-empty__text">Проверяем авторизацию</p>
      </div>
    );

  if (!user)
    return (
      <div className="cart-empty">
        <div className="cart-empty__icon cart-empty__icon--auth">
          <LogIn size={32} />
        </div>
        <h2 className="cart-empty__title">Войдите в аккаунт</h2>
        <p className="cart-empty__text">Чтобы добавлять товары в корзину и оформлять заказы, необходимо авторизоваться</p>
        <button className="button" onClick={onOpenAuth ?? (() => onNavigate('/auth'))}>
          <LogIn size={18} />
          Войти в аккаунт
        </button>
      </div>
    );

  if (cart.loading)
    return (
      <div className="cart-empty">
        <div className="cart-empty__icon">
          <Loader2 size={32} className="cart-empty__spinner" />
        </div>
        <h2 className="cart-empty__title">Загрузка корзины...</h2>
        <p className="cart-empty__text">Получаем ваши товары</p>
      </div>
    );

  if (!cart.items.length)
    return (
      <div className="cart-empty">
        <div className="cart-empty__icon">
          <ShoppingBag size={32} />
        </div>
        <h2 className="cart-empty__title">Корзина пуста</h2>
        <p className="cart-empty__text">Добавьте любимый чай из каталога, чтобы оформить заказ</p>
        <button className="button" onClick={() => onNavigate('/')}>
          <Package size={18} />
          Перейти в каталог
        </button>
      </div>
    );

  return (
    <div className="cart-page">
      <header className="cart-header">
        <div className="cart-header__info">
          <h1 className="cart-header__title">Корзина</h1>
          <span className="cart-header__count">{cart.totalCount} {getItemsWord(cart.totalCount)}</span>
        </div>
      </header>

      {cart.error && <div className="alert danger">{cart.error}</div>}

      <div className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item, index) => (
            <article
              key={`${item.productId}:${item.variantId}`}
              className="cart-item"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="cart-item__media">
                <img src={item.image || placeholder} alt={item.productName} loading="lazy" />
              </div>

              <div className="cart-item__body">
                <div className="cart-item__top">
                  <div className="cart-item__info">
                    <h3 className="cart-item__name">{item.productName}</h3>
                    <span className="cart-item__variant">{item.variantLabel}</span>
                  </div>
                  <button
                    className="cart-item__remove"
                    onClick={() => onRemove(item.productId, item.variantId)}
                    aria-label="Удалить товар"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="cart-item__bottom">
                  <div className="cart-qty">
                    <button
                      className="cart-qty__btn"
                      onClick={() => onChangeQty(item.productId, item.variantId, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                      aria-label="Уменьшить количество"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      className="cart-qty__input"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => onChangeQty(item.productId, item.variantId, Math.max(1, Number(e.target.value) || 1))}
                      aria-label="Количество"
                    />
                    <button
                      className="cart-qty__btn"
                      onClick={() => onChangeQty(item.productId, item.variantId, item.quantity + 1)}
                      aria-label="Увеличить количество"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="cart-item__pricing">
                    <span className="cart-item__unit-price">{formatCurrency(item.price)} / шт</span>
                    <strong className="cart-item__total">{formatCurrency(parseFloat(item.price) * item.quantity)}</strong>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-summary">
          <div className="cart-summary__card">
            <h3 className="cart-summary__title">Ваш заказ</h3>

            <div className="cart-summary__rows">
              <div className="cart-summary__row">
                <span className="cart-summary__label">Товары ({cart.totalCount})</span>
                <span className="cart-summary__value">{formatCurrency(cart.totalPrice)}</span>
              </div>
              <div className="cart-summary__row">
                <span className="cart-summary__label">Доставка</span>
                <span className="cart-summary__value cart-summary__value--accent">Рассчитаем при оформлении</span>
              </div>
            </div>

            <div className="cart-summary__divider" />

            <div className="cart-summary__total">
              <span className="cart-summary__total-label">Итого</span>
              <span className="cart-summary__total-value">{formatCurrency(cart.totalPrice)}</span>
            </div>

            <button className="cart-summary__btn" onClick={() => onNavigate('/checkout')}>
              Оформить заказ
              <ArrowRight size={18} />
            </button>

            <p className="cart-summary__note">
              Нажимая «Оформить заказ», вы соглашаетесь с условиями продажи
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="cart-mobile-bar">
        <div className="cart-mobile-bar__info">
          <span className="cart-mobile-bar__label">Итого</span>
          <strong className="cart-mobile-bar__total">{formatCurrency(cart.totalPrice)}</strong>
        </div>
        <button className="cart-mobile-bar__btn" onClick={() => onNavigate('/checkout')}>
          Оформить
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

function getItemsWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return 'товаров';
  if (lastOne === 1) return 'товар';
  if (lastOne >= 2 && lastOne <= 4) return 'товара';
  return 'товаров';
}
