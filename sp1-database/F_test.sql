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
