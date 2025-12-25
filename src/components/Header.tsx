import { LogIn, LogOut, Moon, ShoppingBag, Sun, UserRound, CupSoda } from 'lucide-react';
import { UserProfile } from '../types/auth';

type Props = {
  theme: 'light' | 'dark';
  cartCount: number;
  user: UserProfile | null;
  onToggleTheme: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
};

export const Header: React.FC<Props> = ({ theme, cartCount, user, onToggleTheme, onNavigate, onLogout }) => (
  <header className="nav">
    <button className="brand" onClick={() => onNavigate('/')} aria-label="Главная">
      <span className="brand-badge">
        <CupSoda size={22} />
      </span>
      Zavarka39
    </button>
    <div className="nav-actions">
      <button className="pill" onClick={onToggleTheme}>
        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        {theme === 'dark' ? 'Тёмная' : 'Светлая'}
      </button>
      {user ? (
        <>
          <span className="nav-user">
            <UserRound size={16} />
            {user.firstName || 'Профиль'}
          </span>
          <button className="pill" onClick={onLogout}>
            <LogOut size={16} />
            Выйти
          </button>
        </>
      ) : (
        <button className="pill" onClick={() => onNavigate('/auth')}>
          <LogIn size={16} />
          Войти
        </button>
      )}
      <button className="pill" onClick={() => onNavigate('/cart')}>
        <ShoppingBag size={16} />
        Корзина
        <span className="badge">{cartCount}</span>
      </button>
    </div>
  </header>
);
