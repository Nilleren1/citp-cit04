import { TitleSummary } from '../data/titles.js';
import { titleUrl, personUrl } from './shared.js';

export interface TitleSummaryDto {
  url: string;
  title: string;
  type: string;
  startYear: number | null;
  poster: string | null;
  averageRating: number | null;
}

export function toTitleSummaryDto(t: TitleSummary, base: string): TitleSummaryDto {
  return {
    url: titleUrl(base, t.tconst),
    title: t.title,
    type: t.type,
    startYear: t.startYear,
    poster: t.poster,
    averageRating: t.averageRating,
  };
}
