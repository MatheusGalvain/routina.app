-- =====================================================================
-- Habbit Do · 004_perfil
-- Nome de exibição do perfil (privado: só a própria pessoa vê).
-- As colunas display_name e created_at já existem desde a 001; aqui só entra o limite.
-- A RLS de profiles (auth.uid() = user_id em select, insert, update e delete) já vem da 001.
-- =====================================================================

-- Até 30 caracteres e sem nome em branco. NOT VALID: não reprova linhas antigas, vale para as novas gravações.
alter table public.profiles
  add constraint profiles_display_name_check
  check (display_name is null or (char_length(display_name) between 1 and 30 and btrim(display_name) <> ''))
  not valid;
