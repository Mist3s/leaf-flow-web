import React, { useEffect, useState } from 'react';
import { listCategories, listProducts } from '../api';
import { Product } from '../types/catalog';
import { priceRange } from '../utils/format';

type Props = {
  filters: { search: string; category: string };
  onFiltersChange: (next: Partial<Props['filters']>) => void;
  onNavigate: (path: string) => void;
  onAdd: (product: Product, variant: Product['variants'][number]) => void;
  user: any;
};

export const Home: React.FC<Props> = ({ filters, onFiltersChange, onNavigate, onAdd, user }) => {
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
          {products.map((product) => (
            <article key={product.id} className="card">
              <img src={product.image} alt={product.name} loading="lazy" />
              <div className="row justify-between">
                <h3 style={{ margin: 0 }}>{product.name}</h3>
                <span className="badge">{product.category}</span>
              </div>
              <p className="muted" style={{ minHeight: '48px' }}>
                {product.description.slice(0, 90)}...
              </p>
              <div className="row justify-between">
                <div className="stack" style={{ gap: '0.15rem' }}>
                  <strong>{priceRange(product.variants)}</strong>
                  <span className="muted">от {product.variants?.[0]?.weight}</span>
                </div>
                <div className="row">
                  <button className="button ghost" onClick={() => onNavigate(`/product/${product.id}`)}>
                    Открыть
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      const variant = product.variants?.[0];
                      if (!variant) return;
                      if (!user) {
                        onNavigate('/auth');
                        return;
                      }
                      onAdd(product, variant);
                    }}
                  >
                    В корзину
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
