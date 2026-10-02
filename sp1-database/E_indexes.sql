-- E_indexes.sql
-- This script creates indexes for the database.

-- For D.9
-- title_genre and worked_on's own primary keys lead with tconst, so
-- "which titles share this genre/person" (get_similar_movies'
-- candidate generation) would otherwise be a full table scan.
CREATE INDEX IF NOT EXISTS title_genre_genre_idx ON title_genre (genre_name);
CREATE INDEX IF NOT EXISTS worked_on_nconst_idx  ON worked_on (nconst);

-- For D.10
-- Supports person_words, which filters person by lower(primaryname).
CREATE INDEX IF NOT EXISTS person_lower_primaryname_idx ON person (lower(primaryname));

-- For D.15
-- Supports get_trending_searches, which filters search_history by created_at.
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history (created_at);

-- Good for the co_players function, since it will count the rows in worked_on for a given nconst.
-- Without this index, each count will require a full scan of the worked_on table, which is very slow.
CREATE INDEX IF NOT EXISTS worked_on_nconst_idx ON worked_on (nconst);
ANALYZE worked_on;

EXPLAIN ANALYZE SELECT * FROM name_search('chalamet');