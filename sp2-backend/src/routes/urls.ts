import { BASE_URL } from '../config.js';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TITLE_URL = new RegExp(`^${escape(BASE_URL)}/titles/(tt\\d{7,9})$`);
const PERSON_URL = new RegExp(`^${escape(BASE_URL)}/persons/(nm\\d{7,9})$`);

export const tconstFromUrl = (value: unknown): string | undefined =>
  typeof value === 'string' ? TITLE_URL.exec(value)?.[1] : undefined;

export const nconstFromUrl = (value: unknown): string | undefined =>
  typeof value === 'string' ? PERSON_URL.exec(value)?.[1] : undefined;