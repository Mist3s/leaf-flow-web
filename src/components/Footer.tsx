import React from 'react';
import { Phone, Send, Truck, FileText, Shield } from 'lucide-react';

type Props = {
  onNavigate: (path: string) => void;
};

export const Footer: React.FC<Props> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="footer__links">
          <a href="/delivery" onClick={(e) => handleLinkClick(e, '/delivery')}>
            <Truck size={14} />
            Доставка и оплата
          </a>
          <a href="/privacy" onClick={(e) => handleLinkClick(e, '/privacy')}>
            <Shield size={14} />
            Конфиденциальность
          </a>
          <a href="/offer" onClick={(e) => handleLinkClick(e, '/offer')}>
            <FileText size={14} />
            Оферта
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
};
