import { TitleSummary, Title, CastMember } from '../data/titles.js';
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

export interface CastMemberDto {
  url: string;
  name: string;
  workedOn: {
    category: string;
    characters: string[];
  };
}

export interface TitleDto {
  url: string;
  title: string;
  type: string;
  originalTitle: string | null;
  isAdult: boolean | null;
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

// worked_on.characters holds one character per credit, written like a list: "['Bruce Wayne']".
// Names can contain apostrophes ("['Sheriff's Deputy']"), so it is not valid JSON.
function parseCharacters(raw: string | null): string[] {
  if (raw === null || raw === '') return [];
  const inner = raw.startsWith("['") && raw.endsWith("']") ? raw.slice(2, -2) : raw;
  return inner.split("', '").filter((name) => name !== '');
}

export function toCastMemberDto(c: CastMember, base: string): CastMemberDto {
  return {
    url: personUrl(base, c.nconst),
    name: c.name,
    workedOn: {
      category: c.category,
      characters: parseCharacters(c.characters),
    },
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
