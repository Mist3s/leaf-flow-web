import { useEffect, useState, useRef, useCallback } from 'react';
import { getCart, replaceCartItems, getProduct } from '../api';
import { CartItem } from '../types/cart';
import { formatCurrency } from '../utils/format';

type CartState = {
  items: CartItem[];
  totalPrice: string;
  totalCount: number;
  error: string | null;
  loading: boolean;
};

export const useCart = (hasAuth: boolean) => {
  // Начинаем с loading: true если есть авторизация, чтобы избежать мигания "Корзина пуста"
  const [cart, setCart] = useState<CartState>(() => ({
    items: [],
    totalPrice: '0',
    totalCount: 0,
    error: null,
    loading: hasAuth,
  }));
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const pendingItemsRef = useRef<CartItem[] | null>(null);

  useEffect(() => {
    if (!hasAuth) {
      setCart({ items: [], totalPrice: '0', totalCount: 0, error: null, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      setCart((p) => ({ ...p, loading: true, error: null }));
      try {
        const remote = await getCart();
        if (cancelled) return;

        // Дозагружаем информацию о продуктах (название, фото, вес)
        const enrichedItems = await enrichCartItems(remote.items);
        if (cancelled) return;

        const computed = computeCart(enrichedItems);
        setCart({ ...computed, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setCart((p) => ({ ...p, loading: false, error: 'Не удалось загрузить корзину' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAuth]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Загружаем данные о продуктах для элементов корзины
  const enrichCartItems = async (items: CartItem[]): Promise<CartItem[]> => {
    // Получаем уникальные productId
    const uniqueProductIds = [...new Set(items.map((item) => item.productId))];

    // Загружаем все продукты параллельно
    const productsMap = new Map<string, { name: string; image?: string; variants: { id: string; weight: string; price: string }[] }>();

    await Promise.all(
      uniqueProductIds.map(async (productId) => {
        try {
          const product = await getProduct(productId);
          productsMap.set(productId, {
            name: product.name,
            image: product.image,
            variants: product.variants,
          });
        } catch (error) {
          console.warn(`Не удалось загрузить продукт ${productId}`, error);
        }
      }),
    );

    // Обогащаем элементы корзины данными о продуктах
    return items.map((item) => {
      const product = productsMap.get(item.productId);
      if (!product) {
        return {
          ...item,
          productName: item.productName || 'Товар недоступен',
          variantLabel: item.variantLabel || '',
        };
      }

      const variant = product.variants.find((v) => v.id === item.variantId);
      return {
        ...item,
        productName: item.productName || product.name,
        variantLabel: item.variantLabel || variant?.weight || '',
        image: item.image || product.image,
        price: item.price || variant?.price || '0',
      };
    });
  };

  // Debounced sync с защитой от параллельных вызовов
  const debouncedSync = useCallback(
    (items: CartItem[]) => {
      if (!hasAuth) return;

      // Сохраняем последние items для синхронизации
      pendingItemsRef.current = items;

      // Очищаем предыдущий таймер
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Если уже идёт синхронизация, просто сохраняем items и выходим
      if (isSyncingRef.current) {
        return;
      }

      // Устанавливаем debounce 300ms
      syncTimeoutRef.current = setTimeout(async () => {
        const itemsToSync = pendingItemsRef.current;
        if (!itemsToSync) return;

        isSyncingRef.current = true;
        pendingItemsRef.current = null;

        try {
          await replaceCartItems(itemsToSync.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })));
          setCart((p) => ({ ...p, error: null }));
        } catch (error) {
          console.error('Ошибка синхронизации корзины:', error);
          setCart((p) => ({ ...p, error: 'Не удалось сохранить корзину' }));
        } finally {
          isSyncingRef.current = false;

          // Если накопились новые изменения во время синхронизации, запускаем ещё раз
          if (pendingItemsRef.current) {
            debouncedSync(pendingItemsRef.current);
          }
        }
      }, 300);
    },
    [hasAuth],
  );

  const computeCart = (items: CartItem[]) => {
    const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    return { items, totalPrice: totalPrice.toFixed(2), totalCount };
  };

  const addItem = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.items.find((i) => i.productId === item.productId && i.variantId === item.variantId);
      const items = existing
        ? prev.items.map((i) =>
            i.productId === item.productId && i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i,
          )
        : [...prev.items, item];
      // Вызываем sync после обновления state
      setTimeout(() => debouncedSync(items), 0);
      return { ...prev, ...computeCart(items) };
    });
  };

  const changeQuantity = (productId: string, variantId: string, quantity: number) => {
    setCart((prev) => {
      const items = prev.items
        .map((i) => (i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0);
      // Вызываем sync после обновления state
      setTimeout(() => debouncedSync(items), 0);
      return { ...prev, ...computeCart(items) };
    });
  };

  const removeItem = (productId: string, variantId: string) => {
    setCart((prev) => {
      const items = prev.items.filter((i) => !(i.productId === productId && i.variantId === variantId));
      // Вызываем sync после обновления state
      setTimeout(() => debouncedSync(items), 0);
      return { ...prev, ...computeCart(items) };
    });
  };

  const reset = () => {
    // Очищаем pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    pendingItemsRef.current = null;
    setCart({ items: [], totalPrice: '0', totalCount: 0, error: null, loading: false });
  };

  return { cart, addItem, changeQuantity, removeItem, reset, formatCurrency };
};
