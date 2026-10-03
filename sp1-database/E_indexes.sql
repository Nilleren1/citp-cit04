-- E_indexes.sql
-- This script creates indexes for the database.

-- For D.9, D.6 
-- Without these indexes, each count will require a full scan of the worked_on and title_genre tables, which is very slow.
CREATE INDEX IF NOT EXISTS title_genre_genre_idx ON title_genre (genre_name);
CREATE INDEX IF NOT EXISTS worked_on_nconst_idx  ON worked_on (nconst);

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

ANALYZE search_history;

EXPLAIN ANALYZE
SELECT * FROM search_history
WHERE created_at >= now() - interval '7 days';