-- E_indexes.sql
-- This script creates indexes for the database.

-- D.1
-- finds one user's history, already sorted newest first
CREATE INDEX IF NOT EXISTS search_history_user_idx ON search_history (user_id, created_at DESC);

-- D.3, D.7 + get_title_reviews
-- rating's key leads with user_id, so "all ratings of a title" needs its own index
CREATE INDEX IF NOT EXISTS rating_tconst_idx ON rating (tconst);

-- D.5, D.6 and D.9
-- worked_on's primary key leads with tconst, so looking up a person's
-- credits by nconst would otherwise scan the whole table.
CREATE INDEX IF NOT EXISTS worked_on_nconst_idx ON worked_on (nconst);

-- D.9
-- title_genre's primary key leads with tconst, so "which titles share
-- this genre" (get_similar_movies' candidate generation) would
-- otherwise be a full table scan.
CREATE INDEX IF NOT EXISTS title_genre_genre_idx ON title_genre (genre_name);

-- D.10 (person_words)
-- Supports person_words, which filters person by lower(primaryname).
CREATE INDEX IF NOT EXISTS person_lower_primaryname_idx ON person (lower(primaryname));

-- D.11, D.12 and D.13
-- title_word's primary key leads with tconst, not word, so a per-keyword
-- lookup would otherwise scan the largest table in the schema.
-- (word, tconst) answers word lookups from the index alone.
CREATE INDEX IF NOT EXISTS title_word_idx ON title_word (word, tconst);

-- D.15 (get_trending_searches)
-- The WHERE created_at >= ... time-window filter would otherwise scan the whole table.
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history (created_at);

-- Update planner statistics for the tables B2 has just filled.
-- The framework tables are empty at this point and need no statistics.
ANALYZE title_genre, worked_on, person, title_word;