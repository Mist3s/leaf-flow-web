import { useEffect, useState } from 'react';
import { login, profile, register, setAuthTokens, getStoredTokens } from '../api';
import { AuthTokens, UserProfile } from '../types/auth';

type AuthState = {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
};

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, tokens: null, loading: false, error: null });

  useEffect(() => {
    const stored = getStoredTokens();
    if (!stored) return;
    setAuthTokens(stored);
    setAuth((p) => ({ ...p, tokens: stored }));
    (async () => {
      try {
        setAuth((p) => ({ ...p, loading: true }));
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
    const res = await login(payload);
    setAuthTokens(res.tokens);
    setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
  };

  const doRegister = async (payload: { email: string; password: string; firstName: string; lastName?: string | null }) => {
    setAuth((p) => ({ ...p, loading: true, error: null }));
    const res = await register(payload);
    setAuthTokens(res.tokens);
    setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
  };

  const logout = () => {
    setAuthTokens(null);
    setAuth({ user: null, tokens: null, loading: false, error: null });
  };

  return { auth, doLogin, doRegister, logout };
};
