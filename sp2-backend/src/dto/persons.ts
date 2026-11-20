// The JSON shapes of persons, and the functions that build them from the database rows.

import { PersonSummary, Person, CoPlayer } from '../data/persons.js';
import { personUrl } from './shared.js';

/** A person in a list (an item in GET /persons). */
export interface PersonSummaryDto {
  url: string;
  name: string;
  professions: string[];
}

/** A person's rating: the vote-weighted average of their titles' ratings (name_rating, D7). */
export interface PersonRatingDto {
  rating: number;
  numVotes: number;
  numTitles: number;
  updatedAt: string;
}

/** GET /persons/:nconst. */
export interface PersonDto {
  url: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  professions: string[];
  rating: PersonRatingDto | null;
}

/** An item in GET /persons/:nconst/co-players. */
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
          // When rating is set, name_rating has a row, so these are set too.
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
