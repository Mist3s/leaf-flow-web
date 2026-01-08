import React, { useState, useEffect } from 'react';
import { LogIn, Moon, ShoppingBag, Sun, UserRound, Search, X, Loader2, Sparkles, Send } from 'lucide-react';
import { UserProfile } from '../types/auth';

const PROMO_KEY = 'promo_bar_dismissed';
const TELEGRAM_APP_URL = 'https://t.me/zavarka39_bot?startapp';

type Props = {
  theme: 'light' | 'dark';
  cartCount: number;
  user: UserProfile | null;
  authLoading?: boolean;
  search?: string;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
  onToggleTheme: () => void;
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
};

export const Header: React.FC<Props> = ({
  theme,
  cartCount,
  user,
  authLoading = false,
  search = '',
  showSearch = false,
  onSearchChange,
  onToggleTheme,
  onNavigate,
  onOpenAuth,
  onLogout,
}) => {
  const [promoVisible, setPromoVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(PROMO_KEY);
    if (!dismissed) {
      setPromoVisible(true);
    }
  }, []);

  const dismissPromo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPromoVisible(false);
    localStorage.setItem(PROMO_KEY, 'true');
  };

  return (
    <header className="header">
      <div className="header__left">
        <button className="header__brand" onClick={() => onNavigate('/')} aria-label="Главная">
          <img src="/logo.png" alt="Zavarka39" className="header__brand-logo" />
          <span className="header__brand-name">Zavarka39</span>
        </button>
      </div>

      {/* Промо-блок в центре */}
      {promoVisible && (
        <a href={TELEGRAM_APP_URL} target="_blank" rel="noopener noreferrer" className="header__promo">
          <Sparkles size={12} className="header__promo-icon" />
          <strong className="header__promo-discount">−10%</strong>
          <span className="header__promo-text">на первый заказ в</span>
          <span className="header__promo-tg">
            <Send size={10} />
            Telegram
          </span>
          <button className="header__promo-close" onClick={dismissPromo} aria-label="Закрыть">
            <X size={12} />
          </button>
        </a>
      )}

      {showSearch && (
        <div className="header__search">
          <Search size={18} className="header__search-icon" />
          <input
            className="header__search-input"
            type="search"
            placeholder="Поиск чая..."
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          {search && (
            <button
              className="header__search-clear"
              onClick={() => onSearchChange?.('')}
              aria-label="Очистить поиск"
            >
              <X size={16} />
    </button>
          )}
        </div>
      )}

      <div className="header__right">
        <button className="header__action header__action--theme" onClick={onToggleTheme} aria-label="Сменить тему">
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

        {authLoading ? (
          <div className="header__auth-loading">
            <Loader2 size={18} className="header__auth-spinner" />
          </div>
        ) : user ? (
          <button className="header__user" onClick={() => onNavigate('/profile')}>
            <UserRound size={16} />
            <span className="header__user-name">{user.firstName || 'Профиль'}</span>
          </button>
      ) : (
          <button className="header__action header__action--login" onClick={onOpenAuth}>
            <LogIn size={18} />
            <span className="header__action-label">Войти</span>
        </button>
      )}

        <button className="header__cart" onClick={() => onNavigate('/cart')}>
          <ShoppingBag size={18} />
          <span className="header__cart-label">Корзина</span>
          {cartCount > 0 && <span className="header__cart-badge">{cartCount}</span>}
      </button>
    </div>
  </header>
);
};
