-- D_functions.sql
-- This script creates custom functions for the database.

-- D1_framework_functions (task 1-D.1)

-- 0. Wipe-out of old versions
DROP FUNCTION IF EXISTS create_user(varchar, text);
DROP FUNCTION IF EXISTS get_user(varchar);
DROP FUNCTION IF EXISTS update_password(integer, text);
DROP FUNCTION IF EXISTS delete_user(integer);
DROP FUNCTION IF EXISTS add_person_bookmark(integer, character(10));
DROP FUNCTION IF EXISTS remove_person_bookmark(integer, character(10));
DROP FUNCTION IF EXISTS get_person_bookmarks(integer);
DROP FUNCTION IF EXISTS add_title_bookmark(integer, character(10), varchar);
DROP FUNCTION IF EXISTS update_title_bookmark_status(integer, character(10), varchar);
DROP FUNCTION IF EXISTS remove_title_bookmark(integer, character(10));
DROP FUNCTION IF EXISTS get_title_bookmarks(integer, varchar);
DROP FUNCTION IF EXISTS log_search(integer, text);
DROP FUNCTION IF EXISTS get_search_history(integer, integer);
DROP FUNCTION IF EXISTS clear_search_history(integer);
DROP FUNCTION IF EXISTS get_user_ratings(integer);

-- 1. User management
-- Add
CREATE FUNCTION create_user(p_username varchar, p_password text)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_user_id integer;
BEGIN
    IF p_username IS NULL OR btrim(p_username) = '' THEN
        RAISE EXCEPTION 'Username must not be empty';
    END IF;
    IF p_password IS NULL OR p_password = '' THEN
        RAISE EXCEPTION 'Password must not be empty';
    END IF;

    INSERT INTO app_user (username, password)
    VALUES (btrim(p_username), p_password)
    RETURNING user_id INTO v_user_id;

    RETURN v_user_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Username "%" is already taken', btrim(p_username)
            USING ERRCODE = 'unique_violation';
END $$;

-- Get
CREATE FUNCTION get_user(p_username varchar)
RETURNS TABLE (user_id integer, username varchar, password text, created_at timestamptz)
LANGUAGE sql STABLE AS $$
    SELECT u.user_id, u.username, u.password, u.created_at
    FROM app_user u
    WHERE u.username = btrim(p_username);
$$;

-- Update
CREATE FUNCTION update_password(p_user_id integer, p_password text)
RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
    IF p_password IS NULL OR p_password = '' THEN
        RAISE EXCEPTION 'Password must not be empty';
    END IF;

    UPDATE app_user SET password = p_password WHERE user_id = p_user_id;
    RETURN FOUND;
END $$;

-- Delete
CREATE FUNCTION delete_user(p_user_id integer)
RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM app_user WHERE user_id = p_user_id;
    RETURN FOUND;
END $$;

-- 2. Bookmarking people
-- Add
CREATE FUNCTION add_person_bookmark(p_user_id integer, p_nconst character(10))
RETURNS void
LANGUAGE sql AS $$
    INSERT INTO bookmark_person (user_id, nconst)
    VALUES (p_user_id, p_nconst)
    ON CONFLICT (user_id, nconst) DO NOTHING;
$$;

-- Delete
CREATE FUNCTION remove_person_bookmark(p_user_id integer, p_nconst character(10))
RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM bookmark_person
    WHERE user_id = p_user_id AND nconst = p_nconst;
    RETURN FOUND;
END $$;

-- Get all
CREATE FUNCTION get_person_bookmarks(p_user_id integer)
RETURNS TABLE (nconst text, primaryname text, birthyear text, deathyear text,
               bookmarked_at timestamptz)
LANGUAGE sql STABLE AS $$
    SELECT rtrim(p.nconst)::text,
           p.primaryname::text,
           p.birthyear::text,
           p.deathyear::text,
           b.created_at
    FROM bookmark_person b
    JOIN person p ON p.nconst = b.nconst
    WHERE b.user_id = p_user_id
    ORDER BY b.created_at DESC, p.primaryname;
$$;

-- 3. Bookmarking titles
-- Add
CREATE FUNCTION add_title_bookmark(p_user_id integer, p_tconst character(10),
                                   p_status varchar DEFAULT 'watchlist')
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF p_status NOT IN ('watched', 'watchlist') THEN
        RAISE EXCEPTION 'Invalid status "%": must be watched or watchlist', p_status;
    END IF;

    INSERT INTO bookmark_title (user_id, tconst, status)
    VALUES (p_user_id, p_tconst, p_status);
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Title % is already bookmarked by user %', rtrim(p_tconst), p_user_id
            USING ERRCODE = 'unique_violation';
END $$;

-- Update
CREATE FUNCTION update_title_bookmark_status(p_user_id integer, p_tconst character(10),
                                             p_status varchar)
RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
    IF p_status NOT IN ('watched', 'watchlist') THEN
        RAISE EXCEPTION 'Invalid status "%": must be watched or watchlist', p_status;
    END IF;

    UPDATE bookmark_title SET status = p_status
    WHERE user_id = p_user_id AND tconst = p_tconst;
    RETURN FOUND;
END $$;

-- Delete
CREATE FUNCTION remove_title_bookmark(p_user_id integer, p_tconst character(10))
RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM bookmark_title
    WHERE user_id = p_user_id AND tconst = p_tconst;
    RETURN FOUND;
END $$;

-- Get all
CREATE FUNCTION get_title_bookmarks(p_user_id integer, p_status varchar DEFAULT NULL)
RETURNS TABLE (tconst text, primarytitle text, titletype text, startyear text,
               averagerating numeric, poster text, status text,
               bookmarked_at timestamptz)
LANGUAGE sql STABLE AS $$
    SELECT rtrim(t.tconst)::text,
           t.primarytitle,
           t.titletype::text,
           t.startyear::text,
           t.averagerating,
           t.poster::text,
           b.status::text,
           b.created_at
    FROM bookmark_title b
    JOIN title t ON t.tconst = b.tconst
    WHERE b.user_id = p_user_id
      AND (p_status IS NULL OR b.status = p_status)
    ORDER BY b.created_at DESC, t.primarytitle;
$$;

-- 4. Search history
-- Add
CREATE FUNCTION log_search(p_user_id integer, p_query text)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_history_id integer;
BEGIN
    IF p_query IS NULL OR btrim(p_query) = '' THEN
        RETURN NULL;
    END IF;

    INSERT INTO search_history (user_id, query)
    VALUES (p_user_id, btrim(p_query))
    RETURNING history_id INTO v_history_id;

    RETURN v_history_id;
END $$;

-- Get all
CREATE FUNCTION get_search_history(p_user_id integer, p_limit integer DEFAULT 20)
RETURNS TABLE (history_id integer, query text, searched_at timestamptz)
LANGUAGE sql STABLE AS $$
    SELECT h.history_id, h.query, h.created_at
    FROM search_history h
    WHERE h.user_id = p_user_id
    ORDER BY h.created_at DESC, h.history_id DESC
    LIMIT p_limit;
$$;

-- Delete
CREATE FUNCTION clear_search_history(p_user_id integer)
RETURNS integer
LANGUAGE sql AS $$
    WITH deleted AS (
        DELETE FROM search_history WHERE user_id = p_user_id RETURNING 1
    )
    SELECT count(*)::integer FROM deleted;
$$;

-- 5. Rating
-- Get all
CREATE FUNCTION get_user_ratings(p_user_id integer)
RETURNS TABLE (tconst text, primarytitle text, rating smallint, review text,
               rated_at timestamptz)
LANGUAGE sql STABLE AS $$
    SELECT rtrim(t.tconst)::text,
           t.primarytitle,
           r.rating,
           r.review,
           r.created_at
    FROM rating r
    JOIN title t ON t.tconst = r.tconst
    WHERE r.user_id = p_user_id
    ORDER BY r.created_at DESC, t.primarytitle;
$$;

-- D2_string_search (task 1-D.2)

DROP FUNCTION IF EXISTS string_search(text, integer);

CREATE FUNCTION string_search(p_search_string text, p_user_id integer DEFAULT NULL)
RETURNS TABLE (tconst text, primarytitle text)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_search_string IS NULL OR btrim(p_search_string) = '' THEN
        RAISE EXCEPTION 'Search string must not be empty';
    END IF;

    IF p_user_id IS NOT NULL THEN
        PERFORM log_search(p_user_id, p_search_string);
    END IF;

    RETURN QUERY
    SELECT rtrim(t.tconst)::text, t.primarytitle
    FROM title t
    WHERE position(lower(p_search_string) IN lower(t.primarytitle)) > 0
       OR position(lower(p_search_string) IN lower(t.plot)) > 0
    ORDER BY t.primarytitle;
END $$;

-- D3_title_rating (task 1-D.3)

DROP FUNCTION IF EXISTS rate(integer, character(10), integer, text);

CREATE FUNCTION rate(p_user_id integer, p_tconst character(10),
                     p_rating integer, p_review text DEFAULT NULL)
RETURNS TABLE (
    tconst        text,
    user_id       integer,
    rating        integer,
    review        text,
    is_new_rating boolean,
    rated_at      timestamptz,
    averagerating numeric,
    numvotes      integer
)
LANGUAGE plpgsql AS $$
DECLARE
    v_old_avg     numeric(5,1);
    v_votes       integer;
    v_prev_rating integer;
    v_new_avg     numeric(5,1);
    v_is_new      boolean;
    v_review      text;
    v_rated_at    timestamptz;
BEGIN
    IF p_rating IS NULL OR p_rating < 1 OR p_rating > 10 THEN
        RAISE EXCEPTION 'Rating must be an integer between 1 and 10, got %', p_rating;
    END IF;

    SELECT t.averagerating, t.numvotes INTO v_old_avg, v_votes
    FROM title t
    WHERE t.tconst = p_tconst
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No title with tconst %', p_tconst;
    END IF;

    v_votes := COALESCE(v_votes, 0);

    SELECT r.rating INTO v_prev_rating
    FROM rating r
    WHERE r.user_id = p_user_id AND r.tconst = p_tconst
    FOR UPDATE;

    IF FOUND THEN
        v_is_new := false;
        v_new_avg := ROUND(
            (COALESCE(v_old_avg, 0) * v_votes - v_prev_rating + p_rating)
            / v_votes, 1);

        UPDATE rating AS r
        SET rating = p_rating,
            review = COALESCE(p_review, r.review)
        WHERE r.user_id = p_user_id AND r.tconst = p_tconst
        RETURNING r.review, r.created_at INTO v_review, v_rated_at;
    ELSE
        v_is_new := true;
        v_new_avg := ROUND(
            (COALESCE(v_old_avg, 0) * v_votes + p_rating)
            / (v_votes + 1), 1);
        v_votes := v_votes + 1;

        INSERT INTO rating AS r (user_id, tconst, rating, review)
        VALUES (p_user_id, p_tconst, p_rating, p_review)
        RETURNING r.review, r.created_at INTO v_review, v_rated_at;
    END IF;

    UPDATE title AS t
    SET averagerating = v_new_avg, numvotes = v_votes
    WHERE t.tconst = p_tconst;

    -- Keeps the name_rating up to date when a new rating for title is added.
    -- Only defined once D7 has been run.
    IF to_regprocedure('update_name_ratings_for_title(character)') IS NOT NULL THEN
        PERFORM update_name_ratings_for_title(p_tconst);
    END IF;
 
    RETURN QUERY
    SELECT rtrim(p_tconst)::text, p_user_id, p_rating, v_review,
           v_is_new, v_rated_at, v_new_avg::numeric, v_votes;
END $$;

DROP FUNCTION IF EXISTS delete_rating(integer, character(10));

CREATE FUNCTION delete_rating(p_user_id integer, p_tconst character(10))
RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
    v_old_avg      numeric(5,1);
    v_votes        integer;
    v_removed_rating integer;
    v_new_avg      numeric(5,1);
    v_new_votes    integer;
BEGIN
    SELECT t.averagerating, t.numvotes INTO v_old_avg, v_votes
    FROM title t
    WHERE t.tconst = p_tconst
    FOR UPDATE;
 
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No title with tconst %', p_tconst;
    END IF;
 
    DELETE FROM rating AS r
    WHERE r.user_id = p_user_id AND r.tconst = p_tconst
    RETURNING r.rating INTO v_removed_rating;
 
    IF NOT FOUND THEN
        RETURN false;
    END IF;
 
    v_new_votes := v_votes - 1;
 
    IF v_new_votes <= 0 THEN
        v_new_avg   := NULL;
        v_new_votes := NULL;
    ELSE
        v_new_avg := ROUND(
            (COALESCE(v_old_avg, 0) * v_votes - v_removed_rating)
            / v_new_votes, 1);
    END IF;
 
    UPDATE title AS t
    SET averagerating = v_new_avg, numvotes = v_new_votes
    WHERE t.tconst = p_tconst;
 
    IF to_regprocedure('refresh_name_ratings_for_title(character)') IS NOT NULL THEN
        PERFORM refresh_name_ratings_for_title(p_tconst);
    END IF;
 
    RETURN true;
END $$;

-- D4_structured_search_functions (task 1-D.4)
--
-- Design decisions:
-- You can filter on any combination of the four parameters: title, plot,
-- characters and person names. You don't have to include all four parameters.
-- Atleast one parameter must be provided.
--
-- NULL, empty strings and whitespace-only values are treated as missing parameters
-- using COALESCE() and btrim().
--
-- ILIKE could be used for case-insensitive substring matching, but it treats
-- characters such as % and _ as wildcard characters. We want these characters
-- to be treated as normal search characters instead.
--
-- Therefore, POSITION() is used together with LOWER(). POSITION() finds the
-- first occurrence of a substring, while LOWER() makes the comparison
-- case-insensitive.
--
-- LEFT JOIN is used so titles without credits are not automatically removed
-- from the result. When person_name is not provided, these titles can still
-- satisfy the other search criteria.
--
-- DISTINCT removes duplicate titles when one title has multiple matching worked_on/person rows.
--
-- The search is logged to the users search history. Only provided parameters are logged.
-- example: "title=Batman, person=Christian Bale" instead of "title=Batman, plot=, characters=, person=Christian Bale"
--
-- tconst is stored as CHAR(10), so rtrim() removes any trailing padding spaces before returning it as text.

DROP FUNCTION IF EXISTS structured_string_search(text, text, text, text, integer);

CREATE FUNCTION structured_string_search(
    p_title       text,
    p_plot        text,
    p_characters  text,
    p_person_name text,
    p_user_id     integer DEFAULT NULL
)
RETURNS TABLE (tconst text, primarytitle text)
LANGUAGE plpgsql AS $$
DECLARE
    v_query_text text;
BEGIN
    IF btrim(COALESCE(p_title, '')) = ''
       AND btrim(COALESCE(p_plot, '')) = ''
       AND btrim(COALESCE(p_characters, '')) = ''
       AND btrim(COALESCE(p_person_name, '')) = '' THEN
        RAISE EXCEPTION 'At least one of title, plot, characters or person name must be given';
    END IF;

    IF p_user_id IS NOT NULL THEN
        SELECT string_agg(part, ', ') INTO v_query_text
        FROM (VALUES ('title=' || p_title),
                      ('plot=' || p_plot),
                      ('characters=' || p_characters),
                      ('person=' || p_person_name)) AS parts(part)
        WHERE part IS NOT NULL
          AND part NOT IN ('title=', 'plot=', 'characters=', 'person=');
        PERFORM log_search(p_user_id, v_query_text);
    END IF;

    RETURN QUERY
    SELECT DISTINCT rtrim(t.tconst)::text, t.primarytitle
    FROM title t
    LEFT JOIN worked_on wo ON wo.tconst = t.tconst
    LEFT JOIN person    p  ON p.nconst  = wo.nconst
    WHERE (btrim(COALESCE(p_title, ''))      = '' OR position(lower(p_title)      IN lower(t.primarytitle))  > 0)
      AND (btrim(COALESCE(p_plot, ''))       = '' OR position(lower(p_plot)       IN lower(t.plot))          > 0)
      AND (btrim(COALESCE(p_characters, '')) = '' OR position(lower(p_characters) IN lower(wo.characters))   > 0)
      AND (btrim(COALESCE(p_person_name, '')) = '' OR position(lower(p_person_name) IN lower(p.primaryname)) > 0)
    ORDER BY t.primarytitle;
END $$;



-- =====================================================================
--  D.6 Co-players (task 1-D.6)
-- =====================================================================
-- collects the most important columns from title, principals and name in a single virtual table.
CREATE OR REPLACE VIEW title_person AS
SELECT t.tconst, t.primarytitle, t.startyear, t.titletype, p.nconst, p.primaryname, w.category, w.job, w.characters, w.ordering
FROM
    title t
    JOIN worked_on w ON w.tconst = t.tconst
    JOIN person p ON p.nconst = w.nconst;

-- function that, given the name of an actor, will return a list of actors that are the most frequent co-players to the given actor.
CREATE OR REPLACE FUNCTION co_players(p_actor_name text)
RETURNS TABLE (nconst character(10), primaryname varchar, frequency bigint)
LANGUAGE sql AS $$
    SELECT other.nconst, other.primaryname, count(DISTINCT other.tconst) AS frequency
    FROM title_person me
    JOIN title_person other ON other.tconst = me.tconst
    WHERE me.primaryname = p_actor_name
      AND me.category    IN ('actor', 'actress')
      AND other.category IN ('actor', 'actress')
      AND other.nconst  <> me.nconst
    GROUP BY other.nconst, other.primaryname
    ORDER BY frequency DESC, other.primaryname;
$$;

-- D7_name_rating (task 1-D.7)

-- Design decisions:
-- Calculate the rating for all persons not just actors.
--
-- Created a new table name_rating with the weigthed rating, number of titles 
-- and number of votes
--
-- Added some code at the end of D3 which will keep the name_rating updated
-- when a new rating for a title is added.
--
-- Using "SELECT DISTINCT wo.nconst, wo.tconst" to ensure that a person with
-- more than one worked_on row for the same title is only counted once.

-- 1. Table
DROP TABLE IF EXISTS name_rating;

CREATE TABLE name_rating (
    nconst      character(10)   PRIMARY KEY REFERENCES person(nconst),
    rating      numeric(5,1)    NOT NULL,
    numvotes    integer         NOT NULL,
    num_titles  integer         NOT NULL,
    updated_at  timestamptz     NOT NULL DEFAULT now()
);

-- 2. Functions
DROP FUNCTION IF EXISTS update_name_ratings();
DROP FUNCTION IF EXISTS update_name_ratings_for_title(character(10));

-- Updates all name ratings-
CREATE FUNCTION update_name_ratings()
RETURNS void
LANGUAGE sql AS $$
    TRUNCATE name_rating;

    INSERT INTO name_rating (nconst, rating, numvotes, num_titles)
    SELECT dc.nconst,
           ROUND(SUM(t.averagerating * t.numvotes) / SUM(t.numvotes), 1),
           SUM(t.numvotes),
           COUNT(*)
    FROM (SELECT DISTINCT wo.nconst, wo.tconst FROM worked_on wo) dc
    JOIN title t ON t.tconst = dc.tconst
    WHERE t.averagerating IS NOT NULL AND t.numvotes > 0
    GROUP BY dc.nconst;
$$;

-- Updates name_ratings only for one title.
-- Used in D3 when new rating gets added.
CREATE FUNCTION update_name_ratings_for_title(p_tconst character(10))
RETURNS void
LANGUAGE sql AS $$
    WITH affected AS (
        SELECT DISTINCT nconst FROM worked_on WHERE tconst = p_tconst
    ),
    distinct_credits AS (
        SELECT DISTINCT wo.nconst, wo.tconst
        FROM worked_on wo
        WHERE wo.nconst IN (SELECT nconst FROM affected)
    ),
    rated AS (
        SELECT dc.nconst,
               SUM(t.averagerating * t.numvotes) AS weighted_sum,
               SUM(t.numvotes)                   AS total_votes,
               COUNT(*)                          AS title_count
        FROM distinct_credits dc
        JOIN title t ON t.tconst = dc.tconst
        WHERE t.averagerating IS NOT NULL AND t.numvotes > 0
        GROUP BY dc.nconst
    )
    INSERT INTO name_rating (nconst, rating, numvotes, num_titles, updated_at)
    SELECT nconst, ROUND(weighted_sum / total_votes, 1), total_votes, title_count, now()
    FROM rated
    ON CONFLICT (nconst) DO UPDATE
        SET rating     = EXCLUDED.rating,
            numvotes   = EXCLUDED.numvotes,
            num_titles = EXCLUDED.num_titles,
            updated_at = EXCLUDED.updated_at;

    WITH affected AS (
        SELECT DISTINCT nconst FROM worked_on WHERE tconst = p_tconst
    )
    DELETE FROM name_rating
    WHERE nconst IN (SELECT nconst FROM affected)
      AND nconst NOT IN (
          SELECT DISTINCT wo.nconst
          FROM worked_on wo
          JOIN title t ON t.tconst = wo.tconst
          WHERE wo.nconst IN (SELECT nconst FROM affected)
            AND t.averagerating IS NOT NULL AND t.numvotes > 0
      );
$$;

-- Populate newly added name_rating table
SELECT update_name_ratings();

-- D8_popular_actors (task 1-D.8)

-- Design decisions:
--
-- Made both suggested functions
--
-- Actors with NULL name_rating.rating are included at the end of the list
--
-- string_agg is used if actors are credited more than once on the same title
-- (e.g. playing two characters in one title) to get only row per actor.

DROP FUNCTION IF EXISTS get_popular_actors(character(10));
DROP FUNCTION IF EXISTS get_popular_costars(character(10));

-- The cast of one movie, most popular (highest name_rating) first.
CREATE FUNCTION get_popular_actors(p_tconst character(10))
RETURNS TABLE (
    nconst      text,
    primaryname text,
    characters  text,
    rating      numeric,
    numvotes    integer,
    num_titles  integer
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM title t WHERE t.tconst = p_tconst) THEN
        RAISE EXCEPTION 'No title with tconst %', p_tconst;
    END IF;
 
    RETURN QUERY
    SELECT rtrim(p.nconst)::text,
           p.primaryname::text,
           string_agg(DISTINCT NULLIF(btrim(wo.characters), ''), ', '),
           nr.rating,
           nr.numvotes,
           nr.num_titles
    FROM worked_on wo
    JOIN person p ON p.nconst = wo.nconst
    LEFT JOIN name_rating nr ON nr.nconst = wo.nconst
    WHERE wo.tconst = p_tconst
      AND wo.category IN ('actor', 'actress')
    GROUP BY p.nconst, p.primaryname, nr.rating, nr.numvotes, nr.num_titles
    ORDER BY nr.rating DESC NULLS LAST, nr.numvotes DESC NULLS LAST, p.primaryname;
END $$;
 
-- An actor's co-stars most popular first.
CREATE FUNCTION get_popular_costars(p_nconst character(10))
RETURNS TABLE (
    nconst        text,
    primaryname   text,
    shared_titles integer,
    rating        numeric,
    numvotes      integer,
    num_titles    integer
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM person pe WHERE pe.nconst = p_nconst) THEN
        RAISE EXCEPTION 'No person with nconst %', p_nconst;
    END IF;
 
    RETURN QUERY
    WITH my_titles AS (
        SELECT DISTINCT wo.tconst
        FROM worked_on wo
        WHERE wo.nconst = p_nconst AND wo.category IN ('actor', 'actress')
    )
    SELECT rtrim(p.nconst)::text,
           p.primaryname::text,
           COUNT(DISTINCT wo2.tconst)::integer,
           nr.rating,
           nr.numvotes,
           nr.num_titles
    FROM worked_on wo2
    JOIN my_titles mt ON mt.tconst = wo2.tconst
    JOIN person p ON p.nconst = wo2.nconst
    LEFT JOIN name_rating nr ON nr.nconst = wo2.nconst
    WHERE wo2.category IN ('actor', 'actress')
      AND wo2.nconst <> p_nconst
    GROUP BY p.nconst, p.primaryname, nr.rating, nr.numvotes, nr.num_titles
    ORDER BY nr.rating DESC NULLS LAST, nr.numvotes DESC NULLS LAST, p.primaryname;
END $$;

-- D9_similar_titles (task 1-D.9)
--
-- Design decisions:
-- This functions uses shared genres and shared people to find similar titles.
-- Genres and people are weighted 0.5 each by default but can be changed
-- when calling the function.
-- 
-- This function would be too slow to use for having a similar/recommended
-- titles feature on a movie page. For that a table that we load using the
-- calculations in the function could be used.
--
-- Similarity measure: for each of genre-set and people-set, this uses
-- the Jaccard similarity coefficient -- |A ∩ B| / |A ∪ B| -- the
-- standard measure for how similar two sets are, ranging from 0 (no
-- overlap) to 1 (identical sets). It's preferred here over a raw
-- intersection count because it naturally normalizes for set size: two
-- movies sharing 2 genres out of 2 total should score higher than two
-- movies sharing 2 genres out of 8 total, and a raw count alone
-- couldn't tell those apart.
--
-- The two Jaccard scores are combined into one similarity score via a
-- weighted sum (p_genre_weight, p_people_weight)

-- 1. Supporting indexes (move these to 1-E)
CREATE INDEX IF NOT EXISTS title_genre_genre_idx ON title_genre (genre_name);
CREATE INDEX IF NOT EXISTS worked_on_nconst_idx  ON worked_on (nconst);

-- 2. Function
DROP FUNCTION IF EXISTS get_similar_titles(character(10), integer, numeric, numeric);

CREATE FUNCTION get_similar_titles(
    p_tconst        character(10),
    p_limit         integer DEFAULT 20,
    p_genre_weight  numeric DEFAULT 0.5,
    p_people_weight numeric DEFAULT 0.5
)
RETURNS TABLE (
    tconst         text,
    primarytitle   text,
    score          numeric,
    shared_genres  integer,
    shared_people  integer
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM title t WHERE t.tconst = p_tconst) THEN
        RAISE EXCEPTION 'No title with tconst %', p_tconst;
    END IF;

    RETURN QUERY
    WITH my_genres AS (
        SELECT genre_name FROM title_genre WHERE title_genre.tconst = p_tconst
    ),
    my_people AS (
        SELECT DISTINCT nconst FROM worked_on WHERE worked_on.tconst = p_tconst
    ),
    my_genre_count AS (SELECT COUNT(*) AS n FROM my_genres),
    my_people_count AS (SELECT COUNT(*) AS n FROM my_people),

    candidates AS (
        SELECT DISTINCT tg.tconst
        FROM title_genre tg
        WHERE tg.genre_name IN (SELECT genre_name FROM my_genres)
          AND tg.tconst <> p_tconst
        UNION
        SELECT DISTINCT wo.tconst
        FROM worked_on wo
        WHERE wo.nconst IN (SELECT nconst FROM my_people)
          AND wo.tconst <> p_tconst
    ),

    genre_overlap AS (
        SELECT tg.tconst, COUNT(*) AS shared
        FROM title_genre tg
        JOIN my_genres mg ON mg.genre_name = tg.genre_name
        WHERE tg.tconst IN (SELECT c.tconst FROM candidates c)
        GROUP BY tg.tconst
    ),
    candidate_genre_totals AS (
        SELECT tg.tconst, COUNT(*) AS total
        FROM title_genre tg
        WHERE tg.tconst IN (SELECT c.tconst FROM candidates c)
        GROUP BY tg.tconst
    ),

    people_overlap AS (
        SELECT wo.tconst, COUNT(DISTINCT wo.nconst) AS shared
        FROM worked_on wo
        JOIN my_people mp ON mp.nconst = wo.nconst
        WHERE wo.tconst IN (SELECT c.tconst FROM candidates c)
        GROUP BY wo.tconst
    ),
    candidate_people_totals AS (
        SELECT wo.tconst, COUNT(DISTINCT wo.nconst) AS total
        FROM worked_on wo
        WHERE wo.tconst IN (SELECT c.tconst FROM candidates c)
        GROUP BY wo.tconst
    ),

    scored AS (
        SELECT
            c.tconst,
            COALESCE(go.shared, 0) AS shared_genres,
            COALESCE(po.shared, 0) AS shared_people,
            CASE
                WHEN (SELECT n FROM my_genre_count) + COALESCE(cgt.total, 0) - COALESCE(go.shared, 0) = 0
                    THEN 0
                ELSE COALESCE(go.shared, 0)::numeric
                     / ((SELECT n FROM my_genre_count) + COALESCE(cgt.total, 0) - COALESCE(go.shared, 0))
            END AS jaccard_genre,
            CASE
                WHEN (SELECT n FROM my_people_count) + COALESCE(cpt.total, 0) - COALESCE(po.shared, 0) = 0
                    THEN 0
                ELSE COALESCE(po.shared, 0)::numeric
                     / ((SELECT n FROM my_people_count) + COALESCE(cpt.total, 0) - COALESCE(po.shared, 0))
            END AS jaccard_people
        FROM candidates c
        LEFT JOIN genre_overlap          go  ON go.tconst  = c.tconst
        LEFT JOIN candidate_genre_totals cgt ON cgt.tconst = c.tconst
        LEFT JOIN people_overlap         po  ON po.tconst  = c.tconst
        LEFT JOIN candidate_people_totals cpt ON cpt.tconst = c.tconst
    )

    SELECT rtrim(s.tconst)::text,
           t.primarytitle,
           ROUND(p_genre_weight * s.jaccard_genre + p_people_weight * s.jaccard_people, 4),
           s.shared_genres::integer,
           s.shared_people::integer
    FROM scored s
    JOIN title t ON t.tconst = s.tconst
    ORDER BY (p_genre_weight * s.jaccard_genre + p_people_weight * s.jaccard_people) DESC,
             s.shared_people DESC, s.shared_genres DESC, t.primarytitle
    LIMIT p_limit;
END $$;

-- D10_person_words   (task 1-D.10)

DROP FUNCTION IF EXISTS person_words(text, integer);

CREATE FUNCTION person_words(p_person_name text, p_limit integer DEFAULT 10)
RETURNS TABLE (word text, frequency integer)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    IF p_person_name IS NULL OR btrim(p_person_name) = '' THEN
        RAISE EXCEPTION 'Person name must not be empty';
    END IF;

    IF p_limit IS NULL OR p_limit < 1 THEN
        RAISE EXCEPTION 'Limit must be a positive integer, got %', p_limit;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM person pe WHERE lower(pe.primaryname) = lower(p_person_name)) THEN
        RAISE EXCEPTION 'No person found with name %', p_person_name;
    END IF;

    RETURN QUERY
    WITH my_people AS (
        SELECT pe.nconst FROM person pe WHERE lower(pe.primaryname) = lower(p_person_name)
    ),
    my_titles AS (
        SELECT DISTINCT wo.tconst
        FROM worked_on wo
        WHERE wo.nconst IN (SELECT mp.nconst FROM my_people mp)
    )
    SELECT tw.word, COUNT(DISTINCT tw.tconst)::integer AS frequency
    FROM title_word tw
    WHERE tw.tconst IN (SELECT mt.tconst FROM my_titles mt)
    GROUP BY tw.word
    ORDER BY COUNT(DISTINCT tw.tconst) DESC, tw.word
    LIMIT p_limit;
END $$;