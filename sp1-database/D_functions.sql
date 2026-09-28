-- D_functions.sql
-- This script creates custom functions for the database.

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