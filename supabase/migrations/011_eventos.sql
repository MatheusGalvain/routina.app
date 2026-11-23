-- =====================================================================
-- Habbit Do · 011_eventos
-- Itens de eventos sazonais conquistados (acessórios e troféus de Natal, Ano Novo…).
--  - Um registro por item; nunca é apagado pelo app (o que se conquista num evento fica para sempre).
--  - event_id e item_id sem lista fixa: eventos novos (src/data/events.ts) não precisam de migration.
--  - O acessório de evento equipado continua em companion.equipped (jsonb), como os outros.
-- Mesmo padrão das outras tabelas: user_id → auth.users com ON DELETE CASCADE e RLS (auth.uid() = user_id).
-- =====================================================================

create table if not exists public.user_event_items (
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_id    text not null check (event_id ~ '^[a-z0-9-]{1,40}$'),
  item_id     text not null check (item_id ~ '^[a-z0-9-]{1,40}$'),
  kind        text not null check (kind in ('accessory', 'trophy')),
  unlocked_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id, item_id)
);

alter table public.user_event_items enable row level security;

create policy "user_event_items: ver os próprios" on public.user_event_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_event_items: criar os próprios" on public.user_event_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_event_items: alterar os próprios" on public.user_event_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_event_items: apagar os próprios" on public.user_event_items
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_event_items from anon;

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
