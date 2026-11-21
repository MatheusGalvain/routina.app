-- =====================================================================
-- rotina.app · 001_init
-- Tabelas por usuário, com Row Level Security em TODAS elas.
-- Cada linha pertence a um usuário (user_id → auth.users, ON DELETE CASCADE):
-- apagar o usuário no Auth apaga todos os dados dele.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------

-- Atualiza updated_at em toda alteração.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: um por usuário, com o fuso horário
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- Fuso IANA (ex.: 'America/Sao_Paulo'). As datas dos registros são calculadas nele.
  timezone     text not null default 'America/Sao_Paulo'
               check (timezone <> '' and length(timezone) <= 64),
  -- Já respondeu à pergunta de levar os dados locais para a conta (etapa 4).
  local_import_answered boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Valida o fuso contra a lista do próprio Postgres.
create or replace function public.check_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Fuso horário inválido: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_check_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.check_timezone();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando a conta é criada.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- "Hoje" no fuso do usuário logado (para o app e para consultas no servidor).
create or replace function public.user_today()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.user_id = (select auth.uid())),
    'America/Sao_Paulo'
  ))::date;
$$;

-- ---------------------------------------------------------------------
-- routines
-- ---------------------------------------------------------------------
create table public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(name) between 1 and 120),
  color      text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Dias da semana (0 = domingo … 6 = sábado).
  days       smallint[] not null default '{0,1,2,3,4,5,6}'
             check (days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  -- Ordem das rotinas na lista.
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Permite que blocks garanta que a rotina é do mesmo usuário.
  unique (id, user_id)
);

create index routines_user_position_idx on public.routines (user_id, position);

create trigger routines_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- blocks: a ordem do dia fica em position
-- ---------------------------------------------------------------------
create table public.blocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null,
  name       text not null check (length(name) between 1 and 200),
  type       text not null check (type in ('habito', 'contador', 'tarefa')),
  area_id    text not null check (area_id in ('sono', 'corpo', 'foco', 'casa', 'financas', 'estudo', 'mente', 'social')),
  minutes    integer check (minutes is null or minutes between 0 and 1440),
  target     numeric check (target is null or target > 0),
  unit       text check (unit is null or length(unit) <= 40),
  step       numeric check (step is null or step > 0),
  -- Ordem do bloco dentro da rotina (= ordem do dia).
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Chave composta: um bloco só pode apontar para uma rotina do MESMO usuário.
  foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade
);

create index blocks_routine_position_idx on public.blocks (routine_id, position);
create index blocks_user_idx on public.blocks (user_id);

create trigger blocks_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- day_logs: um registro por usuário por dia (nota da revisão + lista congelada)
-- ---------------------------------------------------------------------
create table public.day_logs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Data local no fuso do usuário (profiles.timezone).
  date       date not null,
  note       text check (note is null or length(note) <= 10000),
  -- Lista do dia congelada (blocos + rotina), para o histórico sobreviver a edições.
  plan       jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create trigger day_logs_updated_at
  before update on public.day_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- block_logs: o que aconteceu com cada bloco em cada dia.
-- Sem FK para blocks de propósito: o histórico continua se o bloco for apagado,
-- por isso area_id e type ficam salvos aqui.
-- ---------------------------------------------------------------------
create table public.block_logs (
  user_id    uuid not null,
  date       date not null,
  block_id   uuid not null,
  done       boolean not null default false,
  skipped    boolean not null default false,
  value      numeric check (value is null or value >= 0),
  area_id    text check (area_id is null or area_id in ('sono', 'corpo', 'foco', 'casa', 'financas', 'estudo', 'mente', 'social')),
  type       text check (type is null or type in ('habito', 'contador', 'tarefa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date, block_id),
  foreign key (user_id) references auth.users (id) on delete cascade,
  -- Todo registro de bloco pertence a um dia do mesmo usuário.
  foreign key (user_id, date) references public.day_logs (user_id, date) on delete cascade
);

create trigger block_logs_updated_at
  before update on public.block_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- companion: o pet favorito e o progresso dele (que nunca regride)
-- ---------------------------------------------------------------------
create table public.companion (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  kind             text check (kind is null or kind in ('gatinho', 'sapinho', 'polvinho', 'pintinho', 'ourico', 'corujinha')),
  name             text not null default '' check (length(name) <= 24),
  -- { "cabeca": "coroa", "pescoco": "laco", ... }
  equipped         jsonb not null default '{}'::jsonb check (jsonb_typeof(equipped) = 'object'),
  -- Progresso: guardado no servidor para não regredir ao trocar de aparelho.
  peak_active_days integer not null default 0 check (peak_active_days >= 0),
  seen_phase       text not null default 'filhote' check (seen_phase in ('filhote', 'jovem', 'adulto')),
  unlocked         text[] not null default '{}',
  progress_initialized boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger companion_updated_at
  before update on public.companion
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- completed_tasks: tarefas concluídas (somem dos dias seguintes)
-- ---------------------------------------------------------------------
create table public.completed_tasks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  block_id   uuid not null,
  -- Dia (no fuso do usuário) em que a tarefa foi feita.
  date       date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, block_id)
);

-- =====================================================================
-- Row Level Security: ligada em TODAS as tabelas.
-- Cada usuário só vê e altera as próprias linhas (auth.uid() = user_id).
-- `(select auth.uid())` é a forma recomendada pelo Supabase (avaliada uma vez por consulta).
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.routines        enable row level security;
alter table public.blocks          enable row level security;
alter table public.day_logs        enable row level security;
alter table public.block_logs      enable row level security;
alter table public.companion       enable row level security;
alter table public.completed_tasks enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'routines', 'blocks', 'day_logs', 'block_logs', 'companion', 'completed_tasks']
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
revoke all on public.profiles, public.routines, public.blocks, public.day_logs,
              public.block_logs, public.companion, public.completed_tasks from anon;

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
