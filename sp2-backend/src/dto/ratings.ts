import { Rating } from '../data/ratings.js';
import { UserRef, TitleRef, userUrl, titleUrl } from './shared.js';

export interface RatingDto {
  url: string;
  user: UserRef;
  title: TitleRef;
  rating: number;
  review: string | null;
  createdAt: string;
}

export function toRatingDto(r: Rating, base: string): RatingDto {
  const user = userUrl(base, r.userId);
  return {
    url: `${user}/ratings/${r.tconst}`,
    user: { url: user, username: r.username },
    title: { url: titleUrl(base, r.tconst), title: r.title },
    rating: r.rating,
    review: r.review,
    createdAt: r.createdAt.toISOString(),
  };
}