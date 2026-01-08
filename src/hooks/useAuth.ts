import { useEffect, useState } from 'react';
import { login, profile, register, setAuthTokens, getStoredTokens } from '../api';
import { AuthTokens, UserProfile } from '../types/auth';

type AuthState = {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
};

// Проверяем токены синхронно при инициализации
const getInitialState = (): AuthState => {
  const stored = getStoredTokens();
  if (stored) {
    setAuthTokens(stored);
    return { user: null, tokens: stored, loading: true, error: null };
  }
  return { user: null, tokens: null, loading: false, error: null };
};

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>(getInitialState);

  useEffect(() => {
    // Если нет токенов - не делаем запрос
    if (!auth.tokens) return;

    // Загружаем профиль
    (async () => {
      try {
        const user = await profile();
        setAuth((p) => ({ ...p, user, loading: false }));
      } catch (error) {
        console.warn('Не удалось загрузить профиль', error);
        setAuthTokens(null);
        setAuth({ user: null, tokens: null, loading: false, error: 'Сессия истекла' });
      }
    })();
  }, []);

  const doLogin = async (payload: { email: string; password: string }) => {
    setAuth((p) => ({ ...p, loading: true, error: null }));
    try {
    const res = await login(payload);
    setAuthTokens(res.tokens);
    setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
    } catch (err: any) {
      const message = err?.message || 'Ошибка авторизации';
      setAuth((p) => ({ ...p, loading: false, error: message }));
      throw err;
    }
  };

  const doRegister = async (payload: { email: string; password: string; firstName: string; lastName?: string | null }) => {
    setAuth((p) => ({ ...p, loading: true, error: null }));
    try {
    const res = await register(payload);
    setAuthTokens(res.tokens);
    setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
    } catch (err: any) {
      const message = err?.message || 'Ошибка регистрации';
      setAuth((p) => ({ ...p, loading: false, error: message }));
      throw err;
    }
  };

  const logout = () => {
    setAuthTokens(null);
    setAuth({ user: null, tokens: null, loading: false, error: null });
  };

  return { auth, doLogin, doRegister, logout };
};
