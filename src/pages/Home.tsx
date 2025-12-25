import React, { useEffect, useState } from 'react';
import { listCategories, listProducts } from '../api';
import { Product } from '../types/catalog';
import { formatCurrency } from '../utils/format';

type Props = {
  filters: { search: string; category: string };
  onFiltersChange: (next: Partial<Props['filters']>) => void;
  onNavigate: (path: string) => void;
};

export const Home: React.FC<Props> = ({ filters, onFiltersChange, onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories().then((res) => setCategories(res.items || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listProducts({ search: filters.search || undefined, category: filters.category || undefined, limit: 60 })
      .then((res) => {
        setProducts(res.items || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить товары');
        setLoading(false);
      });
  }, [filters.search, filters.category]);

  return (
    <div className="stack">
      <section className="hero">
        <h1>Каталог китайского чая</h1>
        <p>Поиск работает по названию и тегам.</p>
        <input
          className="input"
          type="search"
          placeholder="Поиск по каталогу"
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
        />
      </section>
      <section className="section">
        <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button className={`pill ${!filters.category ? 'active' : ''}`} onClick={() => onFiltersChange({ category: '' })}>
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`pill ${filters.category === cat.id ? 'active' : ''}`}
              onClick={() => onFiltersChange({ category: cat.id })}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="row justify-between" style={{ marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Товары</h2>
          <span className="muted">{products.length ? `${products.length} позиций` : ''}</span>
        </div>
        {loading && <p className="muted">Загружаем подборку...</p>}
        {error && <div className="alert danger">{error}</div>}
        {!loading && !products.length && <p className="muted">Товары не найдены.</p>}
        <div className="grid">
          {products.map((product) => {
            const prices =
              product.variants?.map((variant) => Number(variant.price)).filter((price) => Number.isFinite(price)) ?? [];
            const minPrice = prices.length ? formatCurrency(Math.min(...prices)) : '—';

            return (
              <article
                key={product.id}
                className="card product-card"
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(`/product/${product.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate(`/product/${product.id}`);
                  }
                }}
              >
                <img src={product.image} alt={product.name} loading="lazy" />
                <h3 className="product-card__title">{product.name}</h3>
                <p className="muted" style={{ textAlign: 'center' }}>
                  {product.category}
                </p>
                <div className="row justify-between product-card__footer">
                  <div className="stack" style={{ gap: '0.15rem' }}>
                    <span className="muted">Цена от</span>
                    <strong>{minPrice}</strong>
                  </div>
                  <button
                    className="button ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(`/product/${product.id}`);
                    }}
                  >
                    Открыть
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
