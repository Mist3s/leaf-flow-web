import React, { useState, useEffect, memo } from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewCardProps {
    url: string;
}

/** Favicon через Google's public API (без CORS-проблем) */
const getFaviconUrl = (url: string): string => {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
    } catch {
        return '';
    }
};

/** Извлекает домен из URL для отображения */
const getDomain = (url: string): string => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

/** Укороченный путь для отображения */
const getShortPath = (url: string): string => {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname + parsed.search;
        if (path === '/' || path === '') return '';
        return path.length > 40 ? path.slice(0, 40) + '…' : path;
    } catch {
        return '';
    }
};

/**
 * Карточка превью ссылки в стиле Jira/Slack.
 *
 * Показывает:
 * - Favicon сайта (Google Favicons API)
 * - Домен + укороченный путь
 * - Иконка внешней ссылки
 *
 * Архитектурно готов принимать title из бэкенда 
 * (через расширение payload сообщения).
 */
export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = memo(({ url }) => {
    const [faviconError, setFaviconError] = useState(false);
    const faviconUrl = getFaviconUrl(url);
    const domain = getDomain(url);
    const shortPath = getShortPath(url);

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-link-preview"
        >
            <span className="chat-link-preview__icon">
                {faviconUrl && !faviconError ? (
                    <img
                        src={faviconUrl}
                        alt=""
                        width={16}
                        height={16}
                        onError={() => setFaviconError(true)}
                        loading="lazy"
                    />
                ) : (
                    <ExternalLink size={14} />
                )}
            </span>
            <span className="chat-link-preview__info">
                <span className="chat-link-preview__domain">{domain}</span>
                {shortPath && (
                    <span className="chat-link-preview__path">{shortPath}</span>
                )}
            </span>
            <ExternalLink size={12} className="chat-link-preview__external" />
        </a>
    );
});

LinkPreviewCard.displayName = 'LinkPreviewCard';
