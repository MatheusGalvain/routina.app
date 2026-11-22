-- =====================================================================
-- Habbit Do · 008_paleta_pastel
-- Nova identidade: preto neutro com tons pastel. Converte as cores vivas antigas
-- já salvas em áreas, rotinas e modelos para as equivalentes em pastel.
-- (O app também converte ao ler, então rodar esta migration é para o banco ficar consistente.)
-- As rotinas congeladas no histórico (day_logs.plan) são convertidas pelo app ao ler.
-- =====================================================================

-- Áreas da vida: as 8 padrão e as 4 cores extras da paleta antiga.
update public.user_areas set color = case upper(color)
    when '#8B5CF6' then '#CDB8FF'
    when '#F43F5E' then '#F4B4B4'
    when '#1E88FF' then '#A9BFFF'
    when '#FFB020' then '#FFC9A8'
    when '#22C55E' then '#A8E6B8'
    when '#2DD4BF' then '#A6E3DA'
    when '#A78BFA' then '#D9C9FF'
    when '#FB7185' then '#F7B8D6'
    when '#F97316' then '#FDC1AC'
    when '#38BDF8' then '#94D9EE'
    when '#A3E635' then '#BDD7A3'
    when '#E879F9' then '#E0C4F6'
    else color
  end
  where upper(color) in ('#8B5CF6', '#F43F5E', '#1E88FF', '#FFB020', '#22C55E', '#2DD4BF', '#A78BFA', '#FB7185', '#F97316', '#38BDF8', '#A3E635', '#E879F9');

-- Rotinas e modelos: as 6 cores de rotina.
update public.routines set color = case upper(color)
    when '#FFB020' then '#FFD59E'
    when '#1E88FF' then '#A9BFFF'
    when '#22C55E' then '#A8E6B8'
    when '#F43F5E' then '#F4B4B4'
    when '#8B5CF6' then '#CDB8FF'
    when '#2DD4BF' then '#A6E3DA'
    else color
  end
  where upper(color) in ('#FFB020', '#1E88FF', '#22C55E', '#F43F5E', '#8B5CF6', '#2DD4BF');

update public.user_templates set color = case upper(color)
    when '#FFB020' then '#FFD59E'
    when '#1E88FF' then '#A9BFFF'
    when '#22C55E' then '#A8E6B8'
    when '#F43F5E' then '#F4B4B4'
    when '#8B5CF6' then '#CDB8FF'
    when '#2DD4BF' then '#A6E3DA'
    else color
  end
  where upper(color) in ('#FFB020', '#1E88FF', '#22C55E', '#F43F5E', '#8B5CF6', '#2DD4BF');
