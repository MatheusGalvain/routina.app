import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useRotina } from '../store/useRotina'
import { useAuth, signOut } from '../store/useAuth'
import { NAME_MAX, deleteAccount, exportMyData, nameFromEmail, setDisplayName, setProfileTimezone, useSession } from '../sync/session'
import { flushNow } from '../sync/outbox'
import { computePetState, getTodayItems } from '../lib/today'
import { dayKey, deviceTimeZone, nowInTz } from '../lib/dates'
import { useShownPet } from '../store/useCompanion'
import { useTrophyView } from '../store/useTrophies'
import { TIERS, TROPHIES, Trophy, trophyTitle } from '../data/trophies'
import { Icon } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { STATE_STYLE } from '../components/pets/pets'

/** Fusos mais usados no Brasil e em Portugal. */
const TIMEZONES: { id: string; label: string }[] = [
  { id: 'America/Sao_Paulo', label: 'Brasília (Sul, Sudeste, GO, DF)' },
  { id: 'America/Bahia', label: 'Bahia' },
  { id: 'America/Fortaleza', label: 'Fortaleza (CE, MA, PI, RN, PB)' },
  { id: 'America/Recife', label: 'Recife (PE)' },
  { id: 'America/Maceio', label: 'Maceió (AL, SE)' },
  { id: 'America/Belem', label: 'Belém (PA, AP)' },
  { id: 'America/Araguaina', label: 'Tocantins' },
  { id: 'America/Manaus', label: 'Manaus (AM)' },
  { id: 'America/Cuiaba', label: 'Cuiabá (MT)' },
  { id: 'America/Campo_Grande', label: 'Campo Grande (MS)' },
  { id: 'America/Porto_Velho', label: 'Porto Velho (RO)' },
  { id: 'America/Boa_Vista', label: 'Boa Vista (RR)' },
  { id: 'America/Rio_Branco', label: 'Rio Branco (AC)' },
  { id: 'America/Noronha', label: 'Fernando de Noronha' },
  { id: 'Europe/Lisbon', label: 'Lisboa (Portugal continental)' },
  { id: 'Atlantic/Madeira', label: 'Madeira' },
  { id: 'Atlantic/Azores', label: 'Açores' },
]
const AUTO = '__auto'

const btn = 'min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-soft hover:bg-panel-2 disabled:opacity-50'

function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="flex flex-col gap-4 rounded-[22px] border border-line bg-panel p-5 sm:p-6">
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

/** Perfil pessoal e privado: quem é, números, vitrine de troféus e configurações. */
export function Perfil({ openPrivacy, openCollection }: { openPrivacy: () => void; openCollection: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <Header />
      <Numbers />
      <Showcase openCollection={openCollection} />
      <Settings openPrivacy={openPrivacy} />
    </div>
  )
}

/** Estado do pet agora, como no Início (para a aura do avatar). */
function useAutoState() {
  const now = nowInTz()
  const date = dayKey(now)
  const routines = useRotina((s) => s.routines)
  const dayLog = useRotina((s) => s.logs[date])
  const completedTasks = useRotina((s) => s.completedTasks)
  const activeId = useRotina((s) => s.activeBlockId)
  const items = useMemo(() => getTodayItems(routines, dayLog, completedTasks, now, date), [routines, dayLog, completedTasks, date])
  return computePetState(items, activeId, now)
}

function Header() {
  const pet = useShownPet(useAutoState())
  const email = useAuth((s) => s.session?.user.email)
  const profile = useSession((s) => s.profile)
  const name = profile?.displayName ?? nameFromEmail(email)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const editBtn = useRef<HTMLButtonElement>(null)

  const look = STATE_STYLE[pet.state]
  const aura = pet.sleeping ? '#8B5CF6' : look.color
  const since = profile ? new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : null

  const close = () => {
    setEditing(false)
    requestAnimationFrame(() => editBtn.current?.focus())
  }
  const save = () => {
    setDisplayName(draft)
    close()
  }

  return (
    <section className="flex flex-col items-center gap-3 rounded-[22px] border border-line bg-panel px-5 pt-7 pb-6 text-center">
      <div
        className="grid h-[124px] w-[124px] place-items-center rounded-full border"
        style={{ borderColor: `${aura}55`, background: `radial-gradient(circle, ${aura}26 0%, transparent 70%)`, transition: 'border-color .6s ease, background .6s ease' }}
      >
        <Pet
          kind={pet.kind}
          state={pet.state}
          sleeping={pet.sleeping}
          phase={pet.phase}
          accessories={pet.accessories}
          size={96}
          label={`Seu pet: ${pet.sleeping ? 'dormindo' : look.title}`}
        />
      </div>

      {editing ? (
        <form
          className="flex w-full max-w-[360px] flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-sm text-muted">Como quer ser chamado</span>
            <input
              autoFocus
              value={draft}
              maxLength={NAME_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && close()}
              autoComplete="nickname"
              className="min-h-11 rounded-xl border border-line bg-[#0B0E15] px-3 text-soft"
            />
          </label>
          <div className="flex justify-center gap-2">
            <button type="submit" className="min-h-11 rounded-full bg-foco-strong px-5 text-sm font-bold text-white">
              Salvar
            </button>
            <button type="button" onClick={close} className={btn}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex max-w-full items-center gap-1">
          <h1 className="m-0 min-w-0 truncate text-2xl font-extrabold tracking-tight">{name}</h1>
          <button
            ref={editBtn}
            type="button"
            aria-label="Editar nome"
            onClick={() => {
              setDraft(name)
              setEditing(true)
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft"
          >
            <Icon name="edit" size={16} />
          </button>
        </div>
      )}

      {since && <p className="m-0 text-sm text-muted">No Habbit Do desde {since}</p>}
    </section>
  )
}

function Numbers() {
  const view = useShownPet('neutro')
  const s = view.stats
  const items: [string, number][] = [
    ['Dias ativos', view.activeDays],
    ['Maior sequência', s.bestStreak],
    ['Sequência atual', s.currentStreak],
    ['Blocos concluídos', s.blocksDone],
  ]
  return (
    <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1 rounded-2xl border border-line bg-panel px-4 py-3.5">
          <dt className="text-[12.5px] text-muted">{label}</dt>
          <dd className="m-0 text-2xl font-extrabold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** O nível mais alto de cada troféu, do maior nível para o menor (e o mais recente primeiro), até 6. */
function Showcase({ openCollection }: { openCollection: () => void }) {
  const { trophies } = useTrophyView()
  const top = TROPHIES.flatMap((t) => {
    const list = trophies[t.id] ?? []
    const best = list.reduce<(typeof list)[number] | null>((a, u) => (!a || u.tier > a.tier ? u : a), null)
    return best ? [{ id: t.id, ...best }] : []
  })
    .sort((a, b) => b.tier - a.tier || b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, 6)

  return (
    <Card title="Vitrine de troféus">
      {top.length ? (
        <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-6">
          {top.map((t) => (
            <li key={t.id} className="flex flex-col items-center gap-1.5 text-center">
              <Trophy id={t.id} tier={t.tier} size={52} />
              <span className="text-[12px] leading-tight text-soft">{trophyTitle(t.id, t.tier)}</span>
              <span className="sr-only">Nível {TIERS[t.tier].name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted">Seus troféus vão aparecer aqui.</p>
      )}
      <button type="button" onClick={openCollection} className="min-h-11 self-start rounded-full px-1 text-sm font-semibold text-[#5AA7FF] hover:underline">
        Ver coleção completa
      </button>
    </Card>
  )
}

function Settings({ openPrivacy }: { openPrivacy: () => void }) {
  const email = useAuth((s) => s.session?.user.email)
  const timezone = useSession((s) => s.profile?.timezone) ?? 'America/Sao_Paulo'
  const device = deviceTimeZone()
  const [leaving, setLeaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const options = TIMEZONES.some((t) => t.id === timezone) ? TIMEZONES : [{ id: timezone, label: timezone.replace(/_/g, ' ') }, ...TIMEZONES]

  const leave = async () => {
    setLeaving(true)
    // Tenta subir o que falta antes de sair (sem travar se estiver sem conexão).
    await Promise.race([flushNow(), new Promise((r) => setTimeout(r, 3000))])
    await signOut()
  }

  const download = async () => {
    setExporting(true)
    setError(null)
    try {
      await exportMyData()
    } catch {
      setError('Não foi possível baixar agora. Verifique a conexão e tente de novo.')
    }
    setExporting(false)
  }

  return (
    <Card title="Configurações">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Fuso horário dos seus dias</span>
        <select
          value={timezone}
          onChange={(e) => setProfileTimezone(e.target.value === AUTO ? device : e.target.value)}
          className="min-h-11 w-full rounded-xl border border-line bg-[#0B0E15] px-3 text-soft"
        >
          <option value={AUTO}>Detectar automaticamente ({device.replace(/_/g, ' ')})</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <p className="m-0 text-sm text-muted">
          Conectado como <strong className="break-all text-soft">{email ?? 'sua conta'}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={download} disabled={exporting} className={btn}>
            {exporting ? 'Preparando…' : 'Baixar meus dados'}
          </button>
          <button type="button" onClick={openPrivacy} className={btn}>
            Política de privacidade
          </button>
          <button type="button" onClick={leave} disabled={leaving} className={btn}>
            {leaving ? 'Saindo…' : 'Sair'}
          </button>
        </div>
        {error && (
          <p role="alert" className="m-0 text-sm text-[#FDA4AF]">
            {error}
          </p>
        )}
      </div>

      <DeleteAccount />
    </Card>
  )
}

/** Excluir a conta: por último, com a confirmação de digitar EXCLUIR. */
function DeleteAccount() {
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    setDeleting(true)
    setError(null)
    try {
      await deleteAccount()
    } catch {
      setError('Não foi possível excluir agora. Nada foi apagado. Verifique a conexão e tente de novo.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 self-start rounded-full border border-[#5A1C2A] px-4 text-sm font-semibold text-[#FDA4AF] hover:bg-[#2A0F16]"
        >
          Excluir minha conta
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#5A1C2A] bg-[#1A0B10] p-4">
          <p className="m-0 text-sm text-[#FECDD3]">
            Isso apaga <strong>para sempre</strong> sua conta, rotinas, registros, notas, troféus e seu pet, em todos os aparelhos. Não dá para desfazer. Se
            quiser guardar uma cópia, baixe seus dados antes.
          </p>
          <label className="flex flex-col gap-1.5 text-sm text-[#FECDD3]">
            Para confirmar, digite EXCLUIR
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="min-h-11 max-w-[220px] rounded-xl border border-[#5A1C2A] bg-[#0B0E15] px-3 font-mono text-soft"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={typed.trim().toUpperCase() !== 'EXCLUIR' || deleting}
              onClick={remove}
              className="min-h-11 rounded-full bg-[#E11D48] px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              {deleting ? 'Excluindo…' : 'Excluir tudo'}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setConfirming(false)
                setTyped('')
              }}
              className={btn}
            >
              Cancelar
            </button>
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-[#FDA4AF]">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
