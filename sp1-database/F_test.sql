-- F_test.sql
-- This script contains test queries for the database.

-- =====================================================================
--  D.5 Finding Names
-- =====================================================================
SELECT * FROM structured_name_search(NULL, 'actor', 'dune', NULL);


-- =====================================================================
--  D.6 Co-players
-- =====================================================================
SELECT * FROM co_players('Timothée Chalamet') LIMIT 10;