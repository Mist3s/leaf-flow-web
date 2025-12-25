import { useEffect, useState } from 'react';

const THEME_KEY = 'zavarka-theme';
export type Theme = 'light' | 'dark';

export const useTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return saved || (prefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  return [theme, toggle];
};
