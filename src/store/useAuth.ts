import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Status = 'loading' | 'signedOut' | 'signedIn'

interface AuthState {
  status: Status
  session: Session | null
  /** Já teve sessão desde que o app abriu: ficar sem ela agora é "saiu da conta", não "abriu um link sem login". */
  hadSession: boolean
}

/** Sessão do Supabase. Sem persist próprio: quem guarda a sessão é o cliente do Supabase. */
export const useAuth = create<AuthState>()(() => ({ status: 'loading', session: null, hadSession: false }))

const apply = (session: Session | null) =>
  useAuth.setState((s) => ({ session, status: session ? 'signedIn' : 'signedOut', hadSession: s.hadSession || !!session }))

supabase.auth.getSession().then(({ data }) => apply(data.session))
supabase.auth.onAuthStateChange((_event, session) => apply(session))

export const signOut = () => supabase.auth.signOut()
