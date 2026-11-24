-- =====================================================================
-- Coelho de cristal · 2. Remover de quem NÃO cumpre a regra (ALTERA DADOS)
-- Rode só depois de conferir a contagem (coelho-cristal-1-contagem.sql): afeta `tem_sem_cumprir` linhas.
-- Mantém quem desbloqueou pela lua (secret_path = 'lua'). Quem estava com o coelho de cristal de
-- favorito passa para o coelho comum. Quem merece e ainda não tem ganha sozinho ao abrir o app.
-- Mesma regra de src/lib/unlock.ts (secretUnlockPath).
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
dias as (
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
update public.companion c
set unlocked = array_remove(c.unlocked, 'pet:coelho-cristal'),
    kind = case when c.kind = 'coelho-cristal' then 'coelho' else c.kind end,
    secret_path = null
where 'pet:coelho-cristal' = any (c.unlocked)
  and c.secret_path is distinct from 'lua'
  and not exists (select 1 from merecem m where m.user_id = c.user_id);
