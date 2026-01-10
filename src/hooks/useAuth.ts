import { useEffect, useState, useCallback } from 'react';
import { 
  login, 
  profile, 
  register, 
  telegramLogin, 
  telegramLink, 
  telegramUnlink, 
  telegramMerge,
  updateProfile,
  changePassword,
  setEmail,
  setAuthTokens, 
  getStoredTokens,
  UpdateProfilePayload,
  ChangePasswordPayload,
  SetEmailPayload,
} from '../api';
import { AuthTokens, UserProfile, TelegramLoginWidgetPayload } from '../types/auth';

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

  const doTelegramLogin = async (payload: TelegramLoginWidgetPayload) => {
    setAuth((p) => ({ ...p, loading: true, error: null }));
    try {
      const res = await telegramLogin(payload);
      setAuthTokens(res.tokens);
      setAuth({ user: res.user, tokens: res.tokens, loading: false, error: null });
    } catch (err: any) {
      const message = err?.message || 'Ошибка авторизации через Telegram';
      setAuth((p) => ({ ...p, loading: false, error: message }));
      throw err;
    }
  };

  // Обновить профиль пользователя в состоянии
  const updateUser = useCallback((user: UserProfile) => {
    setAuth((p) => ({ ...p, user }));
  }, []);

  // Привязать Telegram к текущему аккаунту
  const doTelegramLink = useCallback(async (payload: TelegramLoginWidgetPayload): Promise<{ success?: boolean; conflict?: boolean; error?: string }> => {
    const result = await telegramLink(payload);
    
    if (result.conflict) {
      return { conflict: true };
    }
    
    if (result.error) {
      return { error: result.error };
    }
    
    if (result.user) {
      updateUser(result.user);
      return { success: true };
    }
    
    return { error: 'Неизвестная ошибка' };
  }, [updateUser]);

  // Отвязать Telegram от аккаунта
  const doTelegramUnlink = useCallback(async (): Promise<{ success?: boolean; error?: string }> => {
    try {
      const user = await telegramUnlink();
      updateUser(user);
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'Не удалось отвязать Telegram' };
    }
  }, [updateUser]);

  // Объединить аккаунты (после 409 Conflict)
  const doTelegramMerge = useCallback(async (payload: TelegramLoginWidgetPayload): Promise<{ success?: boolean; error?: string }> => {
    try {
      const user = await telegramMerge(payload);
      updateUser(user);
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'Не удалось объединить аккаунты' };
    }
  }, [updateUser]);

  // Обновить профиль (имя, фамилия, email)
  const doUpdateProfile = useCallback(async (payload: UpdateProfilePayload): Promise<{ success?: boolean; error?: string }> => {
    try {
      const user = await updateProfile(payload);
      updateUser(user);
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'Не удалось обновить профиль' };
    }
  }, [updateUser]);

  // Изменить или создать пароль
  const doChangePassword = useCallback(async (payload: ChangePasswordPayload): Promise<{ success?: boolean; error?: string }> => {
    try {
      const user = await changePassword(payload);
      updateUser(user);
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'Не удалось изменить пароль' };
    }
  }, [updateUser]);

  // Установить email (для Telegram-пользователей без email)
  const doSetEmail = useCallback(async (payload: SetEmailPayload): Promise<{ success?: boolean; error?: string }> => {
    try {
      const user = await setEmail(payload);
      updateUser(user);
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'Не удалось установить email' };
    }
  }, [updateUser]);

  const logout = () => {
    setAuthTokens(null);
    setAuth({ user: null, tokens: null, loading: false, error: null });
  };

  return { 
    auth, 
    doLogin, 
    doRegister, 
    doTelegramLogin, 
    doTelegramLink,
    doTelegramUnlink,
    doTelegramMerge,
    doUpdateProfile,
    doChangePassword,
    doSetEmail,
    updateUser,
    logout 
  };
};
