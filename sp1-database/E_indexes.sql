-- E_indexes.sql
-- This script creates indexes for the database.

-- Good for the co_players function, since it will count the rows in worked_on for a given nconst.
-- Without this index, each count will require a full scan of the worked_on table, which is very slow.
CREATE INDEX IF NOT EXISTS worked_on_nconst_idx ON worked_on (nconst);
ANALYZE worked_on;

EXPLAIN ANALYZE SELECT * FROM name_search('chalamet');