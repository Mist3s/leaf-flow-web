import { useEffect, useState } from 'react';

type Route =
  | { name: 'home'; params: {} }
  | { name: 'product'; params: { id: string } }
  | { name: 'cart'; params: {} }
  | { name: 'checkout'; params: {} }
  | { name: 'auth'; params: {} };

const parseRoute = (): Route => {
  const path = window.location.hash.replace(/^#/, '') || '/';
  if (path === '/' || path === '') return { name: 'home', params: {} };
  if (path === '/cart') return { name: 'cart', params: {} };
  if (path === '/checkout') return { name: 'checkout', params: {} };
  if (path === '/auth') return { name: 'auth', params: {} };
  const productMatch = path.match(/^\/product\/([^/]+)$/);
  if (productMatch) return { name: 'product', params: { id: productMatch[1] } };
  return { name: 'home', params: {} };
};

export const useRoute = (): [Route, (path: string) => void] => {
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (path: string) => {
    const normalized = path.startsWith('#') ? path : `#${path}`;
    if (window.location.hash === normalized) {
      setRoute(parseRoute());
    } else {
      window.location.hash = normalized;
    }
  };

  return [route, navigate];
};
