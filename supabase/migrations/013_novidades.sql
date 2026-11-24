-- =====================================================================
-- Habbit Do · 013_novidades
--  1. Tarefas avulsas do dia (day_tasks). Feita/pulada fica em block_logs (block_id = day_tasks.id).
--  2. "Minha ordem" do Hoje (day_logs.custom_order).
--  3. Preferências do perfil: modo de ordenar o Hoje e a última versão de novidades vista.
--  4. Histórias lidas (user_story_reads).
--  5. Coelho branco vira pet comum; o secreto passa a ser o coelho de cristal.
--  6. Fase conquistada por espécie (companion.phases), que nunca regride.
-- Mesmo padrão das outras tabelas: user_id → auth.users com ON DELETE CASCADE e RLS (auth.uid() = user_id).
-- =====================================================================

-- 1. Tarefas avulsas.
create table if not exists public.day_tasks (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  name         text not null check (char_length(name) between 1 and 200 and btrim(name) <> ''),
  area_id      text check (area_id is null or area_id ~ '^[a-z0-9-]{1,40}$'),
  position     integer not null default 0 check (position >= 0),
  carried_from uuid,
  resolution   text check (resolution is null or resolution in ('levada', 'descartada')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists day_tasks_user_date_idx on public.day_tasks (user_id, date);
drop trigger if exists day_tasks_updated_at on public.day_tasks;
create trigger day_tasks_updated_at before update on public.day_tasks
  for each row execute function public.set_updated_at();

-- 2. "Minha ordem" do dia.
alter table public.day_logs
  add column if not exists custom_order jsonb
  check (custom_order is null or (jsonb_typeof(custom_order) = 'array' and jsonb_array_length(custom_order) <= 500));

-- 3. Preferências do perfil.
alter table public.profiles
  add column if not exists today_sort text not null default 'rotina' check (today_sort in ('rotina', 'auto', 'manual')),
  add column if not exists last_seen_version text check (last_seen_version is null or last_seen_version ~ '^[0-9a-z.-]{1,20}$');

-- 4. Histórias lidas.
create table if not exists public.user_story_reads (
  user_id    uuid not null references auth.users (id) on delete cascade,
  story_id   text not null check (story_id ~ '^[a-z0-9-]{1,40}$'),
  read_at    timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

-- RLS nas tabelas novas.
alter table public.day_tasks enable row level security;
alter table public.user_story_reads enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['day_tasks', 'user_story_reads'] loop
    execute format('drop policy if exists "%1$s: ver os próprios" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: criar os próprios" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: alterar os próprios" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: apagar os próprios" on public.%1$I', t);
    execute format('create policy "%1$s: ver os próprios" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: criar os próprios" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: alterar os próprios" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: apagar os próprios" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

revoke all on public.day_tasks, public.user_story_reads from anon;

-- 5. Coelho vira pet comum; o secreto passa a ser o coelho de cristal.
alter table public.companion drop constraint if exists companion_kind_check;
alter table public.companion add constraint companion_kind_check
  check (kind is null or kind in ('gatinho', 'sapinho', 'polvinho', 'pintinho', 'ourico', 'corujinha', 'coelho', 'coelho-cristal'));

-- Quem tinha o coelho secreto: desbloqueio e favorito passam para o coelho de cristal (idempotente).
update public.companion
  set kind = case when kind = 'coelho' then 'coelho-cristal' else kind end,
      unlocked = array_append(array_remove(array_remove(unlocked, 'pet:coelho'), 'pet:coelho-cristal'), 'pet:coelho-cristal')
  where 'pet:coelho' = any (unlocked);

-- 6. Fase conquistada por espécie. Semeia com a regra antiga (7/21) para ninguém cair de fase.
alter table public.companion
  add column if not exists phases jsonb not null default '{}'::jsonb check (jsonb_typeof(phases) = 'object');

update public.companion c
  set phases = (
    select jsonb_object_agg(k, case when c.peak_active_days >= 21 then 'adulto' else 'jovem' end)
    from unnest(array['gatinho', 'sapinho', 'polvinho', 'pintinho', 'ourico', 'corujinha', 'coelho', 'coelho-cristal']) as k
  )
  where c.phases = '{}'::jsonb and c.peak_active_days >= 7;

-- A API (PostgREST) passa a enxergar as mudanças na hora.
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
