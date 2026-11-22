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

## Running the database tests

```
psql -U postgres -d imdb -a -f sp1-database/F_test.sql > sp1-database/F_test_output.txt 2>&1
```

`-a` prints each statement above its result, and `2>&1` also captures
notices and errors. Tests that modify data run inside `BEGIN ... ROLLBACK`,
so the database is unchanged afterwards.

## Backend (Subproject 2)

The backend in `sp2-backend` is a REST API (TypeScript, Node.js, Express)
on top of the `imdb` working copy. You need Node.js 22.12 or newer (the
tests need it), and the four scripts above must have been run.

### 1. Create the API's database role (once)

The API does not connect as `postgres` but as `movinator_api`, a role with
only the privileges the API needs (requirement 2-A.4). From the repository
root, with a password of your choice (no spaces):

```
psql -U postgres -d imdb -v api_password='choose-a-password' -f sp2-backend/src/db/api_role.sql
```

psql asks for the `postgres` password, and the output ends with `COMMIT`.
After resetting the working copy and running the scripts again, run this
again too: the role is kept, but its privileges belong to the old database.

### 2. Create `sp2-backend/.env`

`.env` is git-ignored, so everyone creates their own:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=imdb
PGUSER=movinator_api
PGPASSWORD=choose-a-password
JWT_SECRET=a-long-random-string
```

`JWT_SECRET` signs the login tokens, and the API does not start without it.
Generate one with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Optional settings:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | The port the API listens on |
| `BASE_URL` | `http://localhost:PORT` | The address used in the urls in responses |
| `CORS_ORIGIN` | `http://localhost:5173` | The frontend origins allowed to call the API, comma-separated |

### 3. Install and start

```
cd sp2-backend
npm install
npm start
```

`npm start` compiles the TypeScript to `dist/` and starts the API on
http://localhost:3000. Check that it works by opening
http://localhost:3000/titles?limit=5 in a browser.

### 4. Try the requests

`sp2-backend/requests.http` has requests for every endpoint. Install the
"REST Client" extension by Huachao Mao in VS Code, then click "Send Request"
above a request. For the requests that need a login, first send "Register"
and "Login", and set `@userId` at the top of the file to the id at the end
of the url that Register returns.

The JSON shapes of all responses are in `sp2-backend/representations.json`.

### 5. Run the backend tests

```
cd sp2-backend
npm test
```

The tests use Vitest and supertest, and run against the database in `.env`.

On Windows, run them from a terminal whose path starts with a capital `C:\`.
When it starts with `c:\` (VS Code sometimes opens terminals like that),
Vitest loads itself twice and every test file fails with "Vitest failed to
find the runner". `cd C:\Users\<you>\...\sp2-backend` first fixes it.
