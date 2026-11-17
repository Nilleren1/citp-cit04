import { Title, TitleSummary, CastMember } from '../data/titles.js';
import { titleUrl, personUrl } from './shared.js';

export interface CastMemberDto {
  url: string;
  name: string;
  workedOn: { category: string; characters: string[] };
}

export interface TitleDto {
  url: string;
  title: string;
  type: string;
  originalTitle: string;
  isAdult: boolean;
  startYear: number | null;
  endYear: number | null;
  runtimeMinutes: number | null;
  averageRating: number | null;
  numVotes: number | null;
  plot: string | null;
  genres: string[];
  poster: string | null;
  cast: CastMemberDto[];
}

export interface TitleSummaryDto {
  url: string;
  title: string;
  type: string;
  startYear: number | null;
  poster: string | null;
  averageRating: number | null;
}

export function toCastMemberDto(c: CastMember, base: string): CastMemberDto {
  return {
    url: personUrl(base, c.nconst),
    name: c.name,
    workedOn: { category: c.category, characters: c.characters },
  };
}

export function toTitleDto(t: Title, cast: CastMember[], base: string): TitleDto {
  return {
    url: titleUrl(base, t.tconst),
    title: t.title,
    type: t.type,
    originalTitle: t.originalTitle,
    isAdult: t.isAdult,
    startYear: t.startYear,
    endYear: t.endYear,
    runtimeMinutes: t.runtimeMinutes,
    averageRating: t.averageRating,
    numVotes: t.numVotes,
    plot: t.plot,
    genres: t.genres,
    poster: t.poster,
    cast: cast.map((c) => toCastMemberDto(c, base)),
  };
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
