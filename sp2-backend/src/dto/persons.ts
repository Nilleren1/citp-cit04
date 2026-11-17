import { Person, PersonSummary, CoPlayer } from '../data/persons.js';
import { personUrl } from './shared.js';

export interface PersonDto {
  url: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  professions: string[];
  rating: { rating: number; numVotes: number; numTitles: number; updatedAt: string } | null;
}

export interface PersonSummaryDto {
  url: string;
  name: string;
  professions: string[];
}

export interface CoPlayerDto {
  url: string;
  name: string;
  titleCount: number;
}

export function toPersonDto(p: Person, base: string): PersonDto {
  return {
    url: personUrl(base, p.nconst),
    name: p.name,
    birthYear: p.birthYear,
    deathYear: p.deathYear,
    professions: p.professions,
    rating: p.rating
      ? { ...p.rating, updatedAt: p.rating.updatedAt.toISOString() }
      : null,
  };
}

export function toPersonSummaryDto(p: PersonSummary, base: string): PersonSummaryDto {
  return { url: personUrl(base, p.nconst), name: p.name, professions: p.professions };
}

export function toCoPlayerDto(c: CoPlayer, base: string): CoPlayerDto {
  return { url: personUrl(base, c.nconst), name: c.name, titleCount: c.titleCount };
}