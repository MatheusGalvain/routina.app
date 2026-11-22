-- =====================================================================
-- Habbit Do · 006_modelos
-- Modelos de rotina criados pela pessoa. Um modelo é só uma receita:
-- usar o modelo cria uma rotina nova e independente (rotinas já criadas não mudam).
-- Os blocos ficam em jsonb (lista de { id, name, type, area_id, minutes, target, unit, step }).
-- Mesmo padrão das outras tabelas: user_id → auth.users com ON DELETE CASCADE
-- e RLS (auth.uid() = user_id) em select, insert, update e delete.
-- Os modelos padrão do app ficam no código (src/data/templates.ts), não aqui.
-- =====================================================================

create table public.user_templates (
  id         uuid not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(name) between 1 and 120),
  color      text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  days       smallint[] not null default '{0,1,2,3,4,5,6}'
             check (days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  blocks     jsonb not null default '[]'::jsonb
             check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 100),
  -- Ordem na lista de modelos.
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index user_templates_user_position_idx on public.user_templates (user_id, position);

create trigger user_templates_updated_at
  before update on public.user_templates
  for each row execute function public.set_updated_at();

-- RLS
alter table public.user_templates enable row level security;

create policy "user_templates: ver os próprios" on public.user_templates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_templates: criar os próprios" on public.user_templates
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_templates: alterar os próprios" on public.user_templates
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_templates: apagar os próprios" on public.user_templates
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Visitantes sem login não acessam nada.
revoke all on public.user_templates from anon;

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
