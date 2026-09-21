# citp-cit04

This is for setting up the local environment, remember to download the backup data from source material.
psql -U postgres -c "create database imdb_source"

psql -U postgres -d imdb_source -f imdb.backup
psql -U postgres -d imdb_source -f omdb_data.backup
psql -U postgres -d imdb_source -f wi.backup

Making a copy, to run B2, experiment and break things. Quickly reset imdb from imdb_source.
psql -U postgres -c "create database imdb template imdb_source"

When fresh start needed:
psql -U postgres -c "drop database imdb"
psql -U postgres -c "create database imdb template imdb_source"
