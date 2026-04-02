/**
 * Конфигурация приложения
 * Все URL, ключи и константы в одном месте
 */

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════
// export const API_BASE_URL = 'https://app-stage.zavarka39.ru/api';
export const API_BASE_URL = 'https://app.zavarka39.ru/api';
export const IMAGE_BASE_URL = 'https://app.zavarka39.ru';

// ═══════════════════════════════════════════════════════════════════════════
// Чат (WebSocket)
// ═══════════════════════════════════════════════════════════════════════════

export const WS_URL = 'wss://chat.zavarka39.ru/ws/chat';
export const CHAT_API_URL = 'https://chat.zavarka39.ru/api';

// ═══════════════════════════════════════════════════════════════════════════
// Сайт
// ═══════════════════════════════════════════════════════════════════════════

export const SITE_URL = 'https://zavarka39.ru';

// ═══════════════════════════════════════════════════════════════════════════
// Telegram
// ═══════════════════════════════════════════════════════════════════════════

/** Username бота для Telegram Login Widget (без @) */
// export const TELEGRAM_BOT_NAME = 'z39stage_bot';
export const TELEGRAM_BOT_NAME = 'Zavarka39_bot';

/** Ссылка на Telegram Mini App */
export const TELEGRAM_APP_URL = 'https://t.me/Zavarka39_bot?startapp';

// ═══════════════════════════════════════════════════════════════════════════
// LocalStorage ключи
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_KEYS = {
  AUTH: 'zavarka-auth',
  THEME: 'zavarka-theme',
  PROMO_DISMISSED: 'promo_bar_dismissed',
} as const;

