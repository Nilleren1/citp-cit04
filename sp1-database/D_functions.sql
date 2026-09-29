-- D_functions.sql
-- This script creates custom functions for the database.

-- D1_framework_functions (task 1-D.1)

-- DROP FUNCTION IF EXISTS create_user(varchar, text);
-- DROP FUNCTION IF EXISTS get_user(varchar);
-- DROP FUNCTION IF EXISTS update_password(integer, text);
-- DROP FUNCTION IF EXISTS delete_user(integer);
-- DROP FUNCTION IF EXISTS add_person_bookmark(integer, character(10));
-- DROP FUNCTION IF EXISTS remove_person_bookmark(integer, character(10));
-- DROP FUNCTION IF EXISTS get_person_bookmarks(intege-- r);
-- DROP FUNCTION IF EXISTS add_title_bookmark(integer, character(10), varchar);
-- DROP FUNCTION IF EXISTS update_title_bookmark_status(integer, character(10), varchar);
-- DROP FUNCTION IF EXISTS remove_title_bookmark(integer, character(10));
-- DROP FUNCTION IF EXISTS get_title_bookmarks(integer, varchar);
-- DROP FUNCTION IF EXISTS log_search(integer, text);
-- DROP FUNCTION IF EXISTS get_search_history(integer, integer);
-- DROP FUNCTION IF EXISTS clear_search_history(integer);
-- DROP FUNCTION IF EXISTS get_rating_history(integer);

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
CREATE FUNCTION add_person_bookmark(p_user_id integer, p_nconst character)
RETURNS void
LANGUAGE sql AS $$
    INSERT INTO bookmark_person (user_id, nconst)
    VALUES (p_user_id, p_nconst)
    ON CONFLICT (user_id, nconst) DO NOTHING;
$$;

-- Delete
CREATE FUNCTION remove_person_bookmark(p_user_id integer, p_nconst character)
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
CREATE FUNCTION add_title_bookmark(p_user_id integer, p_tconst character,
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
CREATE FUNCTION update_title_bookmark_status(p_user_id integer, p_tconst character,
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
CREATE FUNCTION remove_title_bookmark(p_user_id integer, p_tconst character)
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

-- 5. Rating history
CREATE FUNCTION get_rating_history(p_user_id integer)
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

-- DROP FUNCTION IF EXISTS string_search(text, integer);

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

-- DROP FUNCTION IF EXISTS rate(integer, character(10), integer, text);

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
 
    RETURN QUERY
    SELECT rtrim(p_tconst)::text, p_user_id, p_rating, v_review,
           v_is_new, v_rated_at, v_new_avg::numeric, v_votes;
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

-- DROP FUNCTION IF EXISTS structured_string_search(text, text, text, text, integer);

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