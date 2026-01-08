import React from 'react';
import { ArrowLeft, Truck, Store, CreditCard, Banknote, Clock, MapPin, Phone } from 'lucide-react';

type Props = {
  onNavigate: (path: string) => void;
};

export const DeliveryPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <main className="info-page">
      <button className="info-page__back" onClick={() => onNavigate('/')}>
        <ArrowLeft size={20} />
        <span>На главную</span>
      </button>

      <h1 className="info-page__title">Доставка и оплата</h1>

      <div className="info-page__content">
        <section className="info-section">
          <h2 className="info-section__title">
            <Truck size={24} />
            Способы доставки
          </h2>
          
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card__icon">
                <Store size={32} />
              </div>
              <h3 className="info-card__title">Самовывоз</h3>
              <p className="info-card__text">
                Бесплатно. Заберите заказ по адресу в г. Калининграде. 
                Точный адрес сообщим после оформления заказа.
              </p>
              <div className="info-card__detail">
                <Clock size={16} />
                <span>Готовность: в течение 1-2 часов</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card__icon">
                <Truck size={32} />
              </div>
              <h3 className="info-card__title">Курьерская доставка</h3>
              <p className="info-card__text">
                Доставка по Калининграду и области. Стоимость рассчитывается 
                индивидуально в зависимости от адреса.
              </p>
              <div className="info-card__detail">
                <Clock size={16} />
                <span>Срок: 1-3 рабочих дня</span>
              </div>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2 className="info-section__title">
            <CreditCard size={24} />
            Способы оплаты
          </h2>

          <div className="info-cards">
            <div className="info-card">
              <div className="info-card__icon">
                <Banknote size={32} />
              </div>
              <h3 className="info-card__title">Наличными</h3>
              <p className="info-card__text">
                Оплата наличными при получении заказа курьеру или при самовывозе.
              </p>
            </div>

            <div className="info-card">
              <div className="info-card__icon">
                <CreditCard size={32} />
              </div>
              <h3 className="info-card__title">Переводом</h3>
              <p className="info-card__text">
                Оплата переводом на карту или по СБП. Реквизиты отправим после оформления заказа.
              </p>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2 className="info-section__title">
            <MapPin size={24} />
            Зона доставки
          </h2>
          <p className="info-section__text">
            Мы осуществляем доставку по г. Калининграду и Калининградской области. 
            Для уточнения возможности доставки в ваш населённый пункт — свяжитесь с нами.
          </p>
        </section>

        <section className="info-section info-section--highlight">
          <h2 className="info-section__title">
            <Phone size={24} />
            Остались вопросы?
          </h2>
          <p className="info-section__text">
            Свяжитесь с нами любым удобным способом — мы с радостью поможем!
          </p>
          <div className="info-section__contacts">
            <a href="tel:+79953257119" className="info-link">+7 (995) 325-71-19</a>
            <a href="https://t.me/zavarka39" target="_blank" rel="noopener noreferrer" className="info-link">Telegram: @zavarka39</a>
          </div>
        </section>
      </div>
    </main>
  );
};

