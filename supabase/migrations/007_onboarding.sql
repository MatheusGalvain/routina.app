-- =====================================================================
-- Habbit Do · 007_onboarding
-- Guarda no perfil que a pessoa já passou (ou pulou) o onboarding de primeiro acesso,
-- para ele não aparecer de novo em nenhum aparelho.
-- A RLS de profiles (auth.uid() = user_id) já vem da 001.
-- =====================================================================

alter table public.profiles
  add column if not exists onboarding_done boolean not null default false;

-- Quem já usava o app (tem pet favorito ou alguma rotina) não precisa ver o onboarding.
update public.profiles p
  set onboarding_done = true
  where exists (select 1 from public.routines r where r.user_id = p.user_id)
     or exists (select 1 from public.companion c where c.user_id = p.user_id and c.kind is not null);
