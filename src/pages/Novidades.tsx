import { useEffect, type ReactNode } from 'react'
import { CHANGELOG, LATEST_VERSION, formatChangelogDate } from '../data/changelog'
import { ChangelogItems } from '../components/home/NewsNotice'
import { setLastSeenVersion, useSession } from '../sync/session'
import { useShownPet } from '../store/useCompanion'
import { Pet } from '../components/pets/Pet'
import { Footer } from '../components/ui/Footer'
import { BunnyMark } from '../components/ui/BunnyMark'
import { Icon } from '../components/ui/ui'
import { useBack } from '../lib/navigation'

/** /novidades: o histórico inteiro do que mudou no app, da versão mais nova para a mais antiga. */
export function Novidades() {
  const pet = useShownPet('neutro')
  const lastSeen = useSession((s) => s.profile?.lastSeenVersion)

  // Abriu a página: a versão mais nova conta como vista (o aviso do Início some).
  useEffect(() => {
    if (lastSeen !== LATEST_VERSION) setLastSeenVersion(LATEST_VERSION)
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <NewsHeader art={<Pet kind={pet.kind} state="neutro" phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} size={72} interactive={false} />} />
      <ChangelogList />
    </div>
  )
}

/** /novidades sem sessão (link do rodapé da landing): a mesma lista, com o símbolo no lugar do pet. */
export function NovidadesPublica() {
  const back = useBack('/')
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-4 py-8">
        <button type="button" onClick={back} className="flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-sm font-semibold text-muted hover:text-soft">
          <Icon name="chevron-left" size={16} /> Voltar
        </button>
        <NewsHeader art={<BunnyMark size={72} label={null} />} />
        <ChangelogList />
      </main>
      <Footer />
    </div>
  )
}

function NewsHeader({ art }: { art: ReactNode }) {
  return (
    <header className="flex items-center gap-4">
      {art}
      <div>
        <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Habbit Do</p>
        <h1 className="m-0 mt-1 text-3xl font-extrabold tracking-tight">Novidades</h1>
        <p className="m-0 mt-1 text-muted">Tudo o que mudou no app, versão por versão.</p>
      </div>
    </header>
  )
}

function ChangelogList() {
  return (
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {CHANGELOG.map((e, i) => (
          <li key={e.versão}>
            <article className="flex flex-col gap-3 rounded-[22px] border border-line bg-panel p-5 sm:p-6">
              <header className="flex flex-col gap-1">
                <p className="m-0 flex flex-wrap items-center gap-2 font-mono text-[12px] text-muted">
                  <span>Versão {e.versão}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={e.data}>{formatChangelogDate(e.data)}</time>
                  {i === 0 && <span className="rounded-full bg-noite/15 px-2 py-0.5 font-sans text-[11px] font-semibold text-noite">mais recente</span>}
                </p>
                <h2 className="m-0 text-lg font-bold">{e.título}</h2>
              </header>
              <ChangelogItems entry={e} />
            </article>
          </li>
        ))}
      </ol>
  )
}
