# citp-cit04

CIT/P 2026 portfolio project, group cit04.

## Local database setup

Download `imdb.backup`, `omdb_data.backup` and `wi.backup` from Moodle
and put them in one folder. Open a terminal in that folder.

### 1. Create the source database and load the data (once)

```
psql -U postgres -c "create database imdb_source"
psql -U postgres -d imdb_source -f imdb.backup
psql -U postgres -d imdb_source -f omdb_data.backup
psql -U postgres -d imdb_source -f wi.backup
```

Never modify `imdb_source`. It is the clean copy of the source data.

### 2. Create a working copy

```
psql -U postgres -c "create database imdb template imdb_source"
```

Run scripts, experiment and break things in `imdb`.

### 3. Reset the working copy

```
psql -U postgres -c "drop database imdb"
psql -U postgres -c "create database imdb template imdb_source"
```

Close pgAdmin, Navicat and other connections to `imdb` first.

## Running the scripts

Run the scripts in this order on a fresh working copy:

```
psql -U postgres -d imdb -f sp1-database/B2_build_movie_db.sql
psql -U postgres -d imdb -f sp1-database/C2_build_framework_db.sql
psql -U postgres -d imdb -f sp1-database/D_functions.sql
psql -U postgres -d imdb -f sp1-database/E_indexes.sql
```

| Script | Creates |
|---|---|
| B2 | Movie tables, migrates the source data, drops the source tables |
| C2 | Framework tables (users, ratings, bookmarks, search history) |
| D  | Views and functions (the database API) |
| E  | Indexes |

## Running the tests

```
psql -U postgres -d imdb -a -f sp1-database/F_test.sql > sp1-database/F_test_output.txt 2>&1
```

`-a` prints each statement above its result, and `2>&1` also captures
notices and errors. Tests that modify data run inside `BEGIN ... ROLLBACK`,
so the database is unchanged afterwards.
