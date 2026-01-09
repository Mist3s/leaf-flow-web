import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { Search, Package, Loader2, Send, Smartphone, Phone } from 'lucide-react';
import { listCategories, listProducts, getReviews } from '../api';
import { Product } from '../types/catalog';
import { ReviewsData } from '../types/reviews';
import { formatCurrency, getImageUrl } from '../utils/format';
import { ReviewsCompact } from '../components/ReviewsCompact';

const ITEMS_PER_PAGE = 20;

// Кэш для сохранения данных между переходами
const cache = {
  products: [] as Product[],
  categories: [] as { id: string; label: string }[],
  offset: 0,
  hasMore: true,
  filterKey: '',
};

type Props = {
  filters: { search: string; category: string };
  onFiltersChange: (next: Partial<Props['filters']>) => void;
  onNavigate: (path: string) => void;
};

// Мемоизированная карточка товара
const ProductCard = memo<{
  product: Product;
  categoryLabel?: string;
  index: number;
  onNavigate: (path: string) => void;
}>(({ product, categoryLabel, index, onNavigate }) => {
  const prices = useMemo(() => 
    product.variants?.map((variant) => Number(variant.price)).filter((price) => Number.isFinite(price)) ?? [],
    [product.variants]
  );
  const minPrice = prices.length ? Math.min(...prices) : null;

  const handleClick = useCallback(() => {
    onNavigate(`/product/${product.id}`);
  }, [onNavigate, product.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigate(`/product/${product.id}`);
    }
  }, [onNavigate, product.id]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(`/product/${product.id}`);
  }, [onNavigate, product.id]);

  return (
    <article
      className="product-card"
      role="button"
      tabIndex={0}
      style={{ animationDelay: `${Math.min(index, 20) * 0.03}s` }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="product-card__image-wrap">
        <img 
          src={getImageUrl(product.image)} 
          alt={product.name} 
          loading="lazy" 
          decoding="async"
          className="product-card__image" 
        />
        {categoryLabel && (
          <span className="product-card__category-badge">{categoryLabel}</span>
        )}
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <div className="product-card__footer">
          <div className="product-card__price">
            {minPrice !== null ? (
              <>
                <span className="product-card__price-label">от</span>
                <span className="product-card__price-value">{formatCurrency(minPrice)}</span>
              </>
            ) : (
              <span className="product-card__price-value">—</span>
            )}
          </div>
          <button className="product-card__btn" onClick={handleButtonClick}>
            Подробнее
          </button>
        </div>
      </div>
    </article>
  );
});

ProductCard.displayName = 'ProductCard';

// Мемоизированная кнопка категории
const CategoryButton = memo<{
  category: { id: string; label: string } | null;
  isActive: boolean;
  onClick: () => void;
}>(({ category, isActive, onClick }) => (
  <button
    className={`home-category ${isActive ? 'home-category--active' : ''}`}
    onClick={onClick}
  >
    {category?.label || 'Все'}
  </button>
));

CategoryButton.displayName = 'CategoryButton';

export const Home: React.FC<Props> = memo(({ filters, onFiltersChange, onNavigate }) => {
  const filterKey = `${filters.search}|${filters.category}`;
  const hasCachedData = cache.filterKey === filterKey && cache.products.length > 0;

  const [products, setProducts] = useState<Product[]>(hasCachedData ? cache.products : []);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>(cache.categories);
  const [loading, setLoading] = useState(!hasCachedData);
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Маппинг id -> label для быстрого поиска
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.label));
    return map;
  }, [categories]);

  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(hasCachedData ? cache.hasMore : true);
  const [offset, setOffset] = useState(hasCachedData ? cache.offset : 0);

  // Ref для отслеживания элемента в конце списка
  const loaderRef = useRef<HTMLDivElement>(null);

  // Загрузка категорий
  useEffect(() => {
    if (cache.categories.length > 0) return;
    listCategories()
      .then((res) => {
        const items = res.items || [];
        setCategories(items);
        cache.categories = items;
      })
      .catch(() => setCategories([]));
  }, []);

  // Загрузка отзывов
  useEffect(() => {
    getReviews()
      .then((data) => {
        setReviewsData(data);
        setReviewsLoading(false);
      })
      .catch(() => setReviewsLoading(false));
  }, []);

  // Первичная загрузка при изменении фильтров
  useEffect(() => {
    // Если фильтры не изменились и есть кэш — не загружаем
    if (cache.filterKey === filterKey && cache.products.length > 0) {
      return;
    }

    setLoading(true);
    setError(null);
    setProducts([]);
    setOffset(0);
    setHasMore(true);

    listProducts({
      search: filters.search || undefined,
      category: filters.category || undefined,
      limit: ITEMS_PER_PAGE,
      offset: 0,
    })
      .then((res) => {
        const items = res.items || [];
        setProducts(items);
        setHasMore(items.length === ITEMS_PER_PAGE);
        setOffset(items.length);
        setLoading(false);
        // Сохраняем в кэш
        cache.products = items;
        cache.offset = items.length;
        cache.hasMore = items.length === ITEMS_PER_PAGE;
        cache.filterKey = filterKey;
      })
      .catch(() => {
        setError('Не удалось загрузить товары');
        setLoading(false);
      });
  }, [filterKey, filters.search, filters.category]);

  // Подгрузка следующей страницы
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const res = await listProducts({
        search: filters.search || undefined,
        category: filters.category || undefined,
        limit: ITEMS_PER_PAGE,
        offset,
      });
      const items = res.items || [];
      setProducts((prev) => {
        const updated = [...prev, ...items];
        cache.products = updated;
        return updated;
      });
      setHasMore(items.length === ITEMS_PER_PAGE);
      setOffset((prev) => {
        const updated = prev + items.length;
        cache.offset = updated;
        return updated;
      });
      cache.hasMore = items.length === ITEMS_PER_PAGE;
    } catch (err) {
      console.error('Ошибка подгрузки товаров', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset, filters.search, filters.category]);

  // Intersection Observer для бесконечной прокрутки
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  // Обработчики событий
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value });
  }, [onFiltersChange]);

  const handleClearSearch = useCallback(() => {
    onFiltersChange({ search: '' });
  }, [onFiltersChange]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    onFiltersChange({ category: categoryId });
  }, [onFiltersChange]);

  const handleResetFilters = useCallback(() => {
    onFiltersChange({ search: '', category: '' });
  }, [onFiltersChange]);

  // Заголовок секции товаров
  const productsTitle = useMemo(() => {
    if (filters.category) {
      return categories.find((c) => c.id === filters.category)?.label || 'Товары';
    }
    if (filters.search) {
      return 'Результаты поиска';
    }
    return 'Все товары';
  }, [filters.category, filters.search, categories]);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero__main">
          <div className="home-hero__content">
            <h1 className="home-hero__title">
              Откройте мир<br />
              <span className="home-hero__title-accent">настоящего чая</span>
            </h1>
            <p className="home-hero__subtitle">
              Коллекция отборного чая из лучших провинций Китая. 
              Прямые поставки, гарантия качества.
            </p>
          </div>

          {/* Contacts sidebar */}
          <aside className="home-hero__contacts">
            <a
              href="https://t.me/zavarka39_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="home-hero__contact home-hero__contact--primary"
            >
              <Smartphone size={20} />
              <div className="home-hero__contact-info">
                <span className="home-hero__contact-title">Telegram App</span>
                <span className="home-hero__contact-desc">Заказ в 2 клика</span>
              </div>
            </a>
            <a
              href="https://t.me/zavarka39_ru"
              target="_blank"
              rel="noopener noreferrer"
              className="home-hero__contact"
            >
              <Send size={18} />
              <span>@zavarka39_ru</span>
            </a>
            <a href="tel:+79953257119" className="home-hero__contact">
              <Phone size={18} />
              <span>+7 (995) 325-71-19</span>
            </a>
          </aside>
        </div>

        {/* Search + Reviews */}
        <div className="home-search-row">
        <div className="home-search">
          <div className="home-search__input-wrap">
            <Search size={20} className="home-search__icon" />
            <input
              className="home-search__input"
              type="search"
              placeholder="Найти чай по названию или категории..."
              value={filters.search}
              onChange={handleSearchChange}
            />
            {filters.search && (
              <button className="home-search__clear" onClick={handleClearSearch}>
                Очистить
              </button>
            )}
          </div>
          </div>
          <ReviewsCompact data={reviewsData} loading={reviewsLoading} />
        </div>
      </section>

      {/* Categories */}
      <section className="home-categories">
        <div className="home-categories__list">
          <CategoryButton
            category={null}
            isActive={!filters.category}
            onClick={() => handleCategoryClick('')}
          />
          {categories.map((cat) => (
            <CategoryButton
              key={cat.id}
              category={cat}
              isActive={filters.category === cat.id}
              onClick={() => handleCategoryClick(cat.id)}
            />
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="home-products">
        <div className="home-products__header">
          <h2 className="home-products__title">{productsTitle}</h2>
          <span className="home-products__count">
            {loading ? 'Загрузка...' : `${products.length} ${getProductsWord(products.length)}`}
          </span>
        </div>

        {error && <div className="alert danger">{error}</div>}

        {!loading && !products.length && (
          <div className="home-empty">
            <div className="home-empty__icon">
              <Package size={32} />
            </div>
            <h3 className="home-empty__title">Ничего не найдено</h3>
            <p className="home-empty__text">Попробуйте изменить параметры поиска или выбрать другую категорию</p>
            <button className="button" onClick={handleResetFilters}>
              Сбросить фильтры
            </button>
          </div>
        )}

        {loading && (
          <div className="home-loading">
            <Loader2 size={32} className="home-loading__spinner" />
            <span>Загружаем товары...</span>
          </div>
        )}

        <div className="home-grid">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryLabel={product.category ? categoryMap.get(product.category) : undefined}
              index={index}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* Loader для бесконечной прокрутки */}
        <div ref={loaderRef} className="home-loader">
          {loadingMore && (
            <div className="home-loader__content">
              <Loader2 size={24} className="home-loading__spinner" />
              <span>Загружаем ещё...</span>
            </div>
          )}
          {!hasMore && products.length > 0 && (
            <div className="home-loader__end">
              Вы просмотрели все товары
            </div>
          )}
        </div>
      </section>
    </div>
  );
});

Home.displayName = 'Home';

function getProductsWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return 'товаров';
  if (lastOne === 1) return 'товар';
  if (lastOne >= 2 && lastOne <= 4) return 'товара';
  return 'товаров';
}
