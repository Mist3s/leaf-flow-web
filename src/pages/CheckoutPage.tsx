import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, User, Phone, MapPin, MessageSquare, Store, Truck, Package, ShoppingBag, LogIn, CreditCard, CheckCircle2, AlertCircle, Headphones, Loader2 } from 'lucide-react';
import { formatCurrency, getImageUrl } from '../utils/format';
import { CartItem } from '../types/cart';
import { UserProfile } from '../types/auth';

type Props = {
  cart: { items: CartItem[]; totalPrice: string; totalCount: number };
  onNavigate: (path: string) => void;
  onSubmit: (payload: { customerName: string; phone: string; delivery: string; payment: string; address?: string | null; comment?: string }) => Promise<void>;
  user: UserProfile | null;
  authLoading?: boolean;
  onOpenAuth?: () => void;
};

const DELIVERY_METHODS = [
  { id: 'pickup', label: 'Самовывоз', description: 'Бесплатно', icon: Store, price: 0 },
  { id: 'courier', label: 'Курьер', description: 'Расчёт', icon: Truck, price: null },
] as const;

const PAYMENT_METHODS = [
  { id: 'manager', label: 'Обсудить с менеджером', description: 'Свяжемся для уточнения', icon: Headphones },
] as const;

// Форматирование телефона: +7 (999) 123-45-67
const formatPhoneNumber = (value: string): string => {
  // Убираем все нецифровые символы
  const digits = value.replace(/\D/g, '');
  
  // Если начинается с 8, заменяем на 7
  const normalized = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
  
  // Ограничиваем до 11 цифр (код страны + 10 цифр)
  const limited = normalized.slice(0, 11);
  
  // Форматируем
  if (limited.length === 0) return '';
  if (limited.length <= 1) return `+${limited}`;
  if (limited.length <= 4) return `+${limited[0]} (${limited.slice(1)}`;
  if (limited.length <= 7) return `+${limited[0]} (${limited.slice(1, 4)}) ${limited.slice(4)}`;
  if (limited.length <= 9) return `+${limited[0]} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`;
  return `+${limited[0]} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7, 9)}-${limited.slice(9, 11)}`;
};

// Валидация телефона: минимум 10 цифр
const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 11;
};

// Валидация имени: минимум 2 символа
const isValidName = (name: string): boolean => {
  return name.trim().length >= 2;
};

// Валидация адреса: минимум 5 символов
const isValidAddress = (address: string): boolean => {
  return address.trim().length >= 5;
};

// Получить полное имя из профиля
const getFullNameFromUser = (user: UserProfile | null): string => {
  if (!user) return '';
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.join(' ');
};

export const CheckoutPage: React.FC<Props> = ({ cart, onNavigate, onSubmit, user, authLoading = false, onOpenAuth }) => {
  const [form, setForm] = useState(() => ({
    customerName: getFullNameFromUser(user),
    phone: '',
    delivery: 'pickup',
    payment: 'manager',
    address: '',
    comment: '',
  }));

  // Обновляем имя при изменении user (например после логина)
  useEffect(() => {
    if (user && !form.customerName) {
      setForm((prev) => ({ ...prev, customerName: getFullNameFromUser(user) }));
    }
  }, [user]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" rx="8" fill="%23f2f4f8"/></svg>`,
    );

  const selectedDelivery = DELIVERY_METHODS.find((m) => m.id === form.delivery);
  const deliveryPrice = selectedDelivery?.price ?? 0;
  const totalWithDelivery = parseFloat(cart.totalPrice) + deliveryPrice;

  // Валидация полей
  const validation = useMemo(() => {
    const needsAddress = form.delivery !== 'pickup';
    return {
      customerName: isValidName(form.customerName),
      phone: isValidPhone(form.phone),
      address: needsAddress ? isValidAddress(form.address) : true,
    };
  }, [form.customerName, form.phone, form.address, form.delivery]);

  // Форма валидна, если все обязательные поля заполнены
  const isFormValid = validation.customerName && validation.phone && validation.address;

  // Помечаем поле как "тронутое" при потере фокуса
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Показывать ошибку только если поле было тронуто и невалидно
  const showError = (field: keyof typeof validation) => {
    return touched[field] && !validation[field];
  };

  if (authLoading)
    return (
      <div className="checkout-empty">
        <div className="checkout-empty__icon">
          <Loader2 size={32} className="checkout-empty__spinner" />
        </div>
        <h2 className="checkout-empty__title">Загрузка...</h2>
        <p className="checkout-empty__text">Проверяем авторизацию</p>
      </div>
    );

  if (!user)
    return (
      <div className="checkout-empty">
        <div className="checkout-empty__icon checkout-empty__icon--auth">
          <LogIn size={32} />
        </div>
        <h2 className="checkout-empty__title">Войдите в аккаунт</h2>
        <p className="checkout-empty__text">Для оформления заказа необходимо авторизоваться</p>
        <button className="button" onClick={onOpenAuth ?? (() => onNavigate('/auth/'))}>
          <LogIn size={18} />
          Войти в аккаунт
        </button>
      </div>
    );

  if (!cart.items.length)
    return (
      <div className="checkout-empty">
        <div className="checkout-empty__icon">
          <ShoppingBag size={32} />
        </div>
        <h2 className="checkout-empty__title">Корзина пуста</h2>
        <p className="checkout-empty__text">Добавьте товары в корзину, чтобы оформить заказ</p>
        <button className="button" onClick={() => onNavigate('/')}>
          <Package size={18} />
          Перейти в каталог
        </button>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Помечаем все поля как тронутые
    setTouched({ customerName: true, phone: true, address: true });

    if (!isFormValid) {
      setError('Пожалуйста, заполните все обязательные поля корректно');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await onSubmit({ ...form, address: form.delivery === 'pickup' ? null : form.address });
    } catch (err) {
      setError('Не удалось отправить заказ. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <button className="checkout-back" onClick={() => onNavigate('/cart/')}>
          <ArrowLeft size={20} />
        </button>
        <div className="checkout-header__info">
          <h1 className="checkout-header__title">Оформление заказа</h1>
          <span className="checkout-header__step">Шаг 1 из 1</span>
      </div>
      </header>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          {/* Contact Info */}
          <section className="checkout-section">
            <h2 className="checkout-section__title">
              <User size={20} />
              Контактные данные
            </h2>
            <div className="checkout-fields">
              <div className="checkout-field">
                <label className="checkout-label" htmlFor="checkout-name">
                  Имя и фамилия <span className="checkout-required">*</span>
                </label>
                <div className={`checkout-input-wrap ${showError('customerName') ? 'checkout-input-wrap--error' : ''}`}>
                  <User size={18} className="checkout-input-icon" />
            <input
                    id="checkout-name"
                    className="checkout-input"
                    type="text"
                    placeholder="Иван Иванов"
              value={form.customerName}
              onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                    onBlur={() => handleBlur('customerName')}
                  />
                  {showError('customerName') && <AlertCircle size={18} className="checkout-input-error-icon" />}
                </div>
                {user && form.customerName === getFullNameFromUser(user) && (
                  <span className="checkout-field-hint">Имя подставлено из профиля</span>
                )}
                {showError('customerName') && (
                  <span className="checkout-field-error">Введите имя (минимум 2 символа)</span>
                )}
              </div>
              <div className="checkout-field">
                <label className="checkout-label" htmlFor="checkout-phone">
                  Номер телефона <span className="checkout-required">*</span>
          </label>
                <div className={`checkout-input-wrap ${showError('phone') ? 'checkout-input-wrap--error' : ''}`}>
                  <Phone size={18} className="checkout-input-icon" />
                  <input
                    id="checkout-phone"
                    className="checkout-input"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: formatPhoneNumber(e.target.value) }))}
                    onBlur={() => handleBlur('phone')}
                  />
                  {showError('phone') && <AlertCircle size={18} className="checkout-input-error-icon" />}
                </div>
                {showError('phone') && (
                  <span className="checkout-field-error">Введите корректный номер телефона</span>
                )}
              </div>
            </div>
          </section>

          {/* Delivery */}
          <section className="checkout-section">
            <h2 className="checkout-section__title">
              <Truck size={20} />
              Способ доставки <span className="checkout-required">*</span>
            </h2>
            <div className="checkout-delivery-options">
              {DELIVERY_METHODS.map((method) => {
                const Icon = method.icon;
                const isActive = form.delivery === method.id;
                return (
                  <label
                    key={method.id}
                    className={`checkout-delivery-option ${isActive ? 'checkout-delivery-option--active' : ''}`}
                  >
                  <input
                    type="radio"
                    name="delivery"
                      value={method.id}
                      checked={isActive}
                    onChange={(e) => setForm((p) => ({ ...p, delivery: e.target.value }))}
                      className="checkout-delivery-radio"
                    />
                    <div className="checkout-delivery-icon">
                      <Icon size={22} />
                    </div>
                    <div className="checkout-delivery-info">
                      <span className="checkout-delivery-label">{method.label}</span>
                      <span className="checkout-delivery-desc">{method.description}</span>
                    </div>
                    <span className="checkout-delivery-price">
                      {method.price === 0 ? 'Бесплатно' : method.price ? formatCurrency(method.price) : 'Расчёт'}
                    </span>
                    {isActive && (
                      <CheckCircle2 size={20} className="checkout-delivery-check" />
                    )}
                </label>
                );
              })}
            </div>

            {form.delivery === 'pickup' && (
              <div className="checkout-pickup-info">
                <div className="checkout-pickup-info__icon">
                  <MapPin size={18} />
                </div>
                <div className="checkout-pickup-info__content">
                  <strong className="checkout-pickup-info__address">г. Калининград, ул. Эльблонгская, 2</strong>
                  <span className="checkout-pickup-info__hours">Ежедневно с 10:00 до 20:00, по предварительной договорённости</span>
            </div>
          </div>
            )}

          {form.delivery !== 'pickup' && (
              <div className="checkout-field" style={{ marginTop: '1rem' }}>
                <label className="checkout-label" htmlFor="checkout-address">
                  Адрес доставки <span className="checkout-required">*</span>
            </label>
                <div className={`checkout-input-wrap ${showError('address') ? 'checkout-input-wrap--error' : ''}`}>
                  <MapPin size={18} className="checkout-input-icon" />
                  <input
                    id="checkout-address"
                    className="checkout-input"
                    type="text"
                    placeholder="Город, улица, дом, квартира"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    onBlur={() => handleBlur('address')}
                  />
                  {showError('address') && <AlertCircle size={18} className="checkout-input-error-icon" />}
                </div>
                {showError('address') && (
                  <span className="checkout-field-error">Введите адрес доставки (минимум 5 символов)</span>
                )}
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="checkout-section">
            <h2 className="checkout-section__title">
              <CreditCard size={20} />
              Способ оплаты <span className="checkout-required">*</span>
            </h2>
            <div className="checkout-payment-options">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isActive = form.payment === method.id;
                return (
                  <label
                    key={method.id}
                    className={`checkout-payment-option ${isActive ? 'checkout-payment-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={isActive}
                      onChange={(e) => setForm((p) => ({ ...p, payment: e.target.value }))}
                      className="checkout-payment-radio"
                    />
                    <div className="checkout-payment-icon">
                      <Icon size={22} />
                    </div>
                    <div className="checkout-payment-info">
                      <span className="checkout-payment-label">{method.label}</span>
                      <span className="checkout-payment-desc">{method.description}</span>
                    </div>
                    {isActive && (
                      <CheckCircle2 size={20} className="checkout-payment-check" />
                    )}
                  </label>
                );
              })}
            </div>
            <p className="checkout-payment-note">
              После оформления заказа менеджер свяжется с вами для согласования способа оплаты
            </p>
          </section>

          {/* Comment */}
          <section className="checkout-section">
            <h2 className="checkout-section__title">
              <MessageSquare size={20} />
              Комментарий
              <span className="checkout-section__optional">(необязательно)</span>
            </h2>
            <textarea
              className="checkout-textarea"
              rows={3}
              placeholder="Пожелания к заказу, удобное время доставки..."
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            />
          </section>

          {error && <div className="checkout-error">{error}</div>}

          {/* Mobile Submit */}
          <div className="checkout-mobile-submit">
            <div className="checkout-mobile-total">
              <span className="checkout-mobile-total__label">Итого</span>
              <strong className="checkout-mobile-total__value">{formatCurrency(totalWithDelivery)}</strong>
            </div>
            <button className="checkout-submit" type="submit" disabled={sending || !isFormValid}>
              {sending ? (
                <span className="checkout-spinner" />
              ) : (
                <>
                  <CreditCard size={18} />
                  Оформить заказ
                </>
              )}
            </button>
          </div>
        </form>

        {/* Order Summary Sidebar */}
        <aside className="checkout-summary">
          <div className="checkout-summary__card">
            <h3 className="checkout-summary__title">Ваш заказ</h3>

            <div className="checkout-summary__items">
              {cart.items.map((item) => (
                <div key={`${item.productId}:${item.variantId}`} className="checkout-summary__item">
                  <img
                    src={getImageUrl(item.image) || placeholder}
                    alt={item.productName}
                    className="checkout-summary__item-img"
                  />
                  <div className="checkout-summary__item-info">
                    <span className="checkout-summary__item-name">{item.productName}</span>
                    <span className="checkout-summary__item-variant">{item.variantWeight}</span>
                  </div>
                  <div className="checkout-summary__item-right">
                    <span className="checkout-summary__item-qty">× {item.quantity}</span>
                    <span className="checkout-summary__item-price">{formatCurrency(parseFloat(item.price) * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-summary__divider" />

            <div className="checkout-summary__rows">
              <div className="checkout-summary__row">
                <span>Товары ({cart.totalCount})</span>
                <span>{formatCurrency(cart.totalPrice)}</span>
      </div>
              <div className="checkout-summary__row">
                <span>Доставка</span>
                <span className={deliveryPrice === 0 ? 'checkout-summary__free' : ''}>
                  {selectedDelivery?.price === null ? 'Рассчитаем' : deliveryPrice === 0 ? 'Бесплатно' : formatCurrency(deliveryPrice)}
              </span>
              </div>
            </div>

            <div className="checkout-summary__divider" />

            <div className="checkout-summary__total">
              <span>Итого</span>
              <strong>{formatCurrency(totalWithDelivery)}</strong>
            </div>

            <button
              className="checkout-summary__btn"
              type="submit"
              form="checkout-form"
              disabled={sending || !isFormValid}
              onClick={submit}
            >
              {sending ? (
                <span className="checkout-spinner" />
              ) : (
                <>
                  <CreditCard size={18} />
                  Оформить заказ
                </>
              )}
            </button>

            {!isFormValid && (
              <p className="checkout-summary__validation">
                <AlertCircle size={14} />
                Заполните обязательные поля
              </p>
            )}

            <p className="checkout-summary__note">
              Нажимая «Оформить заказ», вы соглашаетесь с условиями продажи и политикой конфиденциальности
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
