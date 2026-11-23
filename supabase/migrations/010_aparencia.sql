-- =====================================================================
-- Habbit Do · 010_aparencia
-- Separa a fase conquistada do pet (peak_active_days / seen_phase, que nunca regridem)
-- da aparência escolhida pela pessoa.
--  - appearance: 'auto' (segue a fase conquistada) ou uma fase fixa já conquistada.
--  - show_adult_detail: mostra o detalhe de adulto da espécie em qualquer aparência.
-- A RLS da tabela companion (auth.uid() = user_id) já vem da 001.
-- =====================================================================

alter table public.companion
  add column if not exists appearance text not null default 'auto'
    check (appearance in ('auto', 'filhote', 'jovem', 'adulto')),
  add column if not exists show_adult_detail boolean not null default true;

-- A API (PostgREST) passa a enxergar as colunas novas na hora.
notify pgrst, 'reload schema';
