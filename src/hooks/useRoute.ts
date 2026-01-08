import { useEffect, useState } from 'react';

type Route =
  | { name: 'home'; params: {} }
  | { name: 'product'; params: { id: string } }
  | { name: 'cart'; params: {} }
  | { name: 'checkout'; params: {} }
  | { name: 'profile'; params: {} }
  | { name: 'auth'; params: {} }
  | { name: 'delivery'; params: {} }
  | { name: 'privacy'; params: {} }
  | { name: 'offer'; params: {} };

const parseRoute = (): Route => {
  const path = window.location.pathname || '/';
  if (path === '/' || path === '') return { name: 'home', params: {} };
  if (path === '/cart') return { name: 'cart', params: {} };
  if (path === '/checkout') return { name: 'checkout', params: {} };
  if (path === '/profile') return { name: 'profile', params: {} };
  if (path === '/auth') return { name: 'auth', params: {} };
  if (path === '/delivery') return { name: 'delivery', params: {} };
  if (path === '/privacy') return { name: 'privacy', params: {} };
  if (path === '/offer') return { name: 'offer', params: {} };
  const productMatch = path.match(/^\/product\/([^/]+)$/);
  if (productMatch) return { name: 'product', params: { id: productMatch[1] } };
  return { name: 'home', params: {} };
};

export const useRoute = (): [Route, (path: string) => void] => {
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', normalized);
    }
      setRoute(parseRoute());
  };

  return [route, navigate];
};
