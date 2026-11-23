-- =====================================================================
-- Habbit Do · 012_foco
-- Sessões do modo foco com o pet: uma por ciclo de foco (completo ou encerrado antes),
-- guardadas para estatísticas futuras.
--  - block_id sem chave estrangeira: a sessão fica mesmo se o bloco for apagado (block_name guarda o nome).
--  - block_id nulo = foco livre (sem bloco).
-- Mesmo padrão das outras tabelas: user_id → auth.users com ON DELETE CASCADE e RLS (auth.uid() = user_id).
-- =====================================================================

create table if not exists public.focus_sessions (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  block_id        text check (block_id is null or char_length(block_id) <= 64),
  block_name      text check (block_name is null or char_length(block_name) <= 120),
  date            date not null,
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  planned_seconds integer not null check (planned_seconds between 1 and 86400),
  focus_seconds   integer not null check (focus_seconds between 0 and 86400),
  away_seconds    integer not null default 0 check (away_seconds between 0 and 86400),
  interruptions   integer not null default 0 check (interruptions between 0 and 10000),
  pauses          integer not null default 0 check (pauses between 0 and 10000),
  completed       boolean not null default false,
  created_at      timestamptz not null default now(),
  check (ended_at >= started_at)
);

-- Estatísticas por pessoa e por dia.
create index if not exists focus_sessions_user_date on public.focus_sessions (user_id, date);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions: ver os próprios" on public.focus_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "focus_sessions: criar os próprios" on public.focus_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "focus_sessions: alterar os próprios" on public.focus_sessions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "focus_sessions: apagar os próprios" on public.focus_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.focus_sessions from anon;

-- A API (PostgREST) passa a enxergar a tabela nova na hora.
notify pgrst, 'reload schema';

-- Conferência: falha a migration se alguma tabela pública ficar sem RLS.
do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ') into missing
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if missing is not null then
    raise exception 'Tabelas sem RLS: %', missing;
  end if;
end;
$$;
