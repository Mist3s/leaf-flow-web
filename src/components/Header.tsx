import React, { useState, useEffect, useCallback, memo } from 'react';
import { LogIn, Moon, ShoppingBag, Sun, UserRound, Search, X, Loader2, Sparkles, Send, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types/auth';
import { STORAGE_KEYS, TELEGRAM_APP_URL } from '../config';

type Props = {
  theme: 'light' | 'dark';
  cartCount: number;
  user: UserProfile | null;
  authLoading?: boolean;
  search?: string;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
  onToggleTheme: () => void;
  onNavigate: (path: string, scrollToTop?: boolean) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
};

export const Header: React.FC<Props> = memo(({
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
    const dismissed = localStorage.getItem(STORAGE_KEYS.PROMO_DISMISSED);
    if (!dismissed) {
      setPromoVisible(true);
    }
  }, []);

  const dismissPromo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPromoVisible(false);
    localStorage.setItem(STORAGE_KEYS.PROMO_DISMISSED, 'true');
  }, []);

  const handleBrandClick = useCallback(() => {
    onNavigate('/', true);
  }, [onNavigate]);

  const handleProfileClick = useCallback(() => {
    onNavigate('/profile/');
  }, [onNavigate]);

  const handleCartClick = useCallback(() => {
    onNavigate('/cart/');
  }, [onNavigate]);

  const handleSearchClear = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  }, [onSearchChange]);

  return (
    <header className="header">
      <div className="header__left">
        <button className="header__brand" onClick={handleBrandClick} aria-label="Главная">
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
            onChange={handleSearchInputChange}
          />
          {search && (
            <button
              className="header__search-clear"
              onClick={handleSearchClear}
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
          <button className="header__user" onClick={handleProfileClick} title="Перейти в личный кабинет">
            <UserRound size={16} />
            <span className="header__user-name">{user.firstName || 'Профиль'}</span>
            <ChevronRight size={14} className="header__user-arrow" />
          </button>
        ) : (
          <button className="header__action header__action--login" onClick={onOpenAuth}>
            <LogIn size={18} />
            <span className="header__action-label">Войти</span>
          </button>
        )}

        <button className="header__cart" onClick={handleCartClick}>
          <ShoppingBag size={18} />
          <span className="header__cart-label">Корзина</span>
          {cartCount > 0 && <span className="header__cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
