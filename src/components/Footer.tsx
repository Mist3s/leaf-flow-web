import React, { useCallback, memo, useMemo } from 'react';
import { Phone, Send, Truck, FileText, Shield, Info } from 'lucide-react';

type Props = {
  onNavigate: (path: string) => void;
};

export const Footer: React.FC<Props> = memo(({ onNavigate }) => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleDeliveryClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('/delivery/');
  }, [onNavigate]);

  const handlePrivacyClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('/privacy/');
  }, [onNavigate]);

  const handleOfferClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('/offer/');
  }, [onNavigate]);

  const handleAboutClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('/about/');
  }, [onNavigate]);

  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="footer__links">
          <a href="/delivery/" onClick={handleDeliveryClick}>
            <Truck size={14} />
            Доставка и оплата
          </a>
          <a href="/privacy/" onClick={handlePrivacyClick}>
            <Shield size={14} />
            Конфиденциальность
          </a>
          <a href="/offer/" onClick={handleOfferClick}>
            <FileText size={14} />
            Оферта
          </a>
          <a href="/about/" onClick={handleAboutClick}>
            <Info size={14} />
            О нас
          </a>
        </div>

        <div className="footer__contacts">
          <a href="tel:+79953257119">
            <Phone size={14} />
            +7 (995) 325-71-19
          </a>
          <a href="https://t.me/zavarka39" target="_blank" rel="noopener noreferrer">
            <Send size={14} />
            Telegram
          </a>
        </div>
      </div>

      <div className="footer__bottom">
        <span className="footer__copyright">© {currentYear} Zavarka39</span>
        <span className="footer__legal">Самозанятый · Иванов Андрей Алексеевич · ИНН 391802670913</span>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
