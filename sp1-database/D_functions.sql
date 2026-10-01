-- D_functions.sql
-- This script creates custom functions for the database.

-- D5_name_search (task 1-D.5)
-- =====================================================================
-- name_search(search string, user)
-- ---------------------------------------------------------------------
-- Returns every person whose name contains the search string, ranked:
--   1. exact name matches first
--   2. then names that start with the search string
--   3. then by number of credited titles (most known first)
-- professions and title_count are returned so that persons with the
-- same name can be told apart (and the right nconst picked).
-- The search is logged in the user's search history when a user is given.

CREATE OR REPLACE FUNCTION name_search(p_search_string text,
                                       p_user_id integer DEFAULT NULL)
RETURNS TABLE (nconst      text,
               primaryname text,
               birthyear   integer,
               deathyear   integer,
               professions text,
               title_count bigint)
LANGUAGE plpgsql AS $$
DECLARE
    v_search text := lower(btrim(p_search_string));
BEGIN
    IF v_search IS NULL OR v_search = '' THEN
        RAISE EXCEPTION 'Search string must not be empty';
    END IF;
 
    IF p_user_id IS NOT NULL THEN
        PERFORM log_search(p_user_id, p_search_string);
    END IF;
 
    RETURN QUERY
    SELECT rtrim(p.nconst)::text,
           p.primaryname::text,
           p.birthyear,
           p.deathyear,
           (SELECT string_agg(pp.profession_name, ', ' ORDER BY pp.profession_name)
            FROM person_profession pp
            WHERE pp.nconst = p.nconst)::text,
           (SELECT count(DISTINCT w.tconst)
            FROM worked_on w
            WHERE w.nconst = p.nconst) AS n_titles
    FROM person p
    WHERE position(v_search IN lower(p.primaryname)) > 0
    ORDER BY lower(p.primaryname) = v_search DESC,
             position(' ' || v_search IN ' ' || lower(p.primaryname)) > 0 DESC,
             n_titles DESC,
             p.primaryname;
END $$;

-- ---------------------------------------------------------------------
-- structured_name_search(name, profession, title, character, user)
-- ---------------------------------------------------------------------
-- Finds persons matching all the criteria that are given. Empty or NULL
-- parameters are ignored, but at least one must be given.
--   p_name       : substring of the person's name
--   p_profession : substring of one of the person's professions
--   p_title      : substring of the primary title of a title they worked on
--   p_character  : substring of a character they played
-- Title and character are checked on the same credit, so
-- ('', '', 'dune', 'paul') means "played Paul in Dune", not
-- "was in Dune and played some Paul somewhere else".
-- The search is logged in the user's search history when a user is given.

CREATE OR REPLACE FUNCTION structured_name_search(p_name       text,
                                                  p_profession text,
                                                  p_title      text,
                                                  p_character  text,
                                                  p_user_id    integer DEFAULT NULL)
RETURNS TABLE (nconst text, primaryname text)
LANGUAGE plpgsql AS $$
DECLARE
    v_name       text := lower(NULLIF(btrim(p_name), ''));
    v_profession text := lower(NULLIF(btrim(p_profession), ''));
    v_title      text := lower(NULLIF(btrim(p_title), ''));
    v_character  text := lower(NULLIF(btrim(p_character), ''));
    v_tconsts    character(10)[];   -- titles matching p_title
    v_nconsts    character(10)[];   -- persons credited on those titles
BEGIN
    IF v_name IS NULL AND v_profession IS NULL
       AND v_title IS NULL AND v_character IS NULL THEN
        RAISE EXCEPTION 'At least one search parameter must be given';
    END IF;
 
    IF p_user_id IS NOT NULL THEN
        PERFORM log_search(p_user_id,
                           concat_ws('; ',
                                     'name: '       || v_name,
                                     'profession: ' || v_profession,
                                     'title: '      || v_title,
                                     'character: '  || v_character));
    END IF;
 
    -- Performance: the search runs in steps, starting from the most
    -- selective criterion. When a title is given, the matching titles are
    -- collected first (typically a handful), then the persons credited on
    -- them, and only those persons are checked for name and profession.
    -- Collecting the titles into an array lets PostgreSQL look up their
    -- credits through the worked_on primary key, instead of scanning all
    -- of worked_on: it cannot estimate how many titles a substring search
    -- matches, and otherwise assumes a large share of them.
    IF v_title IS NOT NULL THEN
        SELECT array_agg(t.tconst) INTO v_tconsts
        FROM title t
        WHERE position(v_title IN lower(t.primarytitle)) > 0;
 
        IF v_tconsts IS NULL THEN
            RETURN;                      -- no title matches
        END IF;
    END IF;
 
    IF v_title IS NOT NULL OR v_character IS NOT NULL THEN
        SELECT array_agg(DISTINCT w.nconst) INTO v_nconsts
        FROM worked_on w
        WHERE (v_tconsts IS NULL OR w.tconst = ANY (v_tconsts))
          AND (v_character IS NULL
               OR position(v_character IN lower(w.characters)) > 0);
 
        IF v_nconsts IS NULL THEN
            RETURN;                      -- nobody credited that way
        END IF;
    END IF;
 
    RETURN QUERY
    SELECT rtrim(p.nconst)::text, p.primaryname::text
    FROM person p
    WHERE (v_nconsts IS NULL OR p.nconst = ANY (v_nconsts))
      AND (v_name IS NULL
           OR position(v_name IN lower(p.primaryname)) > 0)
      AND (v_profession IS NULL
           OR EXISTS (SELECT 1
                      FROM person_profession pp
                      WHERE pp.nconst = p.nconst
                        AND position(v_profession IN lower(pp.profession_name)) > 0))
    ORDER BY p.primaryname;
END $$;

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