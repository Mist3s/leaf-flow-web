import React from 'react';
import { LogIn, LogOut, Moon, ShoppingBag, Sun, UserRound, Search, X, Loader2 } from 'lucide-react';
import { UserProfile } from '../types/auth';

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
  return (
    <header className="header">
      <div className="header__left">
        <button className="header__brand" onClick={() => onNavigate('/')} aria-label="Главная">
          <img src="/logo.png" alt="Zavarka39" className="header__brand-logo" />
          <span className="header__brand-name">Zavarka39</span>
        </button>
      </div>

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
          <>
            <div className="header__user">
              <UserRound size={16} />
              <span className="header__user-name">{user.firstName || 'Профиль'}</span>
            </div>
            <button className="header__action" onClick={onLogout} aria-label="Выйти">
              <LogOut size={18} />
              <span className="header__action-label">Выйти</span>
            </button>
          </>
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
