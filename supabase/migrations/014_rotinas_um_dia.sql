-- =====================================================================
-- Habbit Do · 014_rotinas_um_dia
--  1. Rotinas de um dia só e arquivadas:
--     - repeat_mode: 'weekly' (repete nos dias da semana) ou 'once' (só em once_date);
--     - archived_at: arquivada à mão (a de um dia só se arquiva sozinha no app quando a data passa,
--       sem gravar nada aqui).
--  2. Por onde o coelho de cristal foi desbloqueado (companion.secret_path): 'dias', 'areas' ou 'lua'.
--     Só registro: não aparece na interface.
-- A RLS de routines e companion (auth.uid() = user_id) já vem da 001.
-- =====================================================================

-- 1. Rotinas de um dia só e arquivadas.
alter table public.routines
  add column if not exists repeat_mode text not null default 'weekly',
  add column if not exists once_date   date,
  add column if not exists archived_at timestamptz;

alter table public.routines drop constraint if exists routines_repeat_mode_check;
alter table public.routines add constraint routines_repeat_mode_check
  check (repeat_mode in ('weekly', 'once') and (repeat_mode = 'once') = (once_date is not null));

-- 2. Caminho do desbloqueio do coelho de cristal.
alter table public.companion add column if not exists secret_path text;
alter table public.companion drop constraint if exists companion_secret_path_check;
alter table public.companion add constraint companion_secret_path_check
  check (secret_path is null or secret_path in ('dias', 'areas', 'lua'));

-- A API (PostgREST) passa a enxergar as colunas novas na hora.
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
