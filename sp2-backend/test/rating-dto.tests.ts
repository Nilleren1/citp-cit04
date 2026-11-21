import { describe, it, expect } from 'vitest';
import { toRatingDto } from '../src/dto/ratings.js';

const row = {
  userId: 6,
  username: 'chris',
  tconst: 'tt0111161',
  title: 'The Shawshank Redemption',
  rating: 9,
  review: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
};

describe('toRatingDto', () => {
  it('builds the absolute url and keeps null fields', () => {
    const dto = toRatingDto(row, 'http://localhost:3000');

    expect(dto).toMatchObject({
      url: 'http://localhost:3000/users/6/ratings/tt0111161',
      rating: 9,
      review: null,
    });
  });

  it('serializes the timestamp as ISO 8601 UTC', () => {
    const json = JSON.parse(JSON.stringify(toRatingDto(row, 'http://localhost:3000')));

    expect(json.createdAt).toBe('2026-11-01T10:00:00.000Z');
  });
});