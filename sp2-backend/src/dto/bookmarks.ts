import { TitleBookmark, PersonBookmark } from '../data/bookmarks.js';
import { SearchEntry } from '../data/search_history.js';
import { TitleRef, PersonRef, titleUrl, personUrl, userUrl } from './shared.js';

export interface TitleBookmarkDto {
  url: string;
  title: TitleRef;
  list: 'watched' | 'watchlist';
  createdAt: string;
}

export interface PersonBookmarkDto {
  url: string;
  person: PersonRef;
  createdAt: string;
}

export interface SearchEntryDto {
  url: string;
  query: string;
  createdAt: string;
}

export function toTitleBookmarkDto(b: TitleBookmark, base: string): TitleBookmarkDto {
  return {
    url: `${userUrl(base, b.userId)}/title-bookmarks/${b.tconst}`,
    title: { url: titleUrl(base, b.tconst), title: b.title },
    list: b.list,
    createdAt: b.createdAt.toISOString(),
  };
}

export function toPersonBookmarkDto(b: PersonBookmark, base: string): PersonBookmarkDto {
  return {
    url: `${userUrl(base, b.userId)}/person-bookmarks/${b.nconst}`,
    person: { url: personUrl(base, b.nconst), name: b.name },
    createdAt: b.createdAt.toISOString(),
  };
}

export function toSearchEntryDto(e: SearchEntry, base: string): SearchEntryDto {
  return {
    url: `${userUrl(base, e.userId)}/search-history/${e.historyId}`,
    query: e.query,
    createdAt: e.createdAt.toISOString(),
  };
}