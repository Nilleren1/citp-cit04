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

-- Weights of a common and a rarer word (expected: "the" has a much lower idf)
SELECT DISTINCT word, idf FROM word_weight WHERE word IN ('the', 'space', 'alien');

-- -- Weighted search with several keywords
SELECT * FROM weighted_search(ARRAY['space', 'alien', 'ship'], 10);

-- -- A common word adds almost nothing to the ranking
SELECT * FROM weighted_search(ARRAY['space', 'alien', 'ship', 'the'], 10);

-- -- No match (expected: no rows)
SELECT * FROM weighted_search(ARRAY['xyzxyzxyz']);

-- -- Empty input is rejected (expected: NOTICE "OK, rejected: ...")
 DO $$
 BEGIN
     PERFORM weighted_search(ARRAY['', ' ']);
     RAISE NOTICE 'FAIL: empty keyword list was accepted';
 EXCEPTION WHEN raise_exception THEN
     RAISE NOTICE 'OK, rejected: %', SQLERRM;
 END $$;
-- D15
-- Since there is no data in our framework tables this test include alot of test data
-- Tests 3 functions: recommend_from_bookmarks, recommend_from_ratings, get_trending_searches
BEGIN;

DO $$
DECLARE
    v_alice_id integer;
    v_bob_id   integer;
    v_titles   character(10)[];
BEGIN
    INSERT INTO app_user (username, password) VALUES ('demo_alice', 'not-a-real-hash')
        ON CONFLICT (username) DO NOTHING;

    INSERT INTO app_user (username, password) VALUES ('demo_bob', 'not-a-real-hash')
        ON CONFLICT (username) DO NOTHING;

    SELECT au.user_id INTO v_alice_id
    FROM app_user au
    WHERE au.username = 'demo_alice';

    SELECT au.user_id INTO v_bob_id
    FROM app_user au
    WHERE au.username = 'demo_bob';

    SELECT array_agg(x.tconst ORDER BY x.numvotes DESC NULLS LAST)
    INTO v_titles
    FROM (
        SELECT t.tconst, t.numvotes
        FROM title t
        WHERE t.tconst IN (SELECT tg.tconst FROM title_genre tg)
          AND t.averagerating IS NOT NULL
        ORDER BY t.numvotes DESC NULLS LAST
        LIMIT 8
    ) x;

    IF v_titles IS NULL OR cardinality(v_titles) < 8 THEN
        RAISE EXCEPTION
            'Not enough rated, genre-tagged titles found to build test data (need 8, found %)',
            COALESCE(cardinality(v_titles), 0);
    END IF;

    INSERT INTO bookmark_title (user_id, tconst, status) VALUES
        (v_alice_id, v_titles[1], 'watched'),
        (v_alice_id, v_titles[2], 'watched'),
        (v_alice_id, v_titles[3], 'watchlist'),
        (v_alice_id, v_titles[4], 'watchlist')
    ON CONFLICT DO NOTHING;

    INSERT INTO rating (user_id, tconst, rating, review) VALUES
        (v_alice_id, v_titles[5], 9, 'loved it'),
        (v_alice_id, v_titles[6], 8, NULL),
        (v_alice_id, v_titles[7], 5, NULL),
        (v_alice_id, v_titles[8], 4, 'not really my thing')
    ON CONFLICT DO NOTHING;

    INSERT INTO search_history (user_id, query) VALUES
        (v_bob_id,   'batman'),
        (v_bob_id,   'Batman'),
        (v_bob_id,   'inception'),
        (v_bob_id,   'the godfather'),
        (v_bob_id,   'batman'),
        (v_alice_id, 'batman'),
        (v_alice_id, '  Inception  '),
        (v_alice_id, 'dark knight');
END $$;

SELECT * FROM recommend_from_bookmarks(
    (SELECT user_id FROM app_user WHERE username = 'demo_alice')
);

SELECT * FROM recommend_from_ratings(
    (SELECT user_id FROM app_user WHERE username = 'demo_alice')
);

SELECT * FROM get_trending_searches();

SELECT * FROM get_trending_searches(10, NULL);

ROLLBACK;


-- =====================================================================
-- get_title_reviews test
-- =====================================================================

ROLLBACK;
DROP TABLE IF EXISTS tmp_users, tmp_title;
DELETE FROM app_user WHERE username IN ('Nicolai H', 'Haris', 'Christoffer');

BEGIN;
CREATE TEMP TABLE tmp_users AS
SELECT create_user('Nicolai H', 'not-a-real-hash') AS user_id, 1 AS n
UNION ALL
SELECT create_user('Haris', 'not-a-real-hash'), 2
UNION ALL
SELECT create_user('Christoffer', 'not-a-real-hash'), 3;
CREATE TEMP TABLE tmp_title AS SELECT tconst FROM title LIMIT 1;

SELECT * FROM rate((SELECT user_id FROM tmp_users WHERE n = 1), (SELECT tconst FROM tmp_title), 8, 'Great film');
SELECT * FROM rate((SELECT user_id FROM tmp_users WHERE n = 2), (SELECT tconst FROM tmp_title), 5, 'Mediocre, but entertaining');
SELECT * FROM rate((SELECT user_id FROM tmp_users WHERE n = 3), (SELECT tconst FROM tmp_title), 7); -- expected to fail, with no comment.

SELECT * FROM get_title_reviews((SELECT tconst FROM tmp_title));
ROLLBACK;