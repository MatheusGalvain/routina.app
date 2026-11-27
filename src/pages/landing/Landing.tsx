import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendCode } from '../../lib/sendCode'
import { prefersReducedMotion } from '../../lib/motion'
import type { EntrarState } from '../Entrar'
import './landing.css'

/*
 * Landing do Habbit Do ("/" para quem não está logado). Reproduz src/docs/referencias/landing-referencia.html.
 * Fica num arquivo próprio (lazy, ver shell.tsx): quem chega no site não baixa o app.
 * Layout, tamanhos e animações ficam em landing.css (classes "ld-"), com os valores da referência.
 * Os desenhos são SVG próprios da landing, com as cores da identidade (Identidade.dc.html).
 */

// ---------------------------------------------------------------------
// Desenhos
// ---------------------------------------------------------------------

const EARS = 'M30,52 C24,34 24,14 32,8 C38,4 44,10 44,22 C44,32 42,42 40,50 Z M70,52 C76,34 76,14 68,8 C62,4 56,10 56,22 C56,32 58,42 60,50 Z'
const EAR_IN_L = 'M33,46 C29,32 30,18 35,13 C38,11 40,15 40,22 C40,30 39,38 38,46 Z'
const EAR_IN_R = 'M67,46 C71,32 70,18 65,13 C62,11 60,15 60,22 C60,30 61,38 62,46 Z'

/** Olhos em cápsula do coelho (viewBox 0 0 100 100). */
function BunnyEyes() {
  return (
    <>
      <rect x="39" y="57" width="6.5" height="12" rx="3.25" fill="#141414" />
      <rect x="54.5" y="57" width="6.5" height="12" rx="3.25" fill="#141414" />
    </>
  )
}

/** Orelhas e cabeça do coelho, o mascote (viewBox 0 0 100 100). O rosto vem em `children`. */
function BunnyBody({ innerOpacity = 0.8, children }: { innerOpacity?: number; children: ReactNode }) {
  return (
    <>
      <path d={EARS} fill="#F2F0ED" />
      <path d={EAR_IN_L} fill="#F7B8D6" opacity={innerOpacity} />
      <path d={EAR_IN_R} fill="#CDB8FF" opacity={innerOpacity} />
      <ellipse cx="50" cy="66" rx="30" ry="26" fill="#F2F0ED" />
      {children}
    </>
  )
}

const NOSE = <path d="M47.5,75 L52.5,75 L50,78 Z" fill="#F59AB0" />

/** Símbolo da marca: o coelho num quadrado de cantos 24%. */
function Mark() {
  return (
    <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#1C1C1C" />
      <BunnyBody>
        <BunnyEyes />
        {NOSE}
      </BunnyBody>
    </svg>
  )
}

/** Assinatura: "Habbit Do", com o "Do" sempre em pervinca. */
function Wordmark() {
  return (
    <span className="ld-wordmark">
      Habbit <span>Do</span>
    </span>
  )
}

/** Taça (viewBox 0 0 48 48). */
function TrophyShape({ color, base = '#3A3A3A', baseHeight = 12 }: { color: string; base?: string; baseHeight?: number }) {
  return (
    <>
      <path d="M14,6 H34 V16 A10,10 0 0 1 14,16 Z" fill={color} />
      <path d="M14,9 H9 A5,5 0 0 0 14,18 M34,9 H39 A5,5 0 0 1 34,18" fill="none" stroke={color} strokeWidth="2.5" />
      <rect x="22" y="26" width="4" height="10" fill={color} />
      <rect x="15" y="36" width="18" height={baseHeight} rx="2" fill={base} />
    </>
  )
}

// ---------------------------------------------------------------------
// Conteúdo
// ---------------------------------------------------------------------

type ItemStyle = { bg: string; border: string; dotBg: string; dotBorder: string; color: string; done: boolean }
const DONE: ItemStyle = { bg: '#1F241F', border: '#2A332B', dotBg: '#A8E6B8', dotBorder: '#A8E6B8', color: '#8F8B85', done: true }
const ACTIVE: ItemStyle = { bg: '#1C2233', border: '#3A4A7A', dotBg: 'transparent', dotBorder: '#A9BFFF', color: '#F2F0ED', done: false }
const TODO: ItemStyle = { bg: '#232323', border: '#2C2C2C', dotBg: 'transparent', dotBorder: '#4A4A4A', color: '#F2F0ED', done: false }

const TODAY_ITEMS = [
  { name: 'Arrumar a cama', meta: 'casa · hábito', areaColor: '#FFC9A8', side: '', ...DONE },
  { name: 'Beber água', meta: 'corpo · contador', areaColor: '#F4B4B4', side: '8/8', ...DONE },
  { name: 'Responder mensagens', meta: 'foco · hábito', areaColor: '#A9BFFF', side: '', ...DONE },
  { name: 'Ler 10 páginas', meta: 'estudo · contador', areaColor: '#A6E3DA', side: 'em andamento', ...ACTIVE },
  { name: 'Desligar as telas', meta: 'sono · hábito', areaColor: '#CDB8FF', side: '', ...TODO },
]

const TIERS = [
  { name: 'bronze', color: '#C98A5B' },
  { name: 'prata', color: '#C9CED8' },
  { name: 'ouro', color: '#FFC24B' },
  { name: 'cristal', color: '#C9D6FF' },
]

const STEPS = [
  { n: '01', color: '#F2F0ED', title: 'Adote um pet', text: 'Escolha entre sete bichinhos e dê um nome. Ele vai te acompanhar todos os dias.' },
  { n: '02', color: '#A9BFFF', title: 'Monte sua rotina', text: 'Comece por um modelo pronto ou do zero. Arraste os blocos para a ordem que funciona para você.' },
  { n: '03', color: '#A8E6B8', title: 'Cuide do seu dia', text: 'Marque o que fez e veja o pet reagir. À noite, uma revisão rápida fecha o dia.' },
]

const FAQ = [
  { q: 'Preciso criar senha?', a: 'Não. Você digita o e-mail e recebe um código de acesso. Cada pedido novo cancela o anterior, então use sempre o e-mail mais recente.' },
  { q: 'Funciona no celular?', a: 'Sim. O Habbit Do roda no navegador e pode ser instalado na tela inicial como um app.' },
  { q: 'E se eu passar uns dias sem usar?', a: 'Nada se perde. O pet só fica dormindo até você voltar, e os troféus e fases que você conquistou continuam seus.' },
  { q: 'Posso apagar meus dados?', a: 'Pode. No seu perfil dá para baixar tudo o que está salvo ou excluir a conta junto com os dados.' },
]

const SECTIONS = [
  { id: 'recursos', label: 'Recursos' },
  { id: 'cantinho', label: 'Cantinho' },
  { id: 'como', label: 'Como funciona' },
  { id: 'perguntas', label: 'Perguntas' },
]

// ---------------------------------------------------------------------
// Rolagem até as seções
// ---------------------------------------------------------------------

/**
 * Link para uma seção da página: rola suave (ou direto, com movimento reduzido) e leva o foco
 * para a seção, para o teclado e o leitor de tela continuarem dali. Ctrl/⌘ + clique segue o normal.
 */
function goTo(id: string, after?: () => void) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    after?.()
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }
}

// ---------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------

export function Landing() {
  return (
    <div className="ld-root">
      <div className="ld-container">
        <Nav />
      </div>
      <main>
        <div className="ld-container">
          <Hero />
        </div>
        <Features />
        <Corner />
        <HowItWorks />
        <Questions />
        <Signup />
      </main>
      <SiteFooter />
    </div>
  )
}

/** Navegação: completa a partir de 1024px; abaixo disso, menu hambúrguer (como no app). */
function Nav() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }
  const closeMenu = () => close(false)

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <nav aria-label="Principal" className="ld-nav">
      <a href="#topo" onClick={goTo('topo')} className="ld-brand">
        <Mark />
        <Wordmark />
      </a>

      <div className="ld-nav-links">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={goTo(s.id)}>
            {s.label}
          </a>
        ))}
      </div>
      <div className="ld-nav-actions">
        <Link to="/entrar" className="ld-nav-login">
          Entrar
        </Link>
        <a href="#comecar" onClick={goTo('comecar')} className="ld-btn-primary ld-nav-cta">
          Começar agora
        </a>
      </div>

      <div ref={wrapRef} className="ld-menu">
        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="menu-landing"
          onClick={() => (open ? close() : setOpen(true))}
          className="ld-menu-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6 L18 18 M18 6 L6 18" /> : <path d="M4 7 L20 7 M4 12 L20 12 M4 17 L20 17" />}
          </svg>
        </button>
        {open && (
          <div id="menu-landing" className="ld-menu-panel">
            <ul ref={listRef}>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={goTo(s.id, closeMenu)} className="ld-menu-link">
                    {s.label}
                  </a>
                </li>
              ))}
              <li className="ld-menu-split">
                <Link to="/entrar" className="ld-menu-link">
                  Entrar
                </Link>
                <a href="#comecar" onClick={goTo('comecar', closeMenu)} className="ld-btn-primary ld-menu-cta">
                  Começar agora
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <header id="topo" tabIndex={-1} className="ld-hero ld-anchor">
      <div className="ld-hero-text">
        <span className="ld-pill">
          <span aria-hidden="true" className="ld-pill-dot" />
          App de rotina com pets
        </span>
        <h1 className="ld-h1">Uma rotina que dá vontade de cuidar.</h1>
        <p className="ld-lead">
          Monte seus blocos do dia, marque o que fez e veja um bichinho reagir a cada passo. Ele cresce com você, ganha troféus e mora num cantinho que muda conforme a sua semana.
        </p>
        <div className="ld-hero-actions">
          <a href="#comecar" onClick={goTo('comecar')} className="ld-btn-primary ld-hero-cta">
            Adotar meu pet
          </a>
          <a href="#como" onClick={goTo('como')} className="ld-hero-secondary">
            Ver como funciona
          </a>
        </div>
        <p className="ld-hero-note">Sem senha: você entra com um código no e-mail.</p>
      </div>

      <div className="ld-preview">
        <div className="ld-app-card">
          <div className="ld-app-top">
            <div className="ld-app-date">
              <span className="ld-app-label">Hoje</span>
              <strong className="ld-app-day">Terça, 24 de novembro</strong>
            </div>
            <span className="ld-app-count">3/5 feitos</span>
          </div>

          <div className="ld-focus">
            <svg width="86" height="86" viewBox="0 0 100 100" role="img" aria-label="Coelho em foco" className="ld-focus-pet ld-float">
              <BunnyBody>
                <g className="ld-blink">
                  <BunnyEyes />
                </g>
                {NOSE}
              </BunnyBody>
            </svg>
            <div className="ld-focus-text">
              <span className="ld-focus-label">Pervinca / foco</span>
              <p>Estou com você em "Ler 10 páginas". Um passo de cada vez.</p>
            </div>
          </div>

          <ul className="ld-today">
            {TODAY_ITEMS.map((t) => (
              <li key={t.name} style={{ background: t.bg, borderColor: t.border }}>
                <span className="ld-today-dot" style={{ background: t.dotBg, borderColor: t.dotBorder }}>
                  {t.done && <span aria-hidden="true">✓</span>}
                  {t.done && <span className="sr-only">Feito:</span>}
                </span>
                <div className="ld-today-body">
                  <span className="ld-today-name" style={{ color: t.color, textDecoration: t.done ? 'line-through' : 'none' }}>
                    {t.name}
                  </span>
                  <span className="ld-today-meta" style={{ color: t.areaColor }}>
                    {t.meta}
                  </span>
                </div>
                <span className="ld-today-side">{t.side}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ld-badge">
          <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
            <TrophyShape color="#FFC24B" baseHeight={10} />
          </svg>
          <div className="ld-badge-text">
            <strong>Taça de ouro</strong>
            <span>21 dias seguidos</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function Features() {
  return (
    <section id="recursos" tabIndex={-1} aria-labelledby="recursos-titulo" className="ld-section-line ld-features ld-anchor">
      <div className="ld-container ld-features-inner">
        <div className="ld-features-head">
          <h2 id="recursos-titulo" className="ld-h2">
            Pequenos passos, com alguém do lado.
          </h2>
          <p>O Habbit Do não cobra perfeição. Ele mostra o que você fez, comemora junto e ajuda a voltar quando o dia sai do plano.</p>
        </div>

        <div className="ld-cards">
          <article className="ld-card">
            <div className="ld-chips">
              <span className="ld-chip" style={{ background: '#FFD59E' }}>
                hábito
              </span>
              <span className="ld-chip" style={{ background: '#A9BFFF' }}>
                contador
              </span>
              <span className="ld-chip" style={{ background: '#A8E6B8' }}>
                tarefa
              </span>
            </div>
            <div className="ld-rows">
              {[
                { name: 'Arrumar a cama', side: 'todo dia', color: '#FFD59E' },
                { name: 'Beber água', side: '− 5/8 +', color: '#A9BFFF' },
                { name: 'Pagar a internet', side: 'some depois', color: '#A8E6B8' },
              ].map((r) => (
                <div key={r.name} className="ld-row">
                  <span className="ld-row-name">{r.name}</span>
                  <span className="ld-row-side" style={{ color: r.color }}>
                    {r.side}
                  </span>
                </div>
              ))}
            </div>
            <div className="ld-card-copy">
              <h3>Três jeitos de marcar</h3>
              <p>Hábitos que se repetem, contadores com meta e tarefas que somem quando ficam prontas. Tudo na ordem que fizer sentido para o seu dia, sem horário fixo.</p>
            </div>
          </article>

          <article className="ld-card">
            <div className="ld-moods">
              <PetMood label="foco" color="#A9BFFF">
                <path d="M22,62 C22,34 40,18 60,18 C80,18 98,34 98,62 C98,72 94,78 90,80 Q86,96 80,88 Q74,102 66,90 Q60,104 54,90 Q46,102 40,88 Q34,96 30,80 C26,78 22,72 22,62 Z" fill="#1E88FF" />
                <rect x="45.5" y="45" width="9" height="18" rx="4.5" fill="#0A0D14" />
                <rect x="65.5" y="45" width="9" height="18" rx="4.5" fill="#0A0D14" />
              </PetMood>
              <PetMood label="feito" color="#A8E6B8">
                <circle cx="38" cy="42" r="15" fill="#22C55E" />
                <circle cx="82" cy="42" r="15" fill="#22C55E" />
                <ellipse cx="60" cy="72" rx="44" ry="32" fill="#22C55E" />
                <path d="M31,46 Q38,37 45,46 M75,46 Q82,37 89,46 M50,80 Q60,89 70,80" fill="none" stroke="#0A0D14" strokeWidth="3.5" strokeLinecap="round" />
              </PetMood>
              <PetMood label="atenção" color="#FFD59E">
                <path d="M52,32 Q53,14 61,26 Q66,12 70,32 Z" fill="#FFB020" />
                <circle cx="60" cy="66" r="38" fill="#FFB020" />
                <rect x="45.5" y="57" width="9" height="9" rx="4.5" fill="#0A0D14" />
                <rect x="65.5" y="57" width="9" height="9" rx="4.5" fill="#0A0D14" />
                <path d="M54,73 L66,73 L60,81 Z" fill="#E07B00" />
              </PetMood>
              <PetMood label="descanso" color="#CDB8FF">
                <path d="M26,50 L30,20 L47,35 Q60,30 73,35 L90,20 L94,50 C98,82 84,104 60,104 C36,104 22,82 26,50 Z" fill="#8B5CF6" />
                <circle cx="45" cy="60" r="13" fill="#C4B5FD" opacity=".45" />
                <circle cx="75" cy="60" r="13" fill="#C4B5FD" opacity=".45" />
                <path d="M39,60 Q45,65 51,60 M69,60 Q75,65 81,60" fill="none" stroke="#0A0D14" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M57,70 L63,70 L60,76 Z" fill="#FFB020" />
              </PetMood>
            </div>
            <div className="ld-card-copy">
              <h3>Um pet que sente o seu dia</h3>
              <p>Ele se concentra junto quando você começa um bloco, comemora quando termina e boceja quando o dia acaba. Escolha o seu entre sete bichinhos e dê um nome.</p>
            </div>
          </article>

          <article className="ld-card">
            <div className="ld-tiers">
              {TIERS.map((t) => (
                <div key={t.name} className="ld-tier">
                  <svg width="52" height="52" viewBox="0 0 48 48" aria-hidden="true">
                    <TrophyShape color={t.color} />
                  </svg>
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
            <div className="ld-card-copy">
              <h3>Troféus que não se perdem</h3>
              <p>Sequências, blocos concluídos e áreas bem cuidadas viram troféus em quatro níveis. Pulou uns dias? O que você conquistou continua seu.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

/** Um bichinho do cartão "Um pet que sente o seu dia" (viewBox 0 0 120 120), com o estado embaixo. */
function PetMood({ label, color, children }: { label: string; color: string; children: ReactNode }) {
  return (
    <div className="ld-mood">
      <svg width="54" height="54" viewBox="0 0 120 120" aria-hidden="true">
        {children}
      </svg>
      <span style={{ color }}>{label}</span>
    </div>
  )
}

const FIREFLIES = [
  { cx: 300, cy: 150, r: 3, fill: '#CDB8FF', d: '4s', dl: '0s' },
  { cx: 420, cy: 110, r: 3, fill: '#CDB8FF', d: '5s', dl: '1s' },
  { cx: 520, cy: 180, r: 2.6, fill: '#F4B4B4', d: '4.4s', dl: '.4s' },
  { cx: 760, cy: 140, r: 3, fill: '#A9BFFF', d: '5.2s', dl: '2s' },
  { cx: 860, cy: 200, r: 2.4, fill: '#A8E6B8', d: '4.8s', dl: '1.4s' },
  { cx: 660, cy: 100, r: 2.2, fill: '#FFD59E', d: '6s', dl: '.8s' },
]

const BACK_TREES = [
  [60, 250, 60],
  [140, 220, 70],
  [250, 250, 64],
  [360, 230, 72],
  [480, 260, 60],
  [700, 250, 66],
  [820, 230, 72],
  [940, 260, 64],
  [1060, 230, 76],
  [1170, 250, 62],
]

const GRASS = ['M240,372 q-3,-8 -2,-16', 'M262,380 q2,-8 4,-14', 'M420,370 q-2,-9 1,-17', 'M760,372 q3,-8 2,-16', 'M940,378 q-3,-8 -1,-14', 'M980,370 q2,-9 4,-15', 'M120,384 q2,-8 1,-14', 'M1080,386 q-2,-8 0,-14']

function Corner() {
  return (
    <section id="cantinho" tabIndex={-1} aria-labelledby="cantinho-titulo" className="ld-corner ld-anchor">
      <div className="ld-container">
        <div className="ld-corner-card">
          <svg
            viewBox="0 0 1200 440"
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label="O cantinho na floresta: o coelho numa clareira à noite com lanterna, cogumelo, vaga-lumes e troféus"
            className="ld-corner-scene"
          >
            <defs>
              <linearGradient id="ld-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#08110F" />
                <stop offset=".6" stopColor="#10201B" />
                <stop offset="1" stopColor="#1C3229" />
              </linearGradient>
              <radialGradient id="ld-moon" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#F6F1E6" stopOpacity=".45" />
                <stop offset="1" stopColor="#F6F1E6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ld-pool" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#FFD59E" stopOpacity=".22" />
                <stop offset="1" stopColor="#FFD59E" stopOpacity="0" />
              </radialGradient>
              <filter id="ld-blur">
                <feGaussianBlur stdDeviation="3" />
              </filter>
              <filter id="ld-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
              <filter id="ld-glow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="1200" height="440" fill="url(#ld-sky)" />
            <circle cx="930" cy="90" r="140" fill="url(#ld-moon)" />
            <circle cx="930" cy="90" r="22" fill="#F6F1E6" />
            {/* Árvores do fundo, desfocadas */}
            <g fill="#173027" filter="url(#ld-blur)" opacity=".8">
              {BACK_TREES.map(([cx, cy, r]) => (
                <circle key={cx} cx={cx} cy={cy} r={r} />
              ))}
            </g>
            {/* Névoa */}
            <ellipse cx="600" cy="320" rx="560" ry="26" fill="#CFE3D8" opacity=".07" filter="url(#ld-soft)" className="ld-mist" />
            {/* Árvores da frente */}
            <g fill="#1A3A2E">
              <circle cx="40" cy="250" r="70" />
              <circle cx="110" cy="200" r="64" />
              <circle cx="170" cy="260" r="60" />
              <rect x="100" y="260" width="16" height="90" fill="#142B22" />
              <circle cx="1060" cy="230" r="72" />
              <circle cx="1130" cy="190" r="60" />
              <circle cx="1180" cy="250" r="70" />
              <rect x="1110" y="260" width="18" height="90" fill="#142B22" />
            </g>
            {/* Vaga-lumes */}
            <g filter="url(#ld-glow)">
              {FIREFLIES.map((f) => (
                <circle key={f.cx} cx={f.cx} cy={f.cy} r={f.r} fill={f.fill} className="ld-firefly" style={{ '--d': f.d, '--dl': f.dl } as CSSProperties} />
              ))}
            </g>
            {/* Chão e a luz da lanterna */}
            <path d="M0,350 C200,336 400,342 600,340 C800,338 1000,334 1200,346 V440 H0 Z" fill="#16261F" />
            <ellipse cx="600" cy="350" rx="300" ry="40" fill="url(#ld-pool)" />
            <g stroke="#3A6650" strokeWidth="2" strokeLinecap="round" fill="none">
              {GRASS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            {/* Lanterna */}
            <g transform="translate(410 282)">
              <circle cx="24" cy="30" r="40" fill="#FFD59E" opacity=".14" />
              <path d="M15,13 L24,7 L33,13 Z" fill="#4E4843" />
              <rect x="15" y="13" width="18" height="4" rx="1.5" fill="#625B55" />
              <rect x="16.5" y="17" width="15" height="20" rx="3" fill="#FFE6B8" />
              <path d="M24,22 C27,26 27,29 24,32 C21,29 21,26 24,22 Z" fill="#FFB86B" className="ld-flame" />
              <rect x="14" y="37" width="20" height="4" rx="1.5" fill="#625B55" />
              <rect x="12" y="41" width="24" height="18" rx="3" fill="#2E3A33" />
            </g>
            {/* Cogumelo */}
            <g transform="translate(330 300)">
              <path d="M19,28 C18,38 17,44 16,48 H32 C31,44 30,38 29,28 Z" fill="#EFE6D8" />
              <path d="M5,29 C5,14 15,6 24,6 C33,6 43,14 43,29 C34,32 14,32 5,29 Z" fill="#F4B4B4" />
              <ellipse cx="16" cy="18" rx="3.4" ry="2.6" fill="#FFF3F0" />
              <ellipse cx="28" cy="13" rx="2.6" ry="2" fill="#FFF3F0" />
            </g>
            {/* Troféus no chão */}
            <g transform="translate(740 296)">
              <TrophyShape color="#FFC24B" base="#2E3A33" baseHeight={14} />
            </g>
            <g transform="translate(820 300)">
              <path d="M15,2 L24,20 L33,2 H27 L24,9 L21,2 Z" fill="#2E3A33" />
              <circle cx="24" cy="32" r="14" fill="#C9CED8" />
              <circle cx="24" cy="32" r="9" fill="none" stroke="#141414" strokeOpacity=".2" strokeWidth="2" />
            </g>
            {/* Coelho */}
            <ellipse cx="600" cy="350" rx="64" ry="8" fill="#000000" opacity=".45" />
            <g className="ld-float-slow">
              <svg x="520" y="190" width="160" height="160" viewBox="0 0 100 100" overflow="visible">
                <BunnyBody>
                  <BunnyEyes />
                  {NOSE}
                  <circle cx="35" cy="73" r="4" fill="#F7B8D6" opacity=".5" />
                  <circle cx="65" cy="73" r="4" fill="#F7B8D6" opacity=".5" />
                </BunnyBody>
              </svg>
            </g>
          </svg>

          <div className="ld-corner-copy">
            <div className="ld-corner-title">
              <span className="ld-kicker">O cantinho</span>
              <h2 id="cantinho-titulo" className="ld-corner-h2">
                Uma casa que reflete a sua semana.
              </h2>
            </div>
            <p>
              Cada área da vida que você cuidou acende vaga-lumes na clareira, ou constelações no céu, se preferir morar entre as estrelas. No chão, ficam os troféus e as coisinhas que você escolheu expor.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="como" tabIndex={-1} aria-labelledby="como-titulo" className="ld-section-line ld-steps-section ld-anchor">
      <div className="ld-container ld-steps-inner">
        <h2 id="como-titulo" className="ld-h2">
          Começa em três passos.
        </h2>
        <ol className="ld-steps">
          {STEPS.map((s) => (
            <li key={s.n} className="ld-step" style={{ borderColor: s.color }}>
              <span className="ld-step-n" style={{ color: s.color }}>
                {s.n}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Questions() {
  return (
    <section id="perguntas" tabIndex={-1} aria-labelledby="perguntas-titulo" className="ld-section-line ld-faq-section ld-anchor">
      <div className="ld-container ld-faq-inner">
        <h2 id="perguntas-titulo" className="ld-h2">
          Perguntas que sempre aparecem.
        </h2>
        <div className="ld-faq-list">
          {FAQ.map((f) => (
            <details key={f.q} className="ld-faq">
              <summary>
                {f.q}
                <span aria-hidden="true" className="ld-faq-sign">
                  <span className="ld-plus">+</span>
                  <span className="ld-minus">−</span>
                </span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Chamada final: pede o código aqui mesmo e leva para /entrar, já no passo de digitar o código. */
function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (sending) return
    setError(null)
    setSending(true)
    // O mesmo envio da /entrar (com a mesma trava contra envio em dobro e o mesmo intervalo).
    const result = await sendCode(email)
    if (result.ok) {
      const state: EntrarState = { sentTo: result.email }
      navigate('/entrar', { state })
      return
    }
    setSending(false)
    if (result.busy) return
    setError(result.wait ? `${result.error} Tente de novo em ${result.wait} segundos.` : (result.error ?? null))
  }

  // Ao focar o campo, já busca a tela de entrada: depois do envio ela abre sem esperar.
  const prefetchEntrar = () => void import('../Entrar').catch(() => {})

  return (
    <section id="comecar" tabIndex={-1} aria-labelledby="comecar-titulo" className="ld-signup ld-anchor">
      <div className="ld-container">
        <div className="ld-signup-card">
          <div className="ld-signup-text">
            <h2 id="comecar-titulo" className="ld-signup-h2">
              Seu bichinho está te esperando.
            </h2>
            <p>Escolha um pet, monte a primeira rotina e marque o primeiro bloco em menos de um minuto.</p>
            <form onSubmit={submit} className="ld-form">
              <label htmlFor="ld-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="ld-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={prefetchEntrar}
                placeholder="seu@email.com"
                aria-describedby={error ? 'ld-email-erro' : undefined}
                className="ld-input"
              />
              <button type="submit" disabled={sending} className="ld-submit">
                {sending ? 'Enviando…' : 'Receber meu código'}
              </button>
            </form>
            {error && (
              <p id="ld-email-erro" role="alert" className="ld-error">
                {error}
              </p>
            )}
          </div>
          <svg width="220" height="220" viewBox="0 0 100 100" role="img" aria-label="Coelho acenando" className="ld-wave ld-float-slow">
            <BunnyBody innerOpacity={1}>
              <path d="M38,62 Q42,57 46,62 M54,62 Q58,57 62,62" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
              <path d="M47.5,72 L52.5,72 L50,75 Z" fill="#F59AB0" />
              <path d="M45,78 Q50,82 55,78" fill="none" stroke="#141414" strokeWidth="2" strokeLinecap="round" />
              <circle cx="35" cy="71" r="4" fill="#F7B8D6" opacity=".7" />
              <circle cx="65" cy="71" r="4" fill="#F7B8D6" opacity=".7" />
            </BunnyBody>
          </svg>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="ld-footer">
      <div className="ld-footer-inner">
        <Wordmark />
        <div className="ld-footer-links">
          <Link to="/privacidade">Política de privacidade</Link>
          <Link to="/novidades">Novidades</Link>
          <span className="ld-mono">habbitdo.com.br</span>
        </div>
      </div>
    </footer>
  )
}
