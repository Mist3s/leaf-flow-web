import React from 'react';
import ReactMarkdown from 'react-markdown';

type Props = {
  content: string;
  className?: string;
};

/**
 * Компонент для рендеринга Markdown-контента
 * Поддерживает: заголовки, списки, жирный/курсив, ссылки, code, цитаты, изображения
 */
export const MarkdownContent: React.FC<Props> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown
        components={{
          // Открывать ссылки в новой вкладке
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

