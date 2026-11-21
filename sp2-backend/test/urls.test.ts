import { describe, it, expect } from 'vitest';
import { tconstFromUrl, nconstFromUrl } from '../src/routes/urls.js';

describe('tconstFromUrl', () => {
  it('extracts the id from a title URL', () => {
    expect(tconstFromUrl('http://localhost:3000/titles/tt0111161')).toBe('tt0111161');
  });

  it('rejects a URL on another host', () => {
    expect(tconstFromUrl('http://evil.com/titles/tt0111161')).toBeUndefined();
  });

  it('rejects a person URL and non-strings', () => {
    expect(tconstFromUrl('http://localhost:3000/persons/nm0000093')).toBeUndefined();
    expect(tconstFromUrl(42)).toBeUndefined();
  });
});

describe('nconstFromUrl', () => {
  it('extracts the id from a person URL', () => {
    expect(nconstFromUrl('http://localhost:3000/persons/nm0000093')).toBe('nm0000093');
  });
});