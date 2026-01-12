import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingCart, Package, Check, Loader2, Tag } from 'lucide-react';
import { getProduct, listCategories, getReviews } from '../api';
import { Product } from '../types/catalog';
import { CartItem } from '../types/cart';
import { ReviewsData } from '../types/reviews';
import { formatCurrency, getImageUrl } from '../utils/format';
import { updateSEO, updateProductSchema, updateBreadcrumbSchema, clearDynamicSchemas } from '../utils/seo';
import { MarkdownContent } from '../components/MarkdownContent';
import { ReviewsBlock } from '../components/ReviewsBlock';

type Props = {
  id: string;
  onNavigate: (path: string) => void;
  onAdd: (product: Product, variant: Product['variants'][number], quantity: number) => void;
  onChangeQty: (productId: string, variantId: string, quantity: number) => void;
  cart: { items: CartItem[]; totalPrice: string; totalCount: number };
};

// Мемоизированный компонент варианта
const VariantButton = memo<{
  variant: Product['variants'][number];
  isActive: boolean;
  inCart?: CartItem;
  onClick: () => void;
}>(({ variant, isActive, inCart, onClick }) => (
  <button
    className={`pdp-variant ${isActive ? 'pdp-variant--active' : ''} ${inCart ? 'pdp-variant--in-cart' : ''}`}
    onClick={onClick}
  >
    <span className="pdp-variant__weight">{variant.weight}</span>
    <span className="pdp-variant__price">{formatCurrency(variant.price)}</span>
    {inCart && (
      <span className="pdp-variant__cart-badge">
        <Check size={12} />
        {inCart.quantity}
      </span>
    )}
  </button>
));

VariantButton.displayName = 'VariantButton';

// Мемоизированный компонент тега
const ProductTag = memo<{ tag: string }>(({ tag }) => (
  <span className="pdp-tag">
    <Tag size={12} />
    {tag}
  </span>
));

ProductTag.displayName = 'ProductTag';

export const ProductPage: React.FC<Props> = memo(({ id, onNavigate, onAdd, onChangeQty, cart }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [activeVariant, setActiveVariant] = useState<Product['variants'][number] | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Загрузка категорий
  useEffect(() => {
    listCategories()
      .then((res) => {
        const map = new Map<string, string>();
        (res.items || []).forEach((cat) => map.set(cat.id, cat.label));
        setCategoryMap(map);
      })
      .catch(() => {});
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Устанавливаем временный title сразу при загрузке страницы продукта
    // Это поможет поисковым системам видеть более релевантный title
    // Title будет обновлен после загрузки данных о продукте
    updateSEO({
      title: 'Китайский чай — купить в Калининграде | Zavarka39',
      description: 'Купить китайский чай в Калининграде с доставкой. Премиальный чай из Китая: пуэр, улун, зелёный, белый чай.',
      canonical: `/product/${id}`,
      type: 'product',
    });
    
    getProduct(id)
      .then((res) => {
        setProduct(res);
        setActiveVariant(res.variants?.[0] ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить товар');
        setLoading(false);
      });
    
    // Очищаем динамические схемы при уходе со страницы
    return () => {
      clearDynamicSchemas();
    };
  }, [id]);

  // Динамическое SEO для страницы товара
  useEffect(() => {
    if (product) {
      const minPrice = product.variants.length > 0 
        ? Math.min(...product.variants.map(v => parseFloat(v.price)))
        : 0;
      const priceText = minPrice > 0 ? `от ${formatCurrency(minPrice)}` : '';
      const categoryName = product.category ? categoryMap.get(product.category) : undefined;
      
      // Обновляем мета-теги
      updateSEO({
        title: `${product.name} — купить в Калининграде | Zavarka39`,
        description: `${product.name} ${priceText}. Купить китайский чай в Калининграде с доставкой. ${product.description?.slice(0, 120) || 'Премиальный чай из Китая.'}`,
        canonical: `/product/${product.id}`,
        type: 'product',
        image: product.image,
      });
      
      // Добавляем структурированные данные для товара
      updateProductSchema({
        id: product.id,
        name: product.name,
        description: product.description,
        image: product.image,
        price: String(minPrice),
        category: categoryName,
        availability: 'InStock',
      });
      
      // Обновляем хлебные крошки
      const breadcrumbs = [
        { name: 'Главная', url: '/' },
      ];
      if (categoryName) {
        breadcrumbs.push({ name: categoryName, url: `/?category=${product.category}` });
      }
      breadcrumbs.push({ name: product.name, url: `/product/${product.id}` });
      updateBreadcrumbSchema(breadcrumbs);
    }
  }, [product, categoryMap]);

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

  const handleAddToCart = useCallback(() => {
    if (product && activeVariant) {
      onAdd(product, activeVariant, quantity);
      setQuantity(1);
    }
  }, [product, activeVariant, quantity, onAdd]);

  const handleNavigateBack = useCallback(() => {
    onNavigate('/');
  }, [onNavigate]);

  const handleNavigateToCart = useCallback(() => {
    onNavigate('/cart');
  }, [onNavigate]);

  const handleVariantClick = useCallback((variant: Product['variants'][number]) => {
    setActiveVariant(variant);
  }, []);

  if (loading) {
    return (
      <div className="pdp-loading">
        <Loader2 size={32} className="pdp-loading__spinner" />
        <span>Загружаем товар...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdp-error">
        <div className="pdp-error__icon">
          <Package size={32} />
        </div>
        <h2 className="pdp-error__title">Товар не найден</h2>
        <p className="pdp-error__text">{error}</p>
        <button className="button" onClick={handleNavigateBack}>
          Вернуться в каталог
        </button>
      </div>
    );
  }

  if (!product || !activeVariant) return null;

  return (
    <div className="pdp">
      {/* Back button */}
      <button className="pdp-back" onClick={handleNavigateBack}>
        <ArrowLeft size={20} />
        <span>Назад в каталог</span>
      </button>

      <div className="pdp-layout">
        {/* Image */}
        <div className="pdp-gallery">
          <div className="pdp-gallery__main">
            <img 
              src={getImageUrl(product.image)} 
              alt={product.name} 
              className="pdp-gallery__image"
              loading="eager"
              decoding="async"
            />
            {product.category && categoryMap.get(product.category) && (
              <span className="pdp-gallery__category">{categoryMap.get(product.category)}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pdp-info">
          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="pdp-tags">
              {product.tags.map((tag) => (
                <ProductTag key={tag} tag={tag} />
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="pdp-title">{product.name}</h1>

          {/* Variants */}
          <div className="pdp-variants">
            <span className="pdp-variants__label">Выберите упаковку</span>
            <div className="pdp-variants__list">
              {product.variants.map((variant) => (
                <VariantButton
                  key={variant.id}
                  variant={variant}
                  isActive={variant.id === activeVariant.id}
                  inCart={productCartItems.find((item) => item.variantId === variant.id)}
                  onClick={() => handleVariantClick(variant)}
                />
              ))}
            </div>
          </div>

          {/* Price & Actions */}
          <div className="pdp-purchase">
            {variantInCart ? (
              <>
                <div className="pdp-purchase__subtotal">
                  {formatCurrency(parseFloat(variantInCart.price) * variantInCart.quantity)}
                </div>
                <div className="pdp-qty">
                  <button
                    className="pdp-qty__btn"
                    onClick={() => onChangeQty(product.id, activeVariant.id, variantInCart.quantity - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="pdp-qty__count">{variantInCart.quantity}</span>
                  <button
                    className="pdp-qty__btn"
                    onClick={() => onChangeQty(product.id, activeVariant.id, variantInCart.quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="pdp-purchase__subtotal">
                  {formatCurrency(activeVariant.price)}
                </div>
                <button className="pdp-add-btn" onClick={handleAddToCart}>
                  <ShoppingCart size={18} />
                  В корзину
                </button>
              </>
            )}
          </div>

          {/* Cart Summary */}
          {productTotals.quantity > 0 && (
            <div className="pdp-cart-summary">
              <div className="pdp-cart-summary__icon">
                <ShoppingCart size={18} />
              </div>
              <div className="pdp-cart-summary__info">
                <span className="pdp-cart-summary__label">Этот товар в корзине</span>
                <span className="pdp-cart-summary__value">
                  {productTotals.quantity} шт. на сумму {formatCurrency(productTotals.total)}
                </span>
              </div>
              <button className="pdp-cart-summary__btn" onClick={handleNavigateToCart}>
                Открыть
              </button>
            </div>
          )}
        </div>

        {/* Description - full width section */}
        {product.description && (
          <section className="pdp-description-section">
            <h2 className="pdp-description-section__title">Описание</h2>
            <MarkdownContent content={product.description} className="pdp-description-section__content" />
          </section>
        )}

        {/* Reviews Block */}
        <ReviewsBlock data={reviewsData} loading={reviewsLoading} />
      </div>

      {/* Mobile Fixed Bottom */}
      <div className="pdp-mobile-bar">
        <div className="pdp-mobile-bar__price">
          <span className="pdp-mobile-bar__price-label">Цена</span>
          <span className="pdp-mobile-bar__price-value">{formatCurrency(activeVariant.price)}</span>
        </div>
        {variantInCart ? (
          <div className="pdp-mobile-bar__qty">
            <button
              className="pdp-mobile-bar__qty-btn"
              onClick={() => onChangeQty(product.id, activeVariant.id, variantInCart.quantity - 1)}
            >
              <Minus size={18} />
            </button>
            <span className="pdp-mobile-bar__qty-value">{variantInCart.quantity}</span>
            <button
              className="pdp-mobile-bar__qty-btn"
              onClick={() => onChangeQty(product.id, activeVariant.id, variantInCart.quantity + 1)}
            >
              <Plus size={18} />
            </button>
          </div>
        ) : (
          <button className="pdp-mobile-bar__add" onClick={handleAddToCart}>
            <ShoppingCart size={18} />
            В корзину
          </button>
        )}
      </div>
    </div>
  );
});

ProductPage.displayName = 'ProductPage';
