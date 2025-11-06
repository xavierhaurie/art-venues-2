-- Create regions table and seed a single default row
-- Idempotent-ish: drop existing table only if you run 0.clear-all.sql first in dev. Here we create if not exists.

create table if not exists region (
  key text primary key,
  name text not null
);

-- Upsert default region row (BOS / Greater Boston Area)
insert into region (key, name)
values ('BOS', 'Greater Boston Area')
on conflict (key) do update set name = excluded.name;

insert into region (key, name)
values ('MTL', 'Montreal Metropolitan Area')
on conflict (key) do update set name = excluded.name;



