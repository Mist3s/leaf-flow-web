import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ProductImage } from '../types/catalog';
import { getImageUrl, getImageVariantUrl } from '../utils/format';

type GalleryImage = {
  id: number | string;
  thumbUrl: string;
  url: string;      // md variant — основное отображение
  fullUrl: string;   // lg variant — для лайтбокса
  title: string;
};

type Props = {
  mainImage: string;
  images: ProductImage[];
  productName: string;
  categoryLabel?: string;
};

// Интервал автопереключения (мс)
const AUTO_SLIDE_INTERVAL = 5000;

// Ограничения зума
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

// Порог свайпа (px)
const SWIPE_THRESHOLD = 40;

// Вычисление расстояния между двумя точками касания
const getTouchDistance = (touches: React.TouchList): number => {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

export const ProductGallery: React.FC<Props> = memo(({ mainImage, images, productName, categoryLabel }) => {
  // Формируем массив изображений для галереи
  const galleryImages: GalleryImage[] = React.useMemo(() => {
    const fallback: GalleryImage = {
      id: 'main',
      thumbUrl: mainImage,
      url: mainImage,
      fullUrl: mainImage,
      title: productName,
    };

    if (!images || images.length === 0) {
      return [fallback];
    }
    
    const activeImages = images
      .filter(img => img.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    if (activeImages.length === 0) {
      return [fallback];
    }
    
    return activeImages.map(img => {
      const fallbackUrl = img.image_url || mainImage;
      return {
        id: img.id,
        thumbUrl: getImageVariantUrl(img, 'thumb') || fallbackUrl,
        url: getImageVariantUrl(img, 'md') || fallbackUrl,
        fullUrl: getImageVariantUrl(img, 'lg') || fallbackUrl,
        title: img.title || productName,
      };
    });
  }, [mainImage, images, productName]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Свайп
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isTouchMoved = useRef(false);
  
  // Pinch-to-zoom
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);
  const lightboxImageRef = useRef<HTMLDivElement>(null);

  const showThumbnails = galleryImages.length > 1;

  // Автопереключение
  const startAutoSlide = useCallback(() => {
    if (!showThumbnails) return;
    autoSlideRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % galleryImages.length);
    }, AUTO_SLIDE_INTERVAL);
  }, [galleryImages.length, showThumbnails]);

  const stopAutoSlide = useCallback(() => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
      autoSlideRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [startAutoSlide, stopAutoSlide]);

  useEffect(() => {
    setActiveIndex(0);
  }, [galleryImages.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    stopAutoSlide();
    setActiveIndex(index);
    startAutoSlide();
  }, [startAutoSlide, stopAutoSlide]);

  const handlePrevious = useCallback(() => {
    stopAutoSlide();
    setActiveIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
    startAutoSlide();
  }, [galleryImages.length, startAutoSlide, stopAutoSlide]);

  const handleNext = useCallback(() => {
    stopAutoSlide();
    setActiveIndex(prev => (prev + 1) % galleryImages.length);
    startAutoSlide();
  }, [galleryImages.length, startAutoSlide, stopAutoSlide]);

  // Лайтбокс
  const openLightbox = useCallback(() => {
    stopAutoSlide();
    setLightboxOpen(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    document.body.style.overflow = 'hidden';
  }, [stopAutoSlide]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    document.body.style.overflow = '';
    startAutoSlide();
  }, [startAutoSlide]);

  // Зум
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!lightboxOpen) return;
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  }, [lightboxOpen, handleZoomIn, handleZoomOut]);

  // Мышь — перетаскивание
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, zoom, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch для лайтбокса
  const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      setInitialPinchDistance(getTouchDistance(e.touches));
      setInitialZoom(zoom);
    } else if (e.touches.length === 1 && zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  }, [zoom, pan]);

  const handleLightboxTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      const distance = getTouchDistance(e.touches);
      const scale = distance / initialPinchDistance;
      const newZoom = Math.min(Math.max(initialZoom * scale, MIN_ZOOM), MAX_ZOOM);
      setZoom(newZoom);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  }, [initialPinchDistance, initialZoom, isDragging, zoom, dragStart]);

  const handleLightboxTouchEnd = useCallback(() => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  }, []);

  // Свайп для галереи
  const handleGalleryTouchStart = useCallback((e: React.TouchEvent) => {
    if (!showThumbnails || e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isTouchMoved.current = false;
    stopAutoSlide();
  }, [showThumbnails, stopAutoSlide]);

  const handleGalleryTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || e.touches.length !== 1) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - (touchStartY.current || 0);
    
    // Если горизонтальное движение больше вертикального — это свайп
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isTouchMoved.current = true;
      e.preventDefault(); // Предотвращаем скролл страницы
    }
  }, []);

  const handleGalleryTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) {
      startAutoSlide();
      return;
    }
    
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const diffX = endX - touchStartX.current;
    
    if (Math.abs(diffX) > SWIPE_THRESHOLD && isTouchMoved.current) {
      if (diffX < 0) {
        // Свайп влево — следующее
        setActiveIndex(prev => (prev + 1) % galleryImages.length);
      } else {
        // Свайп вправо — предыдущее
        setActiveIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    startAutoSlide();
  }, [galleryImages.length, startAutoSlide]);

  // Клик — открываем лайтбокс только если не было свайпа
  const handleGalleryClick = useCallback(() => {
    if (!isTouchMoved.current) {
      openLightbox();
    }
    isTouchMoved.current = false;
  }, [openLightbox]);

  // Клавиатура
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': closeLightbox(); break;
        case 'ArrowLeft': handlePrevious(); break;
        case 'ArrowRight': handleNext(); break;
        case '+': case '=': handleZoomIn(); break;
        case '-': handleZoomOut(); break;
        case '0': handleResetZoom(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, handlePrevious, handleNext, handleZoomIn, handleZoomOut, handleResetZoom]);

  const currentImage = galleryImages[activeIndex];

  return (
    <>
      <div className="product-gallery">
        {/* Миниатюры */}
        {showThumbnails && (
          <div className="product-gallery__thumbnails">
            {galleryImages.map((img, index) => (
              <button
                key={img.id}
                className={`product-gallery__thumb ${index === activeIndex ? 'product-gallery__thumb--active' : ''}`}
                onClick={() => handleThumbnailClick(index)}
                aria-label={`Показать изображение ${index + 1}`}
              >
                <img src={getImageUrl(img.thumbUrl)} alt={img.title} loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}

        {/* Основное изображение */}
        <div 
          className={`product-gallery__main ${!showThumbnails ? 'product-gallery__main--single' : ''}`}
          onClick={handleGalleryClick}
          onTouchStart={handleGalleryTouchStart}
          onTouchMove={handleGalleryTouchMove}
          onTouchEnd={handleGalleryTouchEnd}
        >
          <img
            key={currentImage.id}
            src={getImageUrl(currentImage.url)}
            alt={currentImage.title}
            className="product-gallery__image"
            loading="eager"
            decoding="async"
            draggable={false}
          />
          
          {categoryLabel && (
            <span className="product-gallery__category">{categoryLabel}</span>
          )}

          <div className="product-gallery__zoom-hint">
            <ZoomIn size={16} />
          </div>

          {/* Стрелки навигации (мобильные) */}
          {showThumbnails && (
            <>
              <button 
                className="product-gallery__nav product-gallery__nav--prev"
                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                aria-label="Предыдущее"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                className="product-gallery__nav product-gallery__nav--next"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                aria-label="Следующее"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Точки */}
          {showThumbnails && (
            <div className="product-gallery__dots">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  className={`product-gallery__dot ${index === activeIndex ? 'product-gallery__dot--active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleThumbnailClick(index); }}
                  aria-label={`Изображение ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Лайтбокс */}
      {lightboxOpen && (
        <div className="lightbox" onClick={closeLightbox}>
          <div className="lightbox__header" onClick={e => e.stopPropagation()}>
            <span className="lightbox__counter">{activeIndex + 1} / {galleryImages.length}</span>
            <div className="lightbox__controls">
              <button className="lightbox__btn" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} title="Уменьшить">
                <ZoomOut size={20} />
              </button>
              <span className="lightbox__zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="lightbox__btn" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} title="Увеличить">
                <ZoomIn size={20} />
              </button>
              <button className="lightbox__btn" onClick={handleResetZoom} disabled={zoom === 1} title="Сбросить">
                <RotateCcw size={20} />
              </button>
              <button className="lightbox__btn lightbox__btn--close" onClick={closeLightbox} title="Закрыть">
                <X size={24} />
              </button>
            </div>
          </div>

          <div 
            className="lightbox__content"
            onClick={e => e.stopPropagation()}
            onWheel={handleWheel}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
          >
            {showThumbnails && (
              <button className="lightbox__nav lightbox__nav--prev" onClick={handlePrevious} aria-label="Предыдущее">
                <ChevronLeft size={32} />
              </button>
            )}

            <div
              ref={lightboxImageRef}
              className={`lightbox__image-wrapper ${isDragging ? 'lightbox__image-wrapper--dragging' : ''}`}
              style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={getImageUrl(currentImage.fullUrl)}
                alt={currentImage.title}
                className="lightbox__image"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
                draggable={false}
              />
            </div>

            {showThumbnails && (
              <button className="lightbox__nav lightbox__nav--next" onClick={handleNext} aria-label="Следующее">
                <ChevronRight size={32} />
              </button>
            )}
          </div>

          {showThumbnails && (
            <div className="lightbox__thumbnails" onClick={e => e.stopPropagation()}>
              {galleryImages.map((img, index) => (
                <button
                  key={img.id}
                  className={`lightbox__thumb ${index === activeIndex ? 'lightbox__thumb--active' : ''}`}
                  onClick={() => { setActiveIndex(index); setZoom(1); setPan({ x: 0, y: 0 }); }}
                >
                  <img src={getImageUrl(img.thumbUrl)} alt={img.title} loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
});

ProductGallery.displayName = 'ProductGallery';
