import { PersonSummary, Person, CoPlayer } from '../data/persons.js';
import { personUrl } from './shared.js';

export interface PersonSummaryDto {
  url: string;
  name: string;
  professions: string[];
}

export interface PersonRatingDto {
  rating: number;
  numVotes: number;
  numTitles: number;
  updatedAt: string;
}

export interface PersonDto {
  url: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  professions: string[];
  rating: PersonRatingDto | null;
}

export interface CoPlayerDto {
  url: string;
  name: string;
  titleCount: number;
}

export function toPersonSummaryDto(p: PersonSummary, base: string): PersonSummaryDto {
  return {
    url: personUrl(base, p.nconst),
    name: p.name,
    professions: p.professions,
  };
}

export function toPersonDto(p: Person, base: string): PersonDto {
  return {
    url: personUrl(base, p.nconst),
    name: p.name,
    birthYear: p.birthYear,
    deathYear: p.deathYear,
    professions: p.professions,
    // A person has no rating when none of their titles has votes.
    rating: p.rating === null
      ? null
      : {
          rating: p.rating,
          numVotes: p.numVotes!,
          numTitles: p.numTitles!,
          updatedAt: p.ratingUpdatedAt!.toISOString(),
        },
  };
}

export function toCoPlayerDto(c: CoPlayer, base: string): CoPlayerDto {
  return {
    url: personUrl(base, c.nconst),
    name: c.name,
    titleCount: c.titleCount,
  };
}
