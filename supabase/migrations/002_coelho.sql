-- =====================================================================
-- Habbit Do · 002_coelho
-- Aceita o sétimo pet ('coelho') como favorito.
-- O desbloqueio dele fica na coluna `unlocked` que já existe (valor 'pet:coelho'),
-- então nenhuma tabela ou coluna nova é criada.
-- =====================================================================

alter table public.companion drop constraint if exists companion_kind_check;

alter table public.companion
  add constraint companion_kind_check
  check (kind is null or kind in ('gatinho', 'sapinho', 'polvinho', 'pintinho', 'ourico', 'corujinha', 'coelho'));
