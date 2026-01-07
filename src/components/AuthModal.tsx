import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, Sparkles } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { email: string; password: string; firstName: string; lastName?: string | null }) => Promise<void>;
  auth: { loading: boolean; error: string | null };
  initialMode?: 'login' | 'register';
};

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  auth,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setForm({ email: '', password: '', firstName: '', lastName: '' });
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await onLogin({ email: form.email, password: form.password });
      } else {
        await onRegister({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName || null,
        });
      }
      handleClose();
    } catch (err) {
      setError(auth.error || 'Не удалось выполнить запрос. Проверьте данные.');
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`modal-backdrop ${isClosing ? 'modal-backdrop--closing' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className={`modal ${isClosing ? 'modal--closing' : ''}`}
      >
        <button
          className="modal__close"
          onClick={handleClose}
          aria-label="Закрыть"
          type="button"
        >
          <X size={20} />
        </button>

        <div className="modal__header">
          <div className="modal__icon">
            <Sparkles size={24} />
          </div>
          <h2 id="auth-modal-title" className="modal__title">
            {mode === 'login' ? 'Добро пожаловать!' : 'Создать аккаунт'}
          </h2>
          <p className="modal__subtitle">
            {mode === 'login'
              ? 'Войдите, чтобы сохранить корзину и заказы'
              : 'Зарегистрируйтесь для доступа ко всем функциям'}
          </p>
        </div>

        <div className="modal__tabs">
          <button
            type="button"
            className={`modal__tab ${mode === 'login' ? 'modal__tab--active' : ''}`}
            onClick={() => setMode('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={`modal__tab ${mode === 'register' ? 'modal__tab--active' : ''}`}
            onClick={() => setMode('register')}
          >
            Регистрация
          </button>
        </div>

        <form className="modal__form" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div className="modal__field">
                <label className="modal__label" htmlFor="auth-firstName">
                  <User size={16} />
                  Имя
                </label>
                <input
                  ref={firstInputRef}
                  id="auth-firstName"
                  className="modal__input"
                  type="text"
                  required
                  placeholder="Как вас зовут?"
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>

              <div className="modal__field">
                <label className="modal__label" htmlFor="auth-lastName">
                  <User size={16} />
                  Фамилия
                  <span className="modal__optional">(необязательно)</span>
                </label>
                <input
                  id="auth-lastName"
                  className="modal__input"
                  type="text"
                  placeholder="Ваша фамилия"
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </>
          )}

          <div className="modal__field">
            <label className="modal__label" htmlFor="auth-email">
              <Mail size={16} />
              Email
            </label>
            <input
              ref={mode === 'login' ? firstInputRef : undefined}
              id="auth-email"
              className="modal__input"
              type="email"
              required
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label" htmlFor="auth-password">
              <Lock size={16} />
              Пароль
            </label>
            <input
              id="auth-password"
              className="modal__input"
              type="password"
              required
              minLength={8}
              placeholder="Минимум 8 символов"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </div>

          {(error || auth.error) && (
            <div className="modal__error">
              {error || auth.error}
            </div>
          )}

          <button
            className="modal__submit"
            type="submit"
            disabled={auth.loading}
          >
            {auth.loading ? (
              <span className="modal__spinner" />
            ) : mode === 'login' ? (
              'Войти'
            ) : (
              'Зарегистрироваться'
            )}
          </button>

          <p className="modal__footer-text">
            {mode === 'login' ? (
              <>
                Нет аккаунта?{' '}
                <button type="button" className="modal__link" onClick={() => setMode('register')}>
                  Создайте его
                </button>
              </>
            ) : (
              <>
                Уже есть аккаунт?{' '}
                <button type="button" className="modal__link" onClick={() => setMode('login')}>
                  Войдите
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

