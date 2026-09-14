-- Run once with the Supabase SQL editor before enabling production storage.
-- Server service-role key only. No anonymous/authenticated client data access.
create table if not exists public.myaiscore_state (
  id integer primary key check (id = 1),
  revision bigint not null default 0,
  payload jsonb not null
);
alter table public.myaiscore_state enable row level security;
revoke all on public.myaiscore_state from anon, authenticated;
grant select, insert, update, delete on public.myaiscore_state to service_role;
insert into public.myaiscore_state (id, revision, payload)
values (1, 0, '{"assessments":{},"operations":{},"usage":{}}'::jsonb)
on conflict (id) do nothing;
