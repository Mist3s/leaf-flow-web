/**
 * Утилиты для работы с эмодзи
 *
 * Чистая бизнес-логика определения "emoji-only" сообщений
 * и размеров шрифта — без привязки к UI-фреймворку.
 */

/** Regex для разбивки текста на Unicode-эмодзи (включая ZWJ-составные, флаги, скинтон) */
const EMOJI_SPLIT =
    /(\p{Emoji_Presentation}(?:\u200D\p{Emoji_Presentation})*|\p{Emoji}\uFE0F(?:\u200D\p{Emoji}\uFE0F)*)/gu;

/**
 * Проверяет, состоит ли текст **только** из эмодзи (≤ 8 штук).
 * Паттерн Telegram: такие сообщения показываются крупно, без пузыря.
 */
export function isEmojiOnly(text: string | null | undefined): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;

    const tokens = trimmed.match(EMOJI_SPLIT);
    if (!tokens) return false;

    // Убираем все эмодзи и пробелы — если остаток пуст, значит «только эмодзи»
    const remainder = trimmed.replace(EMOJI_SPLIT, '').replace(/\s/g, '');
    return remainder.length === 0 && tokens.length <= 8;
}

/**
 * Возвращает CSS font-size в зависимости от количества эмодзи.
 * 1–3 → 40px, 4–5 → 32px, 6–8 → 28px.
 */
export function getEmojiFontSize(text: string): string {
    const tokens = text.trim().match(EMOJI_SPLIT);
    const count = tokens?.length ?? 1;
    if (count <= 3) return '40px';
    if (count <= 5) return '32px';
    return '28px';
}
