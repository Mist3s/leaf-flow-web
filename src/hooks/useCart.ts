import { useEffect, useState } from 'react';
import { getCart, replaceCartItems } from '../api';
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
  const [cart, setCart] = useState<CartState>({ items: [], totalPrice: '0', totalCount: 0, error: null, loading: false });

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
        const computed = computeCart(remote.items);
        setCart({ ...computed, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setCart((p) => ({ ...p, loading: false, error: 'Не удалось загрузить корзину' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAuth]);

  const sync = async (items: CartItem[]) => {
    if (!hasAuth) return;
    try {
      await replaceCartItems(items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })));
      setCart((p) => ({ ...p, error: null }));
    } catch (error) {
      setCart((p) => ({ ...p, error: 'Не удалось синхронизировать корзину' }));
    }
  };

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
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const changeQuantity = (productId: string, variantId: string, quantity: number) => {
    setCart((prev) => {
      const items = prev.items
        .map((i) => (i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0);
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const removeItem = (productId: string, variantId: string) => {
    setCart((prev) => {
      const items = prev.items.filter((i) => !(i.productId === productId && i.variantId === variantId));
      sync(items);
      return { ...prev, ...computeCart(items) };
    });
  };

  const reset = () => setCart({ items: [], totalPrice: '0', totalCount: 0, error: null, loading: false });

  return { cart, addItem, changeQuantity, removeItem, reset, formatCurrency };
};
