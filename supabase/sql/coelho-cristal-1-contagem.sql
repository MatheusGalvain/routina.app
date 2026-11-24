-- =====================================================================
-- Coelho de cristal · 1. Contagem (SÓ LEITURA, não altera nada)
-- Rode no SQL Editor do Supabase DEPOIS da migration 014 (usa companion.secret_path).
-- Mesma regra de src/lib/unlock.ts (secretUnlockPath): 30 dias ativos no total, ou 7 dias seguidos
-- com todas as áreas atuais concluídas (mínimo de 5 áreas). Quem desbloqueou pela lua fica de fora da conta.
-- =====================================================================
with plano as (
  select d.user_id, d.date, p->'block'->>'id' as block_id, p->'block'->>'type' as tipo,
         nullif(p->'block'->>'target', '')::numeric as meta, p->'block'->>'areaId' as area_id
  from public.day_logs d
  cross join lateral jsonb_array_elements(case when jsonb_typeof(d.plan) = 'array' then d.plan else '[]'::jsonb end) p
),
registros as (
  select bl.user_id, bl.date, pl.block_id is not null as no_plano,
         case when pl.block_id is not null and coalesce(pl.tipo, bl.type) = 'contador'
              then coalesce(bl.value, 0) >= coalesce(pl.meta, 1) else bl.done end as feito,
         coalesce(bl.area_id, pl.area_id) as area_id
  from public.block_logs bl
  left join plano pl on pl.user_id = bl.user_id and pl.date = bl.date and pl.block_id = bl.block_id::text
),
dias as (  -- dia ativo: pelo menos 50% dos blocos feitos (igual a isActiveDay), só até hoje no fuso da pessoa
  select d.user_id, d.date,
         case when exists (select 1 from plano pl where pl.user_id = d.user_id and pl.date = d.date)
              then (select count(*) from plano pl where pl.user_id = d.user_id and pl.date = d.date)
                 + (select count(*) from registros r where r.user_id = d.user_id and r.date = d.date and not r.no_plano and r.feito)
              else (select count(*) from registros r where r.user_id = d.user_id and r.date = d.date) end as total,
         (select count(*) from registros r where r.user_id = d.user_id and r.date = d.date and r.feito) as feitos
  from public.day_logs d
  left join public.profiles pr on pr.user_id = d.user_id
  where d.date <= (now() at time zone coalesce(pr.timezone, 'America/Sao_Paulo'))::date
),
ativos as (select user_id, count(*) as n from dias where total > 0 and feitos * 2 >= total group by user_id),
areas_feitas as (
  select distinct r.user_id, r.date, r.area_id
  from registros r
  join public.user_areas ua on ua.user_id = r.user_id and ua.id = r.area_id
  join dias d on d.user_id = r.user_id and d.date = r.date
  where r.feito
),
qtd_areas as (select user_id, count(*) as n from public.user_areas group by user_id),
semana_ok as (
  select distinct a.user_id from areas_feitas a join qtd_areas q on q.user_id = a.user_id
  where q.n >= 5
    and (select count(distinct b.area_id) from areas_feitas b
         where b.user_id = a.user_id and b.date between a.date and a.date + 6) = q.n
),
merecem as (select user_id from ativos where n >= 30 union select user_id from semana_ok)
 select a.n as dias_ativos,
         q.n as areas,
         (s.user_id is not null) as semana_com_todas_as_areas,
         c.secret_path
  from public.companion c
  left join ativos a    on a.user_id = c.user_id
  left join qtd_areas q on q.user_id = c.user_id
  left join semana_ok s on s.user_id = c.user_id
  where 'pet:coelho-cristal' = any (c.unlocked);