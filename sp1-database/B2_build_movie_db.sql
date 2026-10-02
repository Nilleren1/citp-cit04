-- =====================================================================
-- B2_build_movie_db.sql
-- =====================================================================
-- Builds the movie data model, migrates the source data into it and
-- drops the source tables.
--
-- Precondition: imdb.backup, omdb_data.backup and wi.backup have been
-- loaded into the target database.
--
-- The whole script runs as one transaction: if any statement fails,
-- nothing is changed, and the source tables are left intact.
-- Run it on a fresh copy of the source data.

BEGIN;
-- =====================================================================
-- 1. DROP target tables
-- =====================================================================

DROP TABLE IF EXISTS alt_title          CASCADE;
DROP TABLE IF EXISTS title_word         CASCADE;
DROP TABLE IF EXISTS word_index         CASCADE;
DROP TABLE IF EXISTS episode            CASCADE;
DROP TABLE IF EXISTS worked_on          CASCADE;
DROP TABLE IF EXISTS person_profession  CASCADE;
DROP TABLE IF EXISTS profession         CASCADE;
DROP TABLE IF EXISTS person             CASCADE;
DROP TABLE IF EXISTS title_genre        CASCADE;
DROP TABLE IF EXISTS genre              CASCADE;
DROP TABLE IF EXISTS title              CASCADE;

-- =====================================================================
-- 2. CREATE target tables
-- =====================================================================
-- title
CREATE TABLE title (
    tconst          character(10)   PRIMARY KEY,
    titletype       varchar(20),
    primarytitle    text,
    originaltitle   text,
    isadult         boolean,
    startyear       integer,
    endyear         integer,
    runtimeminutes  integer,
    averagerating   numeric(5,1),
    numvotes        integer,
    plot            text,
    poster          varchar(180)
);

-- genre
CREATE TABLE genre (
    name            varchar(50)     PRIMARY KEY
);

-- titleGenre
CREATE TABLE title_genre (
    tconst          character(10)   NOT NULL REFERENCES title(tconst),
    genre_name      varchar(50)     NOT NULL REFERENCES genre(name),
    PRIMARY KEY (tconst, genre_name)
);

-- person
CREATE TABLE person (
    nconst          character(10)   PRIMARY KEY,
    primaryname     varchar(256),
    birthyear       integer,
    deathyear       integer
);

-- profession
CREATE TABLE profession (
    name            varchar(50)     PRIMARY KEY
);

-- personProfession
CREATE TABLE person_profession (
    nconst          character(10)   NOT NULL REFERENCES person(nconst),
    profession_name varchar(50)     NOT NULL REFERENCES profession(name),
    PRIMARY KEY (nconst, profession_name)
);

-- workedOn
CREATE TABLE worked_on (
    tconst          character(10)   NOT NULL REFERENCES title(tconst),
    ordering        integer         NOT NULL,
    nconst          character(10)   NOT NULL REFERENCES person(nconst),
    category        varchar(50)     NOT NULL,
    job             text,
    characters      text,
    PRIMARY KEY (tconst, ordering)
);

-- episode
CREATE TABLE episode (
    tconst          character(10)   PRIMARY KEY REFERENCES title(tconst),
    series_tconst   character(10)   NOT NULL REFERENCES title(tconst),
    seasonnumber    integer,
    episodenumber   integer
);

-- wordIndex
CREATE TABLE word_index (
    word            text COLLATE "C" PRIMARY KEY
);

-- title_word
CREATE TABLE title_word (
    tconst          character(10)   NOT NULL REFERENCES title(tconst),
    word            text COLLATE "C" NOT NULL,
    field           character(1)    NOT NULL,
    lexeme          text,
    PRIMARY KEY (tconst, word, field)
);

-- altTitle
CREATE TABLE alt_title (
    tconst          character(10)   NOT NULL REFERENCES title(tconst),
    ordering        integer         NOT NULL,
    title           text,
    region          varchar(10),
    language        varchar(10),
    types           varchar(256),
    attributes      varchar(256),
    isoriginaltitle boolean,
    PRIMARY KEY (tconst, ordering)
);

-- =====================================================================
-- 3. MIGRATE data from the source tables into the new model
-- =====================================================================
-- 3.1 title: title_basics + title_ratings + (plot, poster) from omdb_data
INSERT INTO title (tconst, titletype, primarytitle, originaltitle, isadult,
                   startyear, endyear, runtimeminutes,
                   averagerating, numvotes, plot, poster)
SELECT
    COALESCE(tb.tconst, od.tconst)                              AS tconst,
    COALESCE(tb.titletype, od.type)                             AS titletype,
    COALESCE(tb.primarytitle, od.title)                         AS primarytitle,
    COALESCE(tb.originaltitle, od.title)                        AS originaltitle,
    tb.isadult,
    CASE WHEN tb.startyear ~ '^\d{4}$' THEN tb.startyear::int
         ELSE substring(od.year FROM '\d{4}')::int END          AS startyear,
    CASE WHEN tb.endyear ~ '^\d{4}$' THEN tb.endyear::int END   AS endyear,
    COALESCE(tb.runtimeminutes,
             NULLIF(regexp_replace(od.runtime, '[^0-9]', '', 'g'), '')::int)
                                                                AS runtimeminutes,
    tr.averagerating,
    tr.numvotes,
    NULLIF(od.plot, 'N/A')                                      AS plot,
    NULLIF(od.poster, 'N/A')                                    AS poster
FROM title_basics tb
FULL OUTER JOIN omdb_data od     ON od.tconst = tb.tconst
LEFT JOIN title_ratings tr       ON tr.tconst = COALESCE(tb.tconst, od.tconst);

-- 3.2 genre + title_genre (from IMDb)
INSERT INTO genre (name)
SELECT DISTINCT trim(g.n)
FROM title_basics tb, unnest(string_to_array(tb.genres, ',')) AS g(n)
WHERE tb.genres IS NOT NULL
  AND trim(g.n) NOT IN ('', '\N')
ON CONFLICT (name) DO NOTHING;

INSERT INTO title_genre (tconst, genre_name)
SELECT DISTINCT tb.tconst, trim(g.n)
FROM title_basics tb, unnest(string_to_array(tb.genres, ',')) AS g(n)
WHERE tb.genres IS NOT NULL
  AND trim(g.n) NOT IN ('', '\N')
ON CONFLICT DO NOTHING;

-- 3.2b genre + title_genre for the OMDb-only titles
INSERT INTO genre (name)
SELECT DISTINCT trim(g.n)
FROM omdb_data od, unnest(string_to_array(od.genre, ',')) AS g(n)
WHERE od.genre IS NOT NULL
  AND trim(g.n) NOT IN ('', 'N/A')
  AND NOT EXISTS (SELECT 1 FROM title_basics tb WHERE tb.tconst = od.tconst)
ON CONFLICT (name) DO NOTHING;

INSERT INTO title_genre (tconst, genre_name)
SELECT DISTINCT od.tconst, trim(g.n)
FROM omdb_data od, unnest(string_to_array(od.genre, ',')) AS g(n)
WHERE od.genre IS NOT NULL
  AND trim(g.n) NOT IN ('', 'N/A')
  AND NOT EXISTS (SELECT 1 FROM title_basics tb WHERE tb.tconst = od.tconst)
ON CONFLICT DO NOTHING;

-- 3.3 person
INSERT INTO person (nconst, primaryname, birthyear, deathyear)
SELECT
    nconst,
    primaryname,
    CASE WHEN birthyear ~ '^\d{4}$' THEN birthyear::int END,
    CASE WHEN deathyear ~ '^\d{4}$' THEN deathyear::int END
FROM name_basics;

-- 3.4 profession + person_profession
INSERT INTO profession (name)
SELECT DISTINCT trim(p.n)
FROM name_basics nb, unnest(string_to_array(nb.primaryprofession, ',')) AS p(n)
WHERE nb.primaryprofession IS NOT NULL
  AND trim(p.n) NOT IN ('', '\N')
ON CONFLICT (name) DO NOTHING;

INSERT INTO person_profession (nconst, profession_name)
SELECT DISTINCT nb.nconst, trim(p.n)
FROM name_basics nb, unnest(string_to_array(nb.primaryprofession, ',')) AS p(n)
WHERE nb.primaryprofession IS NOT NULL
  AND trim(p.n) NOT IN ('', '\N')
ON CONFLICT DO NOTHING;

-- 3.5 worked_on (from title_principals, dangling references skipped)
INSERT INTO worked_on (tconst, ordering, nconst, category, job, characters)
SELECT tp.tconst, tp.ordering, tp.nconst, tp.category, tp.job, tp.characters
FROM title_principals tp
WHERE EXISTS (SELECT 1 FROM title  t WHERE t.tconst = tp.tconst)
  AND EXISTS (SELECT 1 FROM person p WHERE p.nconst = tp.nconst)
ON CONFLICT (tconst, ordering) DO NOTHING;

-- 3.6 top up worked_on with directors/writers from title_crew
--     that are not already in title_principals (negative ordering)
WITH crew_expanded AS (
    SELECT tconst, unnest(string_to_array(directors, ',')) AS raw_n, 'director' AS category
    FROM title_crew
    WHERE directors IS NOT NULL
    UNION ALL
    SELECT tconst, unnest(string_to_array(writers, ',')) AS raw_n, 'writer' AS category
    FROM title_crew
    WHERE writers IS NOT NULL
),
crew_valid AS (
    SELECT DISTINCT tconst, trim(raw_n) AS nconst, category
    FROM crew_expanded
    WHERE trim(raw_n) NOT IN ('', '\N')
      AND EXISTS (SELECT 1 FROM title  t WHERE t.tconst = crew_expanded.tconst)
      AND EXISTS (SELECT 1 FROM person p WHERE p.nconst = trim(raw_n))
),
crew_new AS (
    SELECT cv.tconst, cv.nconst, cv.category,
           row_number() OVER (PARTITION BY cv.tconst ORDER BY cv.nconst, cv.category) AS rn
    FROM crew_valid cv
    WHERE NOT EXISTS (
        SELECT 1 FROM worked_on wo
        WHERE wo.tconst   = cv.tconst
          AND wo.nconst   = cv.nconst
          AND wo.category = cv.category
    )
)
INSERT INTO worked_on (tconst, ordering, nconst, category, job, characters)
SELECT tconst, -rn, nconst, category, NULL, NULL
FROM crew_new;

-- 3.7 episode: both the episode and its series must exist
INSERT INTO episode (tconst, series_tconst, seasonnumber, episodenumber)
SELECT te.tconst, te.parenttconst, te.seasonnumber, te.episodenumber
FROM title_episode te
WHERE EXISTS (SELECT 1 FROM title t WHERE t.tconst = te.tconst)
  AND EXISTS (SELECT 1 FROM title t WHERE t.tconst = te.parenttconst);

-- 3.8 title_word + word_index (from wi)
INSERT INTO title_word (tconst, word, field, lexeme)
SELECT w.tconst, w.word, w.field, w.lexeme
FROM wi w
WHERE w.word IS NOT NULL
  AND EXISTS (SELECT 1 FROM title t WHERE t.tconst = w.tconst);

INSERT INTO word_index (word)
SELECT DISTINCT word
FROM title_word;

ALTER TABLE title_word
    ADD CONSTRAINT title_word_word_fkey
    FOREIGN KEY (word) REFERENCES word_index(word);

-- 3.9 alt_title (from title_akas)
INSERT INTO alt_title (tconst, ordering, title, region, language,
                       types, attributes, isoriginaltitle)
SELECT ta.titleid, ta.ordering, ta.title, ta.region, ta.language,
       ta.types, ta.attributes, ta.isoriginaltitle
FROM title_akas ta
WHERE EXISTS (SELECT 1 FROM title t WHERE t.tconst = ta.titleid);

-- =====================================================================
-- 4. DROP the source tables
-- =====================================================================
-- Inside the transaction, so they are only dropped if every step above succeeded.

DROP TABLE IF EXISTS title_akas;
DROP TABLE IF EXISTS title_principals;
DROP TABLE IF EXISTS title_crew;
DROP TABLE IF EXISTS title_episode;
DROP TABLE IF EXISTS title_ratings;
DROP TABLE IF EXISTS title_basics;
DROP TABLE IF EXISTS name_basics;
DROP TABLE IF EXISTS omdb_data;
DROP TABLE IF EXISTS wi;

COMMIT;