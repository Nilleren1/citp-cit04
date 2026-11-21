// The bookmark operations that have rules: creating one checks that the title or person
// exists and that it is not bookmarked already. Plain reads, the list change and deletes
// have no rules, so the routes call data/bookmarks.ts directly.

import * as bookmarks from '../data/bookmarks.js';
import type { BookmarkList } from '../data/bookmarks.js';
import * as titles from '../data/titles.js';
import { isForeignKeyViolation, isUniqueViolation } from '../db.js';

export async function createTitleBookmark(
  userId: number, tconst: string, list: BookmarkList,
): Promise<'created' | 'already-exists' | 'no-such-title'> {
  if (!(await titles.exists(tconst))) return 'no-such-title';

  try {
    await bookmarks.addTitleBookmark(userId, tconst, list);
    return 'created';
  } catch (err) {
    if (isUniqueViolation(err)) return 'already-exists';
    throw err;
  }
}

export async function createPersonBookmark(
  userId: number, nconst: string,
): Promise<'created' | 'already-exists' | 'no-such-person'> {
  if (await bookmarks.findPersonBookmark(userId, nconst)) return 'already-exists';

  try {
    await bookmarks.addPersonBookmark(userId, nconst);
    return 'created';
  } catch (err) {
    if (isForeignKeyViolation(err)) return 'no-such-person';
    throw err;
  }
}
