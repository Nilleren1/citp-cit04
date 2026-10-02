-- F_test.sql
-- This script contains test queries for the database.
-- Just a start needs to be checked and improved

-- D1
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
SELECT add_title_bookmark((SELECT user_id FROM tmp_test), (SELECT tconst FROM title LIMIT 1), 'watchlist');
SELECT update_title_bookmark_status((SELECT user_id FROM tmp_test), (SELECT tconst FROM title LIMIT 1), 'watched');
SELECT add_person_bookmark((SELECT user_id FROM tmp_test), (SELECT nconst FROM person LIMIT 1));
SELECT * FROM get_title_bookmarks((SELECT user_id FROM tmp_test));
SELECT * FROM get_person_bookmarks((SELECT user_id FROM tmp_test));
SELECT log_search((SELECT user_id FROM tmp_test), 'the godfather');
SELECT * FROM get_search_history((SELECT user_id FROM tmp_test));
SELECT delete_user((SELECT user_id FROM tmp_test));
ROLLBACK;

-- D2
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
SELECT * FROM string_search('batman', (SELECT user_id FROM tmp_test));
SELECT * FROM get_search_history((SELECT user_id FROM tmp_test));
SELECT * FROM string_search('an entirely unlikely plot phrase xyz');
ROLLBACK;

-- D3
BEGIN;
CREATE TEMP TABLE tmp_test AS
SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
CREATE TEMP TABLE tmp_title AS SELECT tconst FROM title WHERE averagerating IS NOT NULL LIMIT 1;
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

-- D4
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
SELECT * FROM structured_string_search('dark knight', NULL, NULL, 'christian bale', (SELECT user_id FROM tmp_test));
SELECT * FROM structured_string_search(NULL, 'a young wizard', NULL, NULL);
SELECT * FROM get_search_history((SELECT user_id FROM tmp_test));
ROLLBACK;

-- D5
SELECT * FROM structured_name_search(NULL, 'actor', 'dune', NULL);

-- D6
SELECT * FROM co_players('Timothée Chalamet') LIMIT 10;

-- D7
BEGIN;
CREATE TEMP TABLE tmp_test AS SELECT create_user('testuser', 'not-a-real-hash') AS user_id;
CREATE TEMP TABLE tmp_title AS SELECT tconst FROM title WHERE averagerating IS NOT NULL LIMIT 1;
SELECT p.nconst, nr.rating, nr.numvotes, nr.num_titles
FROM person p
JOIN worked_on wo ON wo.nconst = p.nconst
LEFT JOIN name_rating nr ON nr.nconst = p.nconst
WHERE wo.tconst = (SELECT tconst FROM tmp_title) LIMIT 5;
SELECT * FROM rate((SELECT user_id FROM tmp_test), (SELECT tconst FROM tmp_title), 10);
SELECT p.nconst, nr.rating, nr.numvotes, nr.num_titles
FROM person p
JOIN worked_on wo ON wo.nconst = p.nconst
LEFT JOIN name_rating nr ON nr.nconst = p.nconst
WHERE wo.tconst = (SELECT tconst FROM tmp_title) LIMIT 5; 
ROLLBACK;

-- D8
SELECT * FROM get_popular_actors(
    (SELECT tconst FROM worked_on WHERE category IN ('actor','actress')
     GROUP BY tconst HAVING COUNT(*) > 3 LIMIT 1)
);

SELECT * FROM get_popular_costars('nm0580565');

-- D9
SELECT * FROM get_similar_titles('tt2209418');
SELECT * FROM get_similar_titles('tt2209418', 10, 0.0, 1.0);

-- D10
SELECT * FROM person_words('Ice Cube');
SELECT * FROM person_words('Ice CUbe', 25);

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