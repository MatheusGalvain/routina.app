-- =====================================================================
-- Habbit Do · 005_areas
-- Áreas da vida passam a ser dados de cada pessoa (renomear, recolorir, reordenar, criar, excluir).
-- Toda conta começa com as 8 padrão, gravadas pelo app no primeiro login
-- com as chaves originais como id ('sono', 'corpo'…), que os troféus usam.
-- Áreas criadas pela pessoa usam um uuid como id.
-- Mesmo padrão das outras tabelas: user_id → auth.users com ON DELETE CASCADE
-- e RLS (auth.uid() = user_id) em select, insert, update e delete.
-- =====================================================================

create table public.user_areas (
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Chave padrão ('sono'…) ou uuid.
  id         text not null check (id ~ '^[a-z0-9-]{1,40}$'),
  name       text not null check (char_length(name) between 1 and 30 and btrim(name) <> ''),
  color      text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon       text check (icon is null or icon ~ '^[a-z0-9-]{1,40}$'),
  position   integer not null default 0 check (position >= 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index user_areas_user_position_idx on public.user_areas (user_id, position);

create trigger user_areas_updated_at
  before update on public.user_areas
  for each row execute function public.set_updated_at();

-- No máximo 12 áreas por pessoa. Ignora a própria linha, para o upsert de uma área que já existe passar.
create or replace function public.check_user_areas_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.user_areas a where a.user_id = new.user_id and a.id <> new.id) >= 12 then
    raise exception 'Limite de 12 áreas da vida' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger user_areas_limit
  before insert on public.user_areas
  for each row execute function public.check_user_areas_limit();

-- Blocos e registros aceitam qualquer id de área (antes, só as 8 fixas).
-- Sem FK para user_areas de propósito: o histórico continua apontando para áreas excluídas.
alter table public.blocks drop constraint if exists blocks_area_id_check;
alter table public.blocks
  add constraint blocks_area_id_check check (area_id ~ '^[a-z0-9-]{1,40}$');

alter table public.block_logs drop constraint if exists block_logs_area_id_check;
alter table public.block_logs
  add constraint block_logs_area_id_check check (area_id is null or area_id ~ '^[a-z0-9-]{1,40}$');

-- RLS
alter table public.user_areas enable row level security;

create policy "user_areas: ver os próprios" on public.user_areas
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_areas: criar os próprios" on public.user_areas
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_areas: alterar os próprios" on public.user_areas
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_areas: apagar os próprios" on public.user_areas
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Visitantes sem login não acessam nada.
revoke all on public.user_areas from anon;

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
