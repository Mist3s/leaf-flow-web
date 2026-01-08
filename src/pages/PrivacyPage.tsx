import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

type Props = {
  onNavigate: (path: string) => void;
};

export const PrivacyPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <main className="info-page">
      <button className="info-page__back" onClick={() => onNavigate('/')}>
        <ArrowLeft size={20} />
        <span>На главную</span>
      </button>

      <h1 className="info-page__title">
        <Shield size={32} />
        Политика конфиденциальности
      </h1>

      <div className="info-page__content info-page__content--document">
        <p className="info-page__date">Дата вступления в силу: 01.01.2025</p>

        <section className="doc-section">
          <h2>1. Общие положения</h2>
          <p>
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты 
            персональных данных пользователей интернет-магазина Zavarka39 (далее — «Сайт»), 
            принадлежащего самозанятому Иванову Андрею Алексеевичу (ИНН 391802670913).
          </p>
          <p>
            Использование Сайта означает согласие пользователя с настоящей Политикой 
            и указанными условиями обработки персональных данных.
          </p>
        </section>

        <section className="doc-section">
          <h2>2. Какие данные мы собираем</h2>
          <p>Мы можем собирать следующие персональные данные:</p>
          <ul>
            <li>Имя и фамилия</li>
            <li>Номер телефона</li>
            <li>Адрес электронной почты</li>
            <li>Адрес доставки</li>
            <li>История заказов</li>
          </ul>
        </section>

        <section className="doc-section">
          <h2>3. Цели обработки данных</h2>
          <p>Персональные данные используются для:</p>
          <ul>
            <li>Оформления и доставки заказов</li>
            <li>Связи с покупателем по вопросам заказа</li>
            <li>Улучшения качества обслуживания</li>
            <li>Информирования об акциях и новинках (с согласия пользователя)</li>
          </ul>
        </section>

        <section className="doc-section">
          <h2>4. Защита данных</h2>
          <p>
            Мы принимаем необходимые организационные и технические меры для защиты 
            персональных данных от неправомерного доступа, изменения, раскрытия или уничтожения.
          </p>
        </section>

        <section className="doc-section">
          <h2>5. Передача данных третьим лицам</h2>
          <p>
            Мы не передаём персональные данные третьим лицам, за исключением случаев, 
            когда это необходимо для исполнения заказа (например, курьерским службам) 
            или предусмотрено законодательством РФ.
          </p>
        </section>

        <section className="doc-section">
          <h2>6. Права пользователя</h2>
          <p>Пользователь имеет право:</p>
          <ul>
            <li>Получить информацию о своих персональных данных</li>
            <li>Требовать уточнения или удаления своих данных</li>
            <li>Отозвать согласие на обработку данных</li>
          </ul>
          <p>
            Для реализации своих прав свяжитесь с нами по email: info@zavarka39.ru
          </p>
        </section>

        <section className="doc-section">
          <h2>7. Контактная информация</h2>
          <p>
            <strong>Самозанятый:</strong> Иванов Андрей Алексеевич<br />
            <strong>ИНН:</strong> 391802670913<br />
            <strong>Email:</strong> info@zavarka39.ru<br />
            <strong>Телефон:</strong> +7 (995) 325-71-19
          </p>
        </section>
      </div>
    </main>
  );
};

