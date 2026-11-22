-- =====================================================================
-- api_role.sql
-- =====================================================================
-- Creates the database role the backend connects as (requirement 2-A.4):
-- it holds only the privileges the API needs, nothing more.
--
--   IMDB data (title, person, ...)      read only
--   framework data (app_user, ...)      read and write
--   title.averagerating / numvotes      update only these two columns,
--                                       because rate() and delete_rating()
--                                       recalculate a title's average
--   name_rating                         read and write, because rate() and
--                                       delete_rating() update name ratings
--
-- The role cannot create, alter or drop tables, cannot touch other columns
-- of the IMDB tables, and is not a superuser.
--
-- Run it once, after B2, C2 and D, as the user who owns the tables (postgres),
-- from the sp2-backend folder. Replace imdb with your database name and pick a
-- password without spaces; psql asks for the postgres password:
--
--   psql -h localhost -U postgres -d imdb -v api_password='choose-a-password' -f src/db/api_role.sql
--
-- Then set PGUSER=movinator_api and PGPASSWORD=<that password> in
-- sp2-backend/.env. The script can be run again: it only adds privileges.
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------
-- 1. The role
-- ---------------------------------------------------------------------
SELECT 'CREATE ROLE movinator_api'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movinator_api') \gexec

ALTER ROLE movinator_api WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
    PASSWORD :'api_password';

-- Connect to this database and use the public schema (but not create in it).
SELECT format('GRANT CONNECT ON DATABASE %I TO movinator_api', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO movinator_api;

-- ---------------------------------------------------------------------
-- 2. IMDB data: read only
-- ---------------------------------------------------------------------
GRANT SELECT ON
    title, genre, title_genre, person, profession, person_profession,
    worked_on, episode, word_index, title_word, alt_title, word_weight,
    title_person
TO movinator_api;

-- rate() and delete_rating() update a title's average rating and vote count
-- (1-D.3). Only these two columns may be changed, nothing else in title.
GRANT UPDATE (averagerating, numvotes) ON title TO movinator_api;

-- Name ratings (1-D.7) are recalculated when a rating changes.
GRANT SELECT, INSERT, UPDATE, DELETE ON name_rating TO movinator_api;

-- ---------------------------------------------------------------------
-- 3. Framework data: read and write
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
    app_user, bookmark_person, bookmark_title, rating, search_history
TO movinator_api;

-- The ids of app_user and search_history come from identity sequences.
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO movinator_api;

-- ---------------------------------------------------------------------
-- 4. The Subproject 1 functions (search, rate, bookmarks, ...)
-- ---------------------------------------------------------------------
-- They run with the caller's privileges, so the grants above limit
-- what they can do as well.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO movinator_api;

COMMIT;
