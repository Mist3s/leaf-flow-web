import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

type Props = {
  onNavigate: (path: string) => void;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { email: string; password: string; firstName: string; lastName?: string | null }) => Promise<void>;
  auth: { loading: boolean; error: string | null };
};

export const AuthPage: React.FC<Props> = ({ onNavigate, onLogin, onRegister, auth }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState<string | null>(null);

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
      onNavigate('/');
    } catch (err) {
      setError('Не удалось выполнить запрос. Проверьте данные.');
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ gap: '0.5rem' }}>
        <button className="pill" onClick={() => onNavigate('/')}>
          <ArrowLeft size={16} /> Назад
        </button>
        <h2 style={{ margin: 0 }}>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
      </div>
      <div className="surface">
        <div className="row" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`pill ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
            Войти
          </button>
          <button className={`pill ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
            Создать аккаунт
          </button>
        </div>
        <form className="stack" onSubmit={submit}>
          {mode === 'register' && (
            <label className="stack">
              <span className="muted">Имя</span>
              <input
                className="input"
                required
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </label>
          )}
          <label className="stack">
            <span className="muted">Email</span>
            <input
              className="input"
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>
          <label className="stack">
            <span className="muted">Пароль</span>
            <input
              className="input"
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </label>
          {mode === 'register' && (
            <label className="stack">
              <span className="muted">Фамилия (опционально)</span>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </label>
          )}
          {error && <div className="alert danger">{error}</div>}
          <button className="button" type="submit" disabled={auth.loading}>
            {auth.loading ? 'Сохраняем...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
};
