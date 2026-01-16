import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Truck, CreditCard, Phone, X, Store, Banknote, Send } from 'lucide-react';

type PopupType = 'delivery' | 'payment' | 'contact' | null;

export const ShopBadges: React.FC = memo(() => {
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Закрытие popup по клику снаружи (только для мобильных)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePopup(null);
      }
    };
    if (activePopup && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopup, isMobile]);

  // Закрытие по Escape (только для мобильных)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopup(null);
      }
    };
    if (activePopup && isMobile) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activePopup, isMobile]);

  // Блокировка скролла на мобильных при открытом popup
  useEffect(() => {
    if (isMobile && activePopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, activePopup]);

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Открытие по клику (только мобильные)
  const handleClick = useCallback((type: PopupType) => {
    if (!isMobile) return;
    setActivePopup(prev => prev === type ? null : type);
  }, [isMobile]);

  // Hover — только на десктопе
  const handleMouseEnter = useCallback((type: PopupType) => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setActivePopup(type);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    hoverTimeoutRef.current = window.setTimeout(() => {
      setActivePopup(null);
    }, 150);
  }, [isMobile]);

  // При наведении на popup — не закрываем
  const handlePopupMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    if (isMobile) return;
    hoverTimeoutRef.current = window.setTimeout(() => {
      setActivePopup(null);
    }, 150);
  }, [isMobile]);

  // Закрытие (только мобильные)
  const handleClose = useCallback(() => {
    setActivePopup(null);
  }, []);

  return (
    <div className="shop-badges" ref={containerRef}>
      <div className="shop-badges__list">
        <button 
          className={`shop-badge ${activePopup === 'delivery' ? 'shop-badge--active' : ''}`}
          onClick={() => handleClick('delivery')}
          onMouseEnter={() => handleMouseEnter('delivery')}
          onMouseLeave={handleMouseLeave}
        >
          <Truck size={14} />
          <span>Доставка</span>
        </button>
        <button 
          className={`shop-badge ${activePopup === 'payment' ? 'shop-badge--active' : ''}`}
          onClick={() => handleClick('payment')}
          onMouseEnter={() => handleMouseEnter('payment')}
          onMouseLeave={handleMouseLeave}
        >
          <CreditCard size={14} />
          <span>Оплата</span>
        </button>
        <button 
          className={`shop-badge ${activePopup === 'contact' ? 'shop-badge--active' : ''}`}
          onClick={() => handleClick('contact')}
          onMouseEnter={() => handleMouseEnter('contact')}
          onMouseLeave={handleMouseLeave}
        >
          <Phone size={14} />
          <span>Связаться</span>
        </button>
      </div>

      {activePopup && (
        <>
          {/* Overlay для мобильных */}
          {isMobile && <div className="shop-badges__overlay" onClick={handleClose} />}
          
          <div 
            className={`shop-badges__popup ${isMobile ? 'shop-badges__popup--mobile' : ''}`}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          >
            {/* Крестик только на мобильных */}
            {isMobile && (
              <button className="shop-badges__popup-close" onClick={handleClose}>
                <X size={18} />
              </button>
            )}

            {activePopup === 'delivery' && (
              <div className="shop-badges__popup-content">
                <h4 className="shop-badges__popup-title">Доставка</h4>
                <ul className="shop-badges__popup-list">
                  <li>
                    <Store size={18} />
                    <div>
                      <strong>Самовывоз — бесплатно</strong>
                      <span>ул. Эльблонгская, 2, Калининград</span>
                      <span>Ежедневно 10:00–20:00</span>
                    </div>
                  </li>
                  <li>
                    <Truck size={18} />
                    <div>
                      <strong>Курьер по Калининграду</strong>
                      <span>По тарифам Яндекс Доставки</span>
                    </div>
                  </li>
                </ul>
              </div>
            )}

            {activePopup === 'payment' && (
              <div className="shop-badges__popup-content">
                <h4 className="shop-badges__popup-title">Оплата</h4>
                <ul className="shop-badges__popup-list">
                  <li>
                    <Banknote size={18} />
                    <span>Наличными при получении</span>
                  </li>
                  <li>
                    <CreditCard size={18} />
                    <span>Переводом на карту или по СБП</span>
                  </li>
                </ul>
              </div>
            )}

            {activePopup === 'contact' && (
              <div className="shop-badges__popup-content">
                <h4 className="shop-badges__popup-title">Связаться с нами</h4>
                <p className="shop-badges__popup-subtitle">Ответим на вопросы, поможем с выбором чая</p>
                <div className="shop-badges__popup-contacts">
                  <a href="tel:+79953257119" className="shop-badges__popup-contact">
                    <Phone size={18} />
                    <span>+7 (995) 325-71-19</span>
                  </a>
                  <a 
                    href="https://t.me/zavarka39_ru" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shop-badges__popup-contact"
                  >
                    <Send size={18} />
                    <span>Telegram @zavarka39_ru</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

ShopBadges.displayName = 'ShopBadges';
