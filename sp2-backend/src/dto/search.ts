import { TrendingSearch } from '../data/search_history.js';
import { Keyword } from '../data/keywords.js';

export interface KeywordDto {
  word: string;
  frequency: number;
  search: string;
}

export interface TrendingSearchDto {
  query: string;
  count: number;
  search: string;
}

export function toKeywordDto(k: Keyword, base: string, query?: string): KeywordDto {
  const q = query ? `${query} ${k.word}` : k.word;
  return {
    word: k.word,
    frequency: k.frequency,
    search: titleSearchUrl(base, { q, match: 'exact' }),
  };
}

export function toTrendingSearchDto(t: TrendingSearch, base: string): TrendingSearchDto {
  return { query: t.query, count: t.count, search: titleSearchUrl(base, { q: t.query }) };
}