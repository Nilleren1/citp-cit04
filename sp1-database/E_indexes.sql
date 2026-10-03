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

-- For D.15
-- Supports get_trending_searches, which filters search_history by created_at.
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history (created_at);

ANALYZE worked_on, title_word, title_genre;