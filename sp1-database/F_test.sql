-- =====================================================================
-- F_test.sql  (task 1-F)
-- =====================================================================
-- Calls every function in the database API with example input.
--
-- Run with psql and save the output as the test output file:
--
--   psql -U postgres -d imdb -a -f F_test.sql > F_test_output.txt 2>&1
--
--   -a    echoes every comment and statement into the output, so each
--         result appears directly below the query that produced it.
--   2>&1  also captures notices and error messages.
--
-- Tests that modify data run inside BEGIN ... ROLLBACK and leave the
-- database unchanged. Read-only tests run on their own.
-- =====================================================================


-- =====================================================================
-- 1-D.1  Framework functions
-- =====================================================================
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
-- Bookmark a title (watchlist), mark it as watched, bookmark a person
SELECT add_title_bookmark((SELECT user_id FROM tmp_test), (SELECT tconst FROM title LIMIT 1), 'watchlist');
SELECT update_title_bookmark_status((SELECT user_id FROM tmp_test), (SELECT tconst FROM title LIMIT 1), 'watched');
SELECT add_person_bookmark((SELECT user_id FROM tmp_test), (SELECT nconst FROM person LIMIT 1));
-- Read the bookmarks back
SELECT * FROM get_title_bookmarks((SELECT user_id FROM tmp_test));
SELECT * FROM get_person_bookmarks((SELECT user_id FROM tmp_test));
-- Log a search and read the history back
SELECT log_search((SELECT user_id FROM tmp_test), 'the godfather');
SELECT * FROM get_search_history((SELECT user_id FROM tmp_test));
-- Delete the user
SELECT delete_user((SELECT user_id FROM tmp_test));
ROLLBACK;


-- =====================================================================
-- 1-D.2  string_search
-- =====================================================================
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
-- Search with a user; the search is logged
SELECT * FROM string_search('batman', (SELECT user_id FROM tmp_test));
SELECT * FROM get_search_history((SELECT user_id FROM tmp_test));
-- Search without a match
SELECT * FROM string_search('an entirely unlikely plot phrase xyz');
ROLLBACK;


-- =====================================================================
-- 1-D.3  rate
-- =====================================================================
BEGIN;
CREATE TEMP TABLE tmp_test AS
SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
CREATE TEMP TABLE tmp_title AS SELECT tconst FROM title WHERE averagerating IS NOT NULL LIMIT 1;
-- Rating before
SELECT averagerating, numvotes FROM title WHERE tconst = (SELECT tconst FROM tmp_title);

-- Create rating
SELECT * FROM rate((SELECT user_id FROM tmp_test),(SELECT tconst FROM tmp_title),10,'loved it');
SELECT averagerating, numvotes FROM title WHERE tconst = (SELECT tconst FROM tmp_title);

-- Update existing rating
SELECT * FROM rate((SELECT user_id FROM tmp_test),(SELECT tconst FROM tmp_title),4);
SELECT averagerating, numvotes FROM title WHERE tconst = (SELECT tconst FROM tmp_title);

-- Delete rating
SELECT delete_rating((SELECT user_id FROM tmp_test),(SELECT tconst FROM tmp_title));
SELECT averagerating, numvotes FROM title WHERE tconst = (SELECT tconst FROM tmp_title);

-- Verify that the user's rating is gone
SELECT * FROM get_user_ratings((SELECT user_id FROM tmp_test));
ROLLBACK;


-- =====================================================================
-- 1-D.4  structured_string_search
-- =====================================================================
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
-- Title and person name, with a user (the search is logged)
SELECT * FROM structured_string_search('dark knight', NULL, NULL, 'christian bale', (SELECT user_id FROM tmp_test));
-- Plot only, without a user
SELECT * FROM structured_string_search(NULL, 'a young wizard', NULL, NULL);
SELECT * FROM get_search_history((SELECT user_id FROM tmp_test));
ROLLBACK;


-- =====================================================================
-- 1-D.5  name_search, structured_name_search
-- =====================================================================

-- Substring of a name; the best-known match is ranked first
SELECT * FROM name_search('chal') LIMIT 5;

-- Matching is case-insensitive (same person as above)
SELECT * FROM name_search('CHALAMET') LIMIT 3;

-- No match (expected: no rows)
SELECT * FROM name_search('xyzxyzxyz');

-- Empty search is rejected (expected: NOTICE "OK, rejected: ...")
DO $$
BEGIN
    PERFORM name_search('   ');
    RAISE NOTICE 'FAIL: empty search was accepted';
EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'OK, rejected: %', SQLERRM;
END $$;

-- Structured: actors credited on titles containing "dune"
SELECT * FROM structured_name_search(NULL, 'actor', 'dune', NULL);

-- Structured: no criteria given is rejected (expected: NOTICE "OK, rejected: ...")
DO $$
BEGIN
    PERFORM structured_name_search(NULL, '', NULL, ' ');
    RAISE NOTICE 'FAIL: search without criteria was accepted';
EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'OK, rejected: %', SQLERRM;
END $$;


-- =====================================================================
-- 1-D.6  co_players
-- =====================================================================

-- Most frequent co-players, highest frequency first
SELECT * FROM co_players('Timothée Chalamet') LIMIT 10;

-- Unknown actor (expected: no rows)
SELECT * FROM co_players('Nobody With This Name');


-- =====================================================================
-- 1-D.7  Name rating
-- =====================================================================
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
CREATE TEMP TABLE tmp_title AS SELECT tconst FROM title WHERE averagerating IS NOT NULL LIMIT 1;
-- Name ratings of persons on the title, before rating it
SELECT p.nconst, nr.rating, nr.numvotes, nr.num_titles
FROM person p
JOIN worked_on wo ON wo.nconst = p.nconst
LEFT JOIN name_rating nr ON nr.nconst = p.nconst
WHERE wo.tconst = (SELECT tconst FROM tmp_title) LIMIT 5;
-- Rate the title
SELECT * FROM rate((SELECT user_id FROM tmp_test), (SELECT tconst FROM tmp_title), 10);
-- Name ratings after rating the title
SELECT p.nconst, nr.rating, nr.numvotes, nr.num_titles
FROM person p
JOIN worked_on wo ON wo.nconst = p.nconst
LEFT JOIN name_rating nr ON nr.nconst = p.nconst
WHERE wo.tconst = (SELECT tconst FROM tmp_title) LIMIT 5; 
ROLLBACK;


-- =====================================================================
-- 1-D.8  Popular actors
-- =====================================================================

-- Actors of a title with more than three actors
SELECT * FROM get_popular_actors(
    (SELECT tconst FROM worked_on WHERE category IN ('actor','actress')
     GROUP BY tconst HAVING COUNT(*) > 3 LIMIT 1)
);

-- Popular co-stars of a person
SELECT * FROM get_popular_costars('nm0580565');


-- =====================================================================
-- 1-D.9  Similar titles
-- =====================================================================

-- Default settings
SELECT * FROM get_similar_titles('tt2209418');
-- Custom arguments
SELECT * FROM get_similar_titles('tt2209418', 10, 0.0, 1.0);


-- =====================================================================
-- 1-D.10  person_words
-- =====================================================================

-- Words for a person
SELECT * FROM person_words('Ice Cube');
-- Case-insensitive name, with a custom limit
SELECT * FROM person_words('Ice CUbe', 25);


-- =====================================================================
-- 1-D.11  Exact-match querying            (to be added)
-- 1-D.12  Best-match querying             (to be added)
-- =====================================================================


-- =====================================================================
-- 1-D.13  word_to_words
-- =====================================================================

-- Words most frequent among titles indexed by "space"
SELECT * FROM word_to_words(ARRAY['space'], 10);

-- The query word itself is not in the result (expected: 0)
SELECT count(*) AS should_be_0
FROM word_to_words(ARRAY['space'], 1000)
WHERE word = 'space';

-- Keywords that never occur together (expected: no rows)
SELECT * FROM word_to_words(ARRAY['xyzxyzxyz', 'space']);


-- =====================================================================
-- 1-D.14  Weighted indexing               (to be added)
-- =====================================================================