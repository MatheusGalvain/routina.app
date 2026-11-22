-- =====================================================================
-- Habbit Do · 003_trofeus
-- Troféus conquistados (um registro por nível) e os 4 espaços do cantinho.
-- Mesmo padrão das outras tabelas: user_id → auth.users com ON DELETE CASCADE
-- e RLS (auth.uid() = user_id) em select, insert, update e delete.
-- =====================================================================

-- Um nível de troféu conquistado. Nunca é apagado pelo app (níveis não se perdem).
-- trophy_id não tem lista fixa, para novos troféus não precisarem de migration.
create table public.user_trophies (
  user_id     uuid not null references auth.users (id) on delete cascade,
  trophy_id   text not null check (trophy_id ~ '^[a-z0-9-]{1,40}$'),
  tier        smallint not null check (tier between 1 and 4),
  unlocked_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  primary key (user_id, trophy_id, tier)
);

-- Um espaço do cantinho com um troféu exposto. Espaço vazio = sem linha.
-- Sem "unique (user_id, trophy_id)": trocar dois troféus de lugar grava um espaço de cada vez,
-- e o app já garante que um troféu fica em um espaço só.
create table public.corner_slots (
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot       smallint not null check (slot between 0 and 3),
  trophy_id  text not null check (trophy_id ~ '^[a-z0-9-]{1,40}$'),
  tier       smallint not null check (tier between 1 and 4),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create trigger corner_slots_updated_at
  before update on public.corner_slots
  for each row execute function public.set_updated_at();

alter table public.user_trophies enable row level security;
alter table public.corner_slots  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['user_trophies', 'corner_slots']
  loop
    execute format(
      'create policy "%1$s: ver os próprios" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: criar os próprios" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: alterar os próprios" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: apagar os próprios" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- Visitantes sem login não acessam nada.
revoke all on public.user_trophies, public.corner_slots from anon;

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
