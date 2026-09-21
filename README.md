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

```
psql -U postgres -d imdb -f sp1-database/B2_build_movie_db.sql
```
