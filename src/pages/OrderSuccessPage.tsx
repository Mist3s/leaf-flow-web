import React, { useEffect } from 'react';
import { CheckCircle, Package, Truck, Clock, Phone, ArrowRight, Copy, Check } from 'lucide-react';
import { formatCurrency } from '../utils/format';

type OrderSummary = {
  orderId: string;
  customerName: string;
  deliveryMethod: string;
  total: string;
};

type Props = {
  order: OrderSummary;
  onNavigate: (path: string) => void;
};

const DELIVERY_LABELS: Record<string, { label: string; icon: typeof Truck }> = {
  pickup: { label: 'Самовывоз', icon: Package },
  courier: { label: 'Курьер', icon: Truck },
  cdek: { label: 'СДЭК', icon: Truck },
};

export const OrderSuccessPage: React.FC<Props> = ({ order, onNavigate }) => {
  const [copied, setCopied] = React.useState(false);

  // Прокрутка наверх при открытии страницы
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const deliveryInfo = DELIVERY_LABELS[order.deliveryMethod] || { label: order.deliveryMethod, icon: Truck };
  const DeliveryIcon = deliveryInfo.icon;

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Не удалось скопировать', err);
    }
  };

  return (
    <div className="order-success">
      <div className="order-success__card">
        {/* Header with checkmark */}
        <div className="order-success__header">
          <div className="order-success__icon">
            <CheckCircle size={40} />
          </div>
          <h1 className="order-success__title">Заказ оформлен!</h1>
          <p className="order-success__subtitle">
            Спасибо за заказ, {order.customerName.split(' ')[0]}! Мы уже начали его обработку.
          </p>
        </div>

        {/* Order number */}
        <div className="order-success__order-id">
          <span className="order-success__order-id-label">Номер заказа</span>
          <div className="order-success__order-id-row">
            <span className="order-success__order-id-value">#{order.orderId}</span>
            <button className="order-success__copy" onClick={copyOrderId} title="Скопировать">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Order details */}
        <div className="order-success__details">
          <div className="order-success__detail">
            <div className="order-success__detail-icon">
              <DeliveryIcon size={20} />
            </div>
            <div className="order-success__detail-content">
              <span className="order-success__detail-label">Способ получения</span>
              <span className="order-success__detail-value">{deliveryInfo.label}</span>
            </div>
          </div>

          <div className="order-success__detail">
            <div className="order-success__detail-icon">
              <Clock size={20} />
            </div>
            <div className="order-success__detail-content">
              <span className="order-success__detail-label">Статус</span>
              <span className="order-success__detail-value order-success__detail-value--status">В обработке</span>
            </div>
          </div>

          <div className="order-success__detail order-success__detail--total">
            <span className="order-success__detail-label">Сумма заказа</span>
            <span className="order-success__total-value">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Next steps */}
        <div className="order-success__steps">
          <h3 className="order-success__steps-title">Что дальше?</h3>
          <div className="order-success__steps-list">
            <div className="order-success__step">
              <div className="order-success__step-number">1</div>
              <p className="order-success__step-text">Менеджер свяжется с вами для подтверждения заказа и уточнения деталей оплаты</p>
            </div>
            <div className="order-success__step">
              <div className="order-success__step-number">2</div>
              <p className="order-success__step-text">После оплаты мы подготовим ваш заказ к отправке или самовывозу</p>
            </div>
            <div className="order-success__step">
              <div className="order-success__step-number">3</div>
              <p className="order-success__step-text">Вы получите уведомление, когда заказ будет готов</p>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="order-success__contact">
          <Phone size={18} />
          <span>Вопросы по заказу? Напишите нам или позвоните</span>
        </div>
        <div className="order-success__contact-links">
          <a href="tel:+79953257119" className="order-success__contact-btn">
            <Phone size={16} />
            +7 (995) 325-71-19
          </a>
          <a href="https://t.me/zavarka39" target="_blank" rel="noopener noreferrer" className="order-success__contact-btn">
            @zavarka39
          </a>
        </div>

        {/* Actions */}
        <div className="order-success__actions">
          <button className="order-success__btn order-success__btn--primary" onClick={() => onNavigate('/')}>
            Вернуться в каталог
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

