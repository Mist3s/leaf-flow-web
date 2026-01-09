import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReviewsData, Review } from '../types/reviews';

type Props = {
  data: ReviewsData | null;
  loading?: boolean;
};

const platformNames: Record<string, string> = {
  yandex: 'Яндекс',
  google: 'Google',
  telegram: 'Telegram',
  avito: 'Авито',
};

const platformIconFiles: Record<string, string> = {
  yandex: 'yandex_icon.svg',
  google: 'google_icon.svg',
  telegram: 'tg_icon.svg',
  avito: 'avito_icon.svg',
};

const ReviewCard = memo<{ review: Review }>(({ review }) => {
  return (
    <article className="review-card">
      <div className="review-card__header">
        <div className="review-card__author">
          <div className="review-card__avatar">
            {review.author.charAt(0)}
          </div>
          <div className="review-card__author-info">
            <span className="review-card__author-name">{review.author}</span>
            <span className="review-card__platform">
              <img
                src={`/icon/${platformIconFiles[review.platform]}`}
                alt={platformNames[review.platform]}
                className="review-card__platform-icon"
              />
              {platformNames[review.platform]}
            </span>
          </div>
        </div>
        <div className="review-card__rating">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              fill={i < review.rating ? 'currentColor' : 'none'}
              className={i < review.rating ? 'review-card__star--filled' : 'review-card__star--empty'}
            />
          ))}
        </div>
      </div>
      <p className="review-card__text">{review.text}</p>
      <time className="review-card__date">{formatDate(review.date)}</time>
    </article>
  );
});

ReviewCard.displayName = 'ReviewCard';

export const ReviewsBlock: React.FC<Props> = memo(({ data, loading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth <= 720 : false
  );
  const [isPaused, setIsPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 720);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Сбрасываем индекс при изменении количества слайдов
  useEffect(() => {
    const maxIdx = Math.max(0, (data?.reviews.length ?? 0) - (isMobile ? 1 : 3));
    if (currentIndex > maxIdx) {
      setCurrentIndex(maxIdx);
    }
  }, [isMobile, data?.reviews.length, currentIndex]);

  const slidesPerView = isMobile ? 1 : 3;
  const totalSlides = data?.reviews.length ?? 0;
  const maxIndex = Math.max(0, totalSlides - slidesPerView);

  // Автоматическое пролистывание
  useEffect(() => {
    if (isPaused || !data || totalSlides <= slidesPerView) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, maxIndex, totalSlides, slidesPerView, data]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, [maxIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchDeltaX.current = 0;
  }, [handlePrev, handleNext]);

  if (loading) {
    return (
      <div className="reviews-block reviews-block--loading">
        <div className="reviews-block__skeleton" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="reviews-block">
      {/* Заголовок с общей оценкой */}
      <div className="reviews-block__header">
        <div className="reviews-block__title">
          <h2>Отзывы покупателей</h2>
        </div>

        {/* Компактная сводка */}
        <div className="reviews-block__summary">
          <div className="reviews-block__total">
            <Star size={20} fill="currentColor" />
            <span className="reviews-block__total-rating">{data.averageRating.toFixed(1)}</span>
            <span className="reviews-block__total-count reviews-block__total-count--desktop">
              {data.totalReviews} {getReviewWord(data.totalReviews)}
            </span>
            <span className="reviews-block__total-count reviews-block__total-count--mobile">
              ({data.totalReviews})
            </span>
          </div>

          <div className="reviews-block__platforms">
            {data.platforms.map((platform) => (
              <a
                key={platform.platform}
                href={platform.reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="reviews-block__platform"
              >
                <img
                  src={platform.iconUrl}
                  alt={platformNames[platform.platform]}
                  className="reviews-block__platform-icon"
                />
                <span className="reviews-block__platform-rating">
                  <Star size={12} fill="currentColor" />
                  {platform.rating.toFixed(1)}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Слайдер отзывов */}
      <div 
        className="reviews-slider"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          ref={sliderRef}
          className="reviews-slider__track"
          style={{
            transform: `translateX(-${currentIndex * (100 / slidesPerView)}%)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {data.reviews.map((review) => (
            <div
              key={review.id}
              className="reviews-slider__slide"
              style={{ flex: `0 0 ${100 / slidesPerView}%` }}
            >
              <ReviewCard review={review} />
            </div>
          ))}
        </div>

        {/* Навигация */}
        {totalSlides > slidesPerView && (
          <div className="reviews-slider__nav">
            <button
              className="reviews-slider__nav-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Предыдущий отзыв"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="reviews-slider__counter">
              {currentIndex + 1} / {maxIndex + 1}
            </span>
            <button
              className="reviews-slider__nav-btn"
              onClick={handleNext}
              disabled={currentIndex === maxIndex}
              aria-label="Следующий отзыв"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
});

ReviewsBlock.displayName = 'ReviewsBlock';

function getReviewWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return 'отзывов';
  if (lastOne === 1) return 'отзыв';
  if (lastOne >= 2 && lastOne <= 4) return 'отзыва';
  return 'отзывов';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

