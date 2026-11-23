-- =====================================================================
-- Habbit Do · 009_cenarios
-- Cenários do cantinho (cosmos e floresta), itens de cenário e uma montagem por cenário.
--  - profiles.scene: cenário escolhido (padrão 'cosmos').
--  - user_scene_items: itens desbloqueados (um registro por item; nunca é apagado pelo app).
--  - corner_slots: ganha scene_id e item_id; cada espaço tem um troféu (trophy_id + tier) OU um item.
--    Os espaços que já existiam vão para o cosmos (o antigo céu de constelações foi removido).
-- Mesmo padrão das outras tabelas: user_id → auth.users com ON DELETE CASCADE e RLS (auth.uid() = user_id).
-- =====================================================================

-- Cenário escolhido.
alter table public.profiles
  add column if not exists scene text not null default 'cosmos'
  check (scene in ('cosmos', 'floresta'));

-- Itens de cenário desbloqueados. item_id sem lista fixa, para itens novos não precisarem de migration.
create table if not exists public.user_scene_items (
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_id     text not null check (item_id ~ '^[a-z0-9-]{1,40}$'),
  unlocked_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.user_scene_items enable row level security;

create policy "user_scene_items: ver os próprios" on public.user_scene_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_scene_items: criar os próprios" on public.user_scene_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_scene_items: alterar os próprios" on public.user_scene_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_scene_items: apagar os próprios" on public.user_scene_items
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_scene_items from anon;

-- Espaços do cantinho por cenário, com troféu ou item.
alter table public.corner_slots
  add column if not exists scene_id text not null default 'cosmos' check (scene_id in ('cosmos', 'floresta')),
  add column if not exists item_id text check (item_id ~ '^[a-z0-9-]{1,40}$');

alter table public.corner_slots
  alter column trophy_id drop not null,
  alter column tier drop not null;

alter table public.corner_slots
  drop constraint if exists corner_slots_conteudo,
  add constraint corner_slots_conteudo check (
    (trophy_id is not null and tier is not null and item_id is null)
    or (trophy_id is null and tier is null and item_id is not null)
  );

-- Chave: um espaço por cenário.
alter table public.corner_slots drop constraint if exists corner_slots_pkey;
alter table public.corner_slots add primary key (user_id, scene_id, slot);

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
