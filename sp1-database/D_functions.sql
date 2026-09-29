-- D_functions.sql
-- This script creates custom functions for the database.

-- D1_framework_functions.sql   (task 1-D.1)

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

-- =====================================================================
--  D.6 Co-players
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