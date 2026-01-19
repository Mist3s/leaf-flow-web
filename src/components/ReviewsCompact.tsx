import React, { memo } from 'react';
import { Star } from 'lucide-react';
import { PlatformRating } from '../types/reviews';

type ReviewsStatsData = {
  averageRating: number;
  totalReviews: number;
  platforms: PlatformRating[];
};

type Props = {
  data: ReviewsStatsData | null;
  loading?: boolean;
};

const platformNames: Record<string, string> = {
  yandex: 'Яндекс',
  google: 'Google',
  telegram: 'Telegram',
  avito: 'Авито',
};

export const ReviewsCompact: React.FC<Props> = memo(({ data, loading }) => {
  if (loading) {
    return (
      <div className="reviews-compact reviews-compact--loading">
        <div className="reviews-compact__skeleton" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="reviews-compact">
      {/* Общая оценка */}
      <div className="reviews-compact__summary">
        <div className="reviews-compact__rating">
          <Star size={18} fill="currentColor" />
          <span className="reviews-compact__rating-value">{data.averageRating.toFixed(1)}</span>
        </div>
        <div className="reviews-compact__count">
          {data.totalReviews} {getReviewWord(data.totalReviews)}
        </div>
      </div>

      {/* Разделитель */}
      <div className="reviews-compact__divider" />

      {/* Платформы */}
      <div className="reviews-compact__platforms">
        {data.platforms.map((platform) => (
          <a
            key={platform.platform}
            href={platform.reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reviews-compact__platform"
          >
            <img
              src={platform.iconUrl}
              alt={platformNames[platform.platform]}
              className="reviews-compact__platform-icon"
            />
            <span className="reviews-compact__platform-rating">
              <Star size={12} fill="currentColor" />
              {platform.rating.toFixed(1)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
});

ReviewsCompact.displayName = 'ReviewsCompact';

function getReviewWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return 'отзывов';
  if (lastOne === 1) return 'отзыв';
  if (lastOne >= 2 && lastOne <= 4) return 'отзыва';
  return 'отзывов';
}

