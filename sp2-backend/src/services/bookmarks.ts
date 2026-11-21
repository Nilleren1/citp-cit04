import * as bookmarks from '../data/bookmarks.js';
import type { BookmarkList } from '../data/bookmarks.js';
import * as titles from '../data/titles.js';
import { pgCode } from '../middleware/errors.js';

// ---- Title bookmarks ----

export async function listTitleBookmarks(userId: number, list: BookmarkList | undefined, limit: number, offset: number) {
  return bookmarks.listTitleBookmarks(userId, list, limit, offset);
}

export async function findTitleBookmark(userId: number, tconst: string) {
  return bookmarks.findTitleBookmark(userId, tconst);
}

export async function createTitleBookmark(userId: number, tconst: string, list: BookmarkList): Promise<'created' | 'already-exists' | 'no-such-title'> {
  if (!(await titles.exists(tconst))) return 'no-such-title';

  try {
    await bookmarks.addTitleBookmark(userId, tconst, list);
    return 'created';
  } catch (err) {
    if (pgCode(err) === '23505') return 'already-exists';
    throw err;
  }
}

export async function updateTitleBookmark(userId: number, tconst: string, list: BookmarkList): Promise<'updated' | 'not-found'> {
  return (await bookmarks.updateTitleBookmark(userId, tconst, list)) ? 'updated' : 'not-found';
}

export async function removeTitleBookmark(userId: number, tconst: string): Promise<boolean> {
  return bookmarks.removeTitleBookmark(userId, tconst);
}

// ---- Person bookmarks ----

export async function listPersonBookmarks(userId: number, limit: number, offset: number) {
  return bookmarks.listPersonBookmarks(userId, limit, offset);
}

export async function findPersonBookmark(userId: number, nconst: string) {
  return bookmarks.findPersonBookmark(userId, nconst);
}

export async function createPersonBookmark(userId: number, nconst: string): Promise<'created' | 'already-exists' | 'no-such-person'> {
  if (await bookmarks.findPersonBookmark(userId, nconst)) return 'already-exists';

  try {
    await bookmarks.addPersonBookmark(userId, nconst);
    return 'created';
  } catch (err) {
    if (pgCode(err) === '23503') return 'no-such-person';
    throw err;
  }
}

export async function removePersonBookmark(userId: number, nconst: string): Promise<boolean> {
  return bookmarks.removePersonBookmark(userId, nconst);
}