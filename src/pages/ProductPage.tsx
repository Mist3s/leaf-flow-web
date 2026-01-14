import React, { useEffect, useMemo, useState, useCallback, memo, useRef } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingCart, Package, Check, Loader2, Link2, Share2, Send, MessageCircle, Mail, X } from 'lucide-react';
import { getProduct, listCategories, getReviews } from '../api';
import { Product, ProductDetail } from '../types/catalog';
import { CartItem } from '../types/cart';
import { ToastItem } from '../components/Toast';
import { ReviewsData } from '../types/reviews';
import { formatCurrency, getImageUrl } from '../utils/format';
import { updateSEO, updateProductSchema, updateBreadcrumbSchema, clearDynamicSchemas } from '../utils/seo';
import { MarkdownContent } from '../components/MarkdownContent';
import { ReviewsBlock } from '../components/ReviewsBlock';
import { TeaInfo } from '../components/TeaInfo';
import { ShopBadges } from '../components/ShopBadges';

type Props = {
  id: string;
  onNavigate: (path: string) => void;
  onAdd: (product: Product, variant: Product['variants'][number], quantity: number) => void;
  onChangeQty: (productId: string, variantId: string, quantity: number) => void;
  cart: { items: CartItem[]; totalPrice: string; totalCount: number };
  onShowToast: (toast: Omit<ToastItem, 'id'>) => void;
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

export const ProductPage: React.FC<Props> = memo(({ id, onNavigate, onAdd, onChangeQty, cart, onShowToast }) => {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [activeVariant, setActiveVariant] = useState<ProductDetail['variants'][number] | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Блокировка скролла при открытом share меню на мобильных
  useEffect(() => {
    if (isMobile && shareMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, shareMenuOpen]);

  // Закрытие меню по клику снаружи
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false);
      }
    };
    if (shareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareMenuOpen]);

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
      canonical: `/product/${id}/`,
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
        canonical: `/product/${product.id}/`,
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
      breadcrumbs.push({ name: product.name, url: `/product/${product.id}/` });
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
    // Если есть история браузера — возвращаемся назад, иначе на главную
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onNavigate('/');
    }
  }, [onNavigate]);

  const handleNavigateToCart = useCallback(() => {
    onNavigate('/cart/');
  }, [onNavigate]);

  const handleVariantClick = useCallback((variant: Product['variants'][number]) => {
    setActiveVariant(variant);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onShowToast({
        message: 'Ссылка скопирована',
        tone: 'success',
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to copy link:', err);
      onShowToast({
        message: 'Не удалось скопировать ссылку',
        tone: 'error',
        duration: 3000,
      });
    }
  }, [onShowToast]);

  const handleShare = useCallback(async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} — Zavarka39`,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to share:', err);
        }
      }
    } else {
      setShareMenuOpen((prev) => !prev);
    }
  }, [product]);

  const shareLinks = useMemo(() => {
    if (!product) return [];
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${product.name} — Zavarka39`);
    return [
      { name: 'Telegram', icon: Send, href: `https://t.me/share/url?url=${url}&text=${text}` },
      { name: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${text}%20${url}` },
      { name: 'VK', icon: 'vk', href: `https://vk.com/share.php?url=${url}&title=${text}` },
      { name: 'Email', icon: Mail, href: `mailto:?subject=${text}&body=${url}` },
    ];
  }, [product]);

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
      {/* Top bar */}
      <div className="pdp-topbar">
        <button className="pdp-back" onClick={handleNavigateBack}>
          <ArrowLeft size={20} />
          <span>Назад</span>
        </button>
        <div className="pdp-actions">
          <button className="pdp-action" onClick={handleCopyLink} title="Копировать ссылку">
            <Link2 size={18} />
          </button>
          <div className="pdp-share-wrapper" ref={shareMenuRef}>
            <button className="pdp-action" onClick={handleShare} title="Поделиться">
              <Share2 size={18} />
            </button>
            {shareMenuOpen && (
              <>
                {isMobile && (
                  <div className="pdp-share-overlay" onClick={() => setShareMenuOpen(false)} />
                )}
                <div className={`pdp-share-menu ${isMobile ? 'pdp-share-menu--mobile' : ''}`}>
                  {isMobile && (
                    <>
                      <h4 className="pdp-share-menu__title">Поделиться</h4>
                      <button className="pdp-share-menu__close" onClick={() => setShareMenuOpen(false)}>
                        <X size={18} />
                      </button>
                    </>
                  )}
                  {shareLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pdp-share-menu__item"
                      onClick={() => setShareMenuOpen(false)}
                    >
                      {link.icon === 'vk' ? (
                        <span className="pdp-share-menu__vk">VK</span>
                      ) : (
                        <link.icon size={16} />
                      )}
                      <span>{link.name}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
          {/* Title */}
          <h1 className="pdp-title">{product.name}</h1>

          {/* Shop Badges - доставка, оплата, контакты */}
          <ShopBadges />

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

        {/* Tea Info Block - только для чая с атрибутами и профилями заваривания */}
        {product.product_type_code === 'tea' && 
         product.attributes.length > 0 && 
         product.brewing_profiles.length > 0 && (
          <TeaInfo 
            brewingProfiles={product.brewing_profiles} 
            attributes={product.attributes} 
          />
        )}

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
