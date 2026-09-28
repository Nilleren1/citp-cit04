-- C2_build_framework_db.sql

BEGIN;

-- 1. DROP framework tables
DROP TABLE IF EXISTS search_history   CASCADE;
DROP TABLE IF EXISTS rating           CASCADE;
DROP TABLE IF EXISTS bookmark_title   CASCADE;
DROP TABLE IF EXISTS bookmark_person  CASCADE;
DROP TABLE IF EXISTS app_user         CASCADE;

-- 2. CREATE framework tables

-- app_user
CREATE TABLE app_user (
    user_id     integer         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username    varchar(50)     NOT NULL UNIQUE,
    password    text            NOT NULL,
    created_at  timestamptz     NOT NULL DEFAULT now()
);

-- bookmark_person
CREATE TABLE bookmark_person (
    user_id     integer         NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    nconst      character(10)   NOT NULL REFERENCES person(nconst),
    created_at  timestamptz     NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, nconst)
);

-- bookmark_title
CREATE TABLE bookmark_title (
    user_id     integer         NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    tconst      character(10)   NOT NULL REFERENCES title(tconst),
    status      varchar(10)     NOT NULL
                CHECK (status IN ('watched', 'watchlist')),
    created_at  timestamptz     NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tconst)
);

-- rating
CREATE TABLE rating (
    user_id     integer         NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    tconst      character(10)   NOT NULL REFERENCES title(tconst),
    rating      smallint        NOT NULL CHECK (rating BETWEEN 1 AND 10),
    review      text,
    created_at  timestamptz     NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tconst)
);

-- search_history
CREATE TABLE search_history (
    history_id  integer         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     integer         NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    query       text            NOT NULL,
    created_at  timestamptz     NOT NULL DEFAULT now()
);

COMMIT;
