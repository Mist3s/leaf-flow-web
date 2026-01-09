import React, { useEffect, useRef, useCallback, useState } from 'react';
import { TelegramLoginWidgetPayload } from '../types/auth';

// Расширяем Window для callback функции Telegram
declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth?: (user: TelegramLoginWidgetPayload) => void;
    };
  }
}

type Props = {
  botName: string;
  onAuth: (payload: TelegramLoginWidgetPayload) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  showUserPhoto?: boolean;
  lang?: string;
};

export const TelegramLoginButton: React.FC<Props> = ({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 12,
  showUserPhoto = true,
  lang = 'ru',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callbackId = useRef(`tg_login_${Date.now()}`);

  const handleAuth = useCallback((user: TelegramLoginWidgetPayload) => {
    onAuth(user);
  }, [onAuth]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Уникальное имя callback для избежания конфликтов
    const callbackName = callbackId.current;
    
    // Регистрируем глобальный callback
    (window as any)[callbackName] = (user: TelegramLoginWidgetPayload) => {
      handleAuth(user);
    };

    // Создаём скрипт виджета
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');
    if (!showUserPhoto) {
      script.setAttribute('data-userpic', 'false');
    }
    if (lang) {
      script.setAttribute('data-lang', lang);
    }

    script.onload = () => {
      setIsLoading(false);
    };

    script.onerror = () => {
      setIsLoading(false);
      setError('Не удалось загрузить виджет Telegram');
    };

    // Очищаем контейнер и добавляем скрипт
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);

    // Cleanup
    return () => {
      delete (window as any)[callbackName];
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [botName, buttonSize, cornerRadius, showUserPhoto, lang, handleAuth]);

  if (error) {
    return (
      <div className="tg-login-error">
        {error}
      </div>
    );
  }

  return (
    <div className="tg-login-wrapper">
      {isLoading && (
        <div className="tg-login-loading">
          <span className="tg-login-spinner" />
        </div>
      )}
      <div 
        ref={containerRef} 
        className={`tg-login-container ${isLoading ? 'tg-login-container--loading' : ''}`}
      />
    </div>
  );
};

