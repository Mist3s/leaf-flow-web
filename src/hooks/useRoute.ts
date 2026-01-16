import { useEffect, useState } from 'react';
import { getCategoryBySlug } from '../utils/categories';

type Route =
  | { name: 'home'; params: {} }
  | { name: 'catalog'; params: { slug: string } }
  | { name: 'product'; params: { id: string } }
  | { name: 'cart'; params: {} }
  | { name: 'checkout'; params: {} }
  | { name: 'profile'; params: {} }
  | { name: 'auth'; params: {} }
  | { name: 'delivery'; params: {} }
  | { name: 'privacy'; params: {} }
  | { name: 'offer'; params: {} }
  | { name: 'about'; params: {} }
  | { name: 'notfound'; params: {} };

const parseRoute = (): Route => {
  const path = window.location.pathname || '/';
  
  if (path === '/' || path === '') return { name: 'home', params: {} };
  if (path === '/cart' || path === '/cart/') return { name: 'cart', params: {} };
  if (path === '/checkout' || path === '/checkout/') return { name: 'checkout', params: {} };
  if (path === '/profile' || path === '/profile/') return { name: 'profile', params: {} };
  if (path === '/auth' || path === '/auth/') return { name: 'auth', params: {} };
  if (path === '/delivery' || path === '/delivery/') return { name: 'delivery', params: {} };
  if (path === '/privacy' || path === '/privacy/') return { name: 'privacy', params: {} };
  if (path === '/offer' || path === '/offer/') return { name: 'offer', params: {} };
  if (path === '/about' || path === '/about/') return { name: 'about', params: {} };
  
  // Каталог категории: /catalog/ulun/ или /catalog/shu-puer/
  // Проверяем существование категории
  const catalogMatch = path.match(/^\/catalog\/([^/]+)\/?$/);
  if (catalogMatch) {
    const slug = catalogMatch[1];
    const category = getCategoryBySlug(slug);
    if (category) {
      return { name: 'catalog', params: { slug } };
    }
    // Категория не найдена — 404
    return { name: 'notfound', params: {} };
  }
  
  // Продукт: /product/123 или /product/123/
  const productMatch = path.match(/^\/product\/([^/]+)\/?$/);
  if (productMatch) return { name: 'product', params: { id: productMatch[1] } };
  
  // Любой неизвестный путь — 404
  return { name: 'notfound', params: {} };
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
