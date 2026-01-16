import React, { useEffect } from 'react';
import { Home, Phone, MessageCircle, Leaf } from 'lucide-react';

type Props = {
  onNavigate: (path: string) => void;
};

export const NotFoundPage: React.FC<Props> = ({ onNavigate }) => {
  // Добавляем noindex для 404 страницы (SEO)
  useEffect(() => {
    const metaRobots = document.querySelector('meta[name="robots"]');
    const originalContent = metaRobots?.getAttribute('content') || '';
    
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    }
    
    return () => {
      if (metaRobots && originalContent) {
        metaRobots.setAttribute('content', originalContent);
      }
    };
  }, []);

  return (
    <main className="not-found-page">
      <div className="not-found-page__hero">
        <div className="not-found-page__icon">
          <Leaf size={64} />
        </div>
        <h1 className="not-found-page__title">404</h1>
        <p className="not-found-page__subtitle">Страница не найдена</p>
        <p className="not-found-page__description">
          Возможно, страница была удалена, перемещена или вы перешли по неверной ссылке.
          Но не переживайте — у нас есть много интересного чая для вас!
        </p>
        
        <div className="not-found-page__actions">
          <button 
            className="not-found-page__btn not-found-page__btn--primary"
            onClick={() => onNavigate('/')}
          >
            <Home size={20} />
            На главную
          </button>
        </div>
      </div>

      <section className="not-found-page__help">
        <h2 className="not-found-page__section-title">Нужна помощь?</h2>
        <p className="not-found-page__section-desc">
          Свяжитесь с нами — поможем подобрать чай или ответим на любые вопросы
        </p>
        
        <div className="not-found-page__contacts">
          <a href="tel:+79953257119" className="not-found-page__contact-link">
            <Phone size={20} />
            +7 (995) 325-71-19
          </a>
          <a 
            href="https://t.me/zavarka39" 
            target="_blank" 
            rel="noopener noreferrer"
            className="not-found-page__contact-link"
          >
            <MessageCircle size={20} />
            Telegram: @zavarka39
          </a>
        </div>
      </section>
    </main>
  );
};
