-- E_indexes.sql
-- This script creates indexes for the database.

-- D.1
-- finds one user's history, already sorted newest first
CREATE INDEX IF NOT EXISTS search_history_user_idx ON search_history (user_id, created_at DESC);

-- D.3, D.7 + get_title_reviews
-- rating's key leads with user_id, so "all ratings of a title" needs its own index
CREATE INDEX IF NOT EXISTS rating_tconst_idx ON rating (tconst);

-- D.5, D.6 and D.9
-- Good for the co_players function, since it will count the rows in worked_on for a given nconst.
-- Without this index, each count will require a full scan of the worked_on table, which is very slow.
CREATE INDEX IF NOT EXISTS worked_on_nconst_idx  ON worked_on (nconst);

-- For D.9
-- title_genre and worked_on's own primary keys lead with tconst, so
-- "which titles share this genre/person" (get_similar_movies'
-- candidate generation) would otherwise be a full table scan.
CREATE INDEX IF NOT EXISTS title_genre_genre_idx ON title_genre (genre_name);

-- for D.13
-- title_word's key leads with tconst; (word, tconst) answers word lookups from the index alone
CREATE INDEX IF NOT EXISTS title_word_idx ON title_word (word, tconst);

ANALYZE title_genre;
ANALYZE worked_on;

EXPLAIN ANALYZE
SELECT tconst FROM title_genre
WHERE genre_name = (SELECT name FROM genre LIMIT 1);

EXPLAIN ANALYZE
SELECT tconst FROM worked_on
WHERE nconst = (SELECT nconst FROM person LIMIT 1);

-- For D.10 (person_words)
-- Supports person_words, which filters person by lower(primaryname).
CREATE INDEX IF NOT EXISTS person_lower_primaryname_idx ON person (lower(primaryname));

ANALYZE person;

EXPLAIN ANALYZE
SELECT nconst FROM person
WHERE lower(primaryname) = (SELECT lower(primaryname) FROM person LIMIT 1);

-- For D.11 (exact_match_search)
-- title_word's own primary key leads with tconst, not word, so a
-- per-keyword lookup would otherwise be a full scan of the largest
-- table in the schema.
CREATE INDEX IF NOT EXISTS title_word_word_idx ON title_word (word);

ANALYZE title_word;

EXPLAIN ANALYZE
SELECT tconst FROM title_word
WHERE word = (SELECT word FROM word_index LIMIT 1);

-- For D.15 (get_trending_searches)
-- The WHERE created_at >= ... time-window filter would otherwise scan the whole table.
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history (created_at);

ANALYZE worked_on, title_word, title_genre, search_history;
