export type ReviewPlatform = 'yandex' | 'google' | 'telegram' | 'avito';

export interface PlatformRating {
  platform: ReviewPlatform;
  rating: number;
  reviewCount: number;
  iconUrl: string;
  reviewsUrl: string;
}

export interface Review {
  id: string;
  platform: ReviewPlatform;
  author: string;
  avatarUrl?: string;
  rating: number;
  text: string;
  date: string;
}

export interface ReviewsData {
  averageRating: number;
  totalReviews: number;
  platforms: PlatformRating[];
  reviews: Review[];
}

