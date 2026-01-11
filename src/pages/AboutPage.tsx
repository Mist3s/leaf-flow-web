import React from 'react';
import { ArrowLeft, Info } from 'lucide-react';

type Props = {
  onNavigate: (path: string) => void;
};

export const AboutPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <main className="info-page">
      <button className="info-page__back" onClick={() => onNavigate('/')}>
        <ArrowLeft size={20} />
        <span>На главную</span>
      </button>

      <h1 className="info-page__title">
        <Info size={32} />
        О компании Zavarka39
      </h1>

      <div className="info-page__content info-page__content--document">
        <section className="doc-section">
          <p className="doc-section__lead">
            Никаких авторских чаёв — только настоящий китайский чай.
          </p>
        </section>

        <section className="doc-section">
          <p>
            Zavarka39 — это продолжение дела, начатого задолго до появления бренда.
          </p>
          <p>
            Мы занимаемся китайским чаем с 2022 года, работая с теми же поставщиками, 
            с которыми более 20 лет сотрудничал наш отец.
          </p>
        </section>
        <section className="doc-section">
          <p>
            Он напрямую работал с производителями, отбирая чай на месте и формируя заказы.
          </p>
          <p>
            Этот подход сохранили и мы.
          </p>
        </section>

        <section className="doc-section">
          <p>
            Мы не создаём собственные коллекции и не переименовываем чай под бренд.
          </p>
          <p>
            В нашем ассортименте — китайский чай с понятным происхождением, выбранный 
            за качество сырья и традиционную технологию производства.
          </p>
        </section>

        <section className="doc-section">
          <p className="doc-section__quote">
            Zavarka39 — это не про интерпретации и легенды.
          </p>
          <p className="doc-section__quote">
            Это про уважение к чаю, его источнику и делу, которое мы продолжаем.
          </p>
        </section>
      </div>
    </main>
  );
};
