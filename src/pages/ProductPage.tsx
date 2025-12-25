import React, { useEffect, useState } from 'react';
import { getProduct } from '../api';
import { Product } from '../types/catalog';
import { formatCurrency } from '../utils/format';
import { ArrowLeft } from 'lucide-react';

type Props = {
  id: string;
  onNavigate: (path: string) => void;
  onAdd: (product: Product, variant: Product['variants'][number], quantity: number) => void;
  user: any;
};

export const ProductPage: React.FC<Props> = ({ id, onNavigate, onAdd, user }) => {
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
            <span className="muted">Выберите фасовку</span>
            <div className="variant-list">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  className={`variant ${variant.id === activeVariant.id ? 'active' : ''}`}
                  onClick={() => setActiveVariant(variant)}
                >
                  <strong>{variant.weight}</strong>
                  <span className="muted">{formatCurrency(variant.price)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="row justify-between" style={{ alignItems: 'flex-end' }}>
            <div className="stack" style={{ gap: '0.15rem' }}>
              <span className="muted">Стоимость</span>
              <h2 style={{ margin: 0 }}>{formatCurrency(activeVariant.price)}</h2>
            </div>
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
                  if (!user) {
                    onNavigate('/auth');
                    return;
                  }
                  onAdd(product, activeVariant, quantity);
                }}
              >
                В корзину
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
