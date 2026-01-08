import React from 'react';
import { Loader2 } from 'lucide-react';

type PageLoaderProps = {
  message?: string;
};

export const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Загрузка...' }) => (
  <div className="page-loader">
    <Loader2 size={32} className="page-loader__spinner" />
    <span className="page-loader__text">{message}</span>
  </div>
);

// Обёртка для использования в React.Suspense fallback
export const PageSuspenseFallback = <PageLoader />;

