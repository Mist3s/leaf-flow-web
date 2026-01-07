import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { getProduct } from '../api';
import { Product } from '../types/catalog';
import { CartItem } from '../types/cart';
import { formatCurrency } from '../utils/format';

type Props = {
  id: string;
  onNavigate: (path: string) => void;
  onAdd: (product: Product, variant: Product['variants'][number], quantity: number) => void;
  onChangeQty: (productId: string, variantId: string, quantity: number) => void;
  cart: { items: CartItem[]; totalPrice: string; totalCount: number };
};

export const ProductPage: React.FC<Props> = ({ id, onNavigate, onAdd, onChangeQty, cart }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [activeVariant, setActiveVariant] = useState<Product['variants'][number] | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getProduct(id)
      .then((res) => {
        setProduct(res);
        setActiveVariant(res.variants?.[0] ?? null);
      })
      .catch(() => setError('Не удалось загрузить товар'));
  }, [id]);

  useEffect(() => {
    setQuantity(1);
  }, [activeVariant?.id]);

  const productCartItems = useMemo(() => {
    if (!product) return [];
    return cart.items.filter((item) => item.productId === product.id);
  }, [cart.items, product]);

  const variantInCart = useMemo(() => {
    if (!product || !activeVariant) return undefined;
    return productCartItems.find((item) => item.variantId === activeVariant.id);
  }, [activeVariant, product, productCartItems]);

  const productTotals = useMemo(
    () => ({
      quantity: productCartItems.reduce((sum, item) => sum + item.quantity, 0),
      total: productCartItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0),
    }),
    [productCartItems],
  );

  const variantTotalPrice = variantInCart ? (parseFloat(variantInCart.price) || 0) * variantInCart.quantity : null;

  if (error) return <div className="alert danger">{error}</div>;
  if (!product || !activeVariant) return <p className="muted">Загружаем описание...</p>;

  return (
    <div className="stack">
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <button className="pill" onClick={() => onNavigate('/')}>
          <ArrowLeft size={16} /> Назад
        </button>
      </div>
      <section className="product-header">
        <div className="product-visual">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="stack">
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            {product.tags.map((tag) => (
              <span key={tag} className="badge">
                #{tag}
              </span>
            ))}
          </div>
          <h1 style={{ margin: 0 }}>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <div className="stack">
            <span className="muted">Выберите упаковку</span>
            <div className="variant-list">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  className={`variant ${variant.id === activeVariant.id ? 'active' : ''}`}
                  onClick={() => setActiveVariant(variant)}
                >
                  <strong>{variant.weight}</strong>
                  <span className="variant__price">{formatCurrency(variant.price)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="row justify-between product-actions" style={{ alignItems: 'flex-end' }}>
            <div className="stack" style={{ gap: '0.15rem' }}>
              <span className="muted">Стоимость</span>
              <h2 style={{ margin: 0 }}>{formatCurrency(activeVariant.price)}</h2>
            </div>
            {variantInCart ? (
              <div className="product-qty">
                <button
                  className="pill"
                  aria-label="Уменьшить количество"
                  onClick={() => onChangeQty(product.id, activeVariant.id, Math.max(1, variantInCart.quantity - 1))}
                >
                  <Minus size={14} />
                </button>
                <div className="product-qty__value">
                  <span className="muted">В корзине</span>
                  <strong>{variantInCart.quantity} шт.</strong>
                </div>
                <button
                  className="pill"
                  aria-label="Увеличить количество"
                  onClick={() => onChangeQty(product.id, activeVariant.id, variantInCart.quantity + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <div className="row">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  className="input"
                  style={{ width: '100px' }}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
                <button
                  className="button"
                  onClick={() => {
                    onAdd(product, activeVariant, quantity);
                    setQuantity(1);
                  }}
                >
                  В корзину
                </button>
              </div>
            )}
          </div>
          {variantInCart && (
            <div className="cart-note">
              <div className="cart-note__row">
                <span>Эта упаковка уже в корзине</span>
                <strong>{variantInCart.quantity} шт.</strong>
              </div>
              <div className="cart-note__meta">
                Сумма по упаковке: {formatCurrency(variantTotalPrice ?? activeVariant.price)}
              </div>
            </div>
          )}
          {productTotals.quantity > 0 && (
            <div className="cart-note">
              <div className="cart-note__row">
                <span>Всего по товару в корзине</span>
                <strong>{productTotals.quantity} шт.</strong>
              </div>
              <div className="cart-note__meta">Общая сумма: {formatCurrency(productTotals.total)}</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
