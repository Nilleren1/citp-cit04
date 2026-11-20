// ---- Shared ----

export interface Page<T> {
  url: string;
  items: T[];
  limit: number;
  offset: number;
  next: string | null;
  prev: string | null;
}
export interface TitleRef {
  url: string;
  title: string;
}
export interface PersonRef {
  url: string;
  name: string;
}
export interface UserRef {
  url: string;
  username: string;
}

// ---- Titles ----

export interface CastMember {
  url: string;
  name: string;
  workedOn: {
    category: string;
    characters: string[];
  };
}

export interface Title {
  url: string;
  title: string;
  originalTitle: string;
  type: string;
  isAdult: boolean;
  startYear: number | null;
  endYear: number | null;
  runtimeMinutes: number | null;
  averageRating: number | null;
  numVotes: number | null;
  plot: string | null;
  poster: string | null;
  genres: string[];
  cast: CastMember[];
}

export interface TitleSummary {
  url: string;
  title: string;
  type: string;
  startYear: number | null;
  poster: string | null;
  averageRating: number | null;
}

// ---- Persons ----

export interface PersonRating {
  rating: number;
  numVotes: number;
  numTitles: number;
  updatedAt: string;
}

export interface Person {
  url: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  professions: string[];
  rating: PersonRating | null;
}

export interface PersonSummary {
  url: string;
  name: string;
  professions: string[];
}

export interface CoPlayer {
  url: string;
  name: string;
  titleCount: number;
}

export function toPersonDto(person: { nconst: string; primaryName: string; birthYear: number | null; deathYear: number | null }): PersonSummary {
  return {
    url: `/persons/${person.nconst}`,
    name: person.primaryName,
    professions: []
  };
}

// ---- Extra ----

export interface Keyword {
  word: string;
  frequency: number;
  search: string;
}

export interface TrendingSearch {
  query: string;
  count: number;
  search: string;
}

// ---- Users, tokens, ratings, bookmarks, history ----

export interface User {
  url: string;
  username: string;
  createdAt: string;
}

export interface Token {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: UserRef;
}

export interface Rating {
  url: string;
  user: UserRef;
  title: TitleRef;
  rating: number;
  review: string | null;
  createdAt: string;
}

export type BookmarkList = 'watched' | 'watchlist';

export interface TitleBookmark {
  url: string;
  title: TitleRef;
  list: BookmarkList;
  createdAt: string;
}

export interface PersonBookmark {
  url: string;
  person: PersonRef;
  createdAt: string;
}

export interface SearchEntry {
  url: string;
  query: string;
  createdAt: string;
}

// ---- Errors ----

export interface ErrorBody {
  status: number;
  error: string;
  message: string;
  details: { field: string; message: string }[];
}