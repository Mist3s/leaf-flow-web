import React from 'react';

/**
 * Regex для разбивки текста на URL-сегменты.
 * Используем capturing group в split — URL попадают в чётные позиции.
 */
const URL_SPLIT = /((?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b(?:[-a-zA-Z0-9@:%_+.~#?&/=]*))/gi;

/** Без global-флага — для проверки отдельного фрагмента */
const URL_TEST = /^(?:https?:\/\/|www\.)/i;

/** Элемент после разбора текста: текстовый фрагмент или ссылка */
export type TextSegment =
    | { kind: 'text'; value: string }
    | { kind: 'link'; url: string; display: string };

/**
 * Разбивает сырой текст на сегменты текста и ссылок.
 * Чистая функция без UI-зависимостей.
 */
export function parseLinks(text: string): TextSegment[] {
    const parts = text.split(URL_SPLIT);
    const segments: TextSegment[] = [];

    for (const part of parts) {
        if (!part) continue;

        if (URL_TEST.test(part)) {
            const url = part.startsWith('http') ? part : `https://${part}`;
            segments.push({ kind: 'link', url, display: part });
        } else {
            segments.push({ kind: 'text', value: part });
        }
    }

    return segments;
}

/**
 * Проверяет, состоит ли сообщение **только** из ссылок (без текста).
 * Используется для: показать карточку без дублирования текста.
 */
export function isLinkOnly(text: string | null | undefined): boolean {
    if (!text) return false;
    const segments = parseLinks(text.trim());
    return segments.length > 0 && segments.every(
        s => s.kind === 'link' || (s.kind === 'text' && s.value.trim() === '')
    );
}

/**
 * Рендерит текст с кликабельными ссылками.
 * Ссылки открываются в новой вкладке с rel="noopener noreferrer".
 */
export function renderLinkedText(text: string): React.ReactNode[] {
    const segments = parseLinks(text);

    if (segments.length === 1 && segments[0].kind === 'text') {
        return [text];
    }

    return segments.map((seg, i) => {
        if (seg.kind === 'text') {
            return <React.Fragment key={i}>{seg.value}</React.Fragment>;
        }

        return (
            <a
                key={i}
                href={seg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="chat-link"
            >
                {seg.display}
            </a>
        );
    });
}
