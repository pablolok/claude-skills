import { atom, read, update } from 'claude-code'
import type { AgentInfo, CommandRunInput, EngineInterface, Register, SessionMessage, SessionRateLimit } from 'claude-code'

import type { AgentRun, BudgetPolicy, GateRefusal, BudgetSummary, CodexStatus, CodexTokens, Flow, GeminiStatus, ModelHints, Panel, Phase, PlannedTask, PlanFamily, PlanHistory, PlanProjection, PlanUsage, PlanWindow, PlanWindowKey, TierEstimates, UsageReadings, WindowHistory } from '../types'
import { readsAsRecipe, saysWhyNotTools } from './fit'
import { CLAY, INK, codexBadge, codexBody, crabBody, geminiBadge, geminiBody, pixels, stamp, withBody } from './sprite'
import type { Fill } from './sprite'
import { DRESSES, THEMES, THEME_CSS, THEME_LABEL, THEME_LABEL_IT, costumeIn, themeOf, themeOn } from './themes'
import type { Dress, Theme } from './themes'

const flow = atom({ plugin: 'savvy-progress', key: 'flow' } as const, null)
const agents = atom({ plugin: 'savvy-progress', key: 'agents' } as const, [])
const panel = atom({ plugin: 'savvy-progress', key: 'panel' } as const, {
  isCompact: false,
  isDoneCollapsed: false,
  autoOpenedFor: '',
})
const now = atom({ plugin: 'savvy-progress', key: 'now' } as const, 0)
const picked = atom({ plugin: 'savvy-progress', key: 'theme' } as const, 'auto')
const shown = atom({ plugin: 'savvy-progress', key: 'shown' } as const, null)
const runningIds = atom({ plugin: 'savvy-progress', key: 'runningIds' } as const, [])
const picking = atom({ plugin: 'savvy-progress', key: 'picking' } as const, 0)
const EMPTY_MODELS: ModelHints = { codex: {}, claude: {} }
const models = atom({ plugin: 'savvy-progress', key: 'models' } as const, EMPTY_MODELS)
const EMPTY_USAGE: UsageReadings = { statuses: {} }
const usageReadings = atom({ plugin: 'savvy-progress', key: 'usage' } as const, EMPTY_USAGE)

const TOOL = 'mcp__savvy-progress__progress'
const STEP_TOOL = 'mcp__savvy-progress__step'
const BUDGET_TOOL = 'mcp__savvy-progress__budget'
const DECIDE_TOOL = 'mcp__savvy-progress__decide'
// The host's tool a subagent delivers its final report with; the call ends its run.
const HANDBACK_TOOL = 'SubagentHandback'
const PANE = 'savvy-agents'
const PHASES: readonly Phase[] = ['plan', 'design', 'delegate', 'review', 'close']
const ACCENT = '#8f8cf4'
const DONE = '#5fbf8f'
// What the Agent tool takes as `effort` and as `model`: a task or a call naming anything else names none.
const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max']
const MODELS: readonly string[] = ['fable', 'opus', 'sonnet', 'haiku']

type ProgressInput = {
  title?: string
  total?: number
  done?: number
  phase?: Phase
  finished?: boolean
  tasks?: { title?: string; tier?: string; after?: number[]; effort?: string; model?: string; agent?: string }[]
  clearFinished?: boolean
}

// ---------------------------------------------------------------------------
// Language: the `language` option (also picked in the panel), else Claude Code's
// `language` setting, else the process locale; Italian when they say Italian, English
// otherwise. Everything the plugin writes in words follows it: the bar, the panel, the
// commands' answers and descriptions, dates, and its messages to the model. Only the
// tools' JSON lines and descriptions stay English, as the contract the flow parses.

const LANGS = ['en', 'it'] as const
type Lang = (typeof LANGS)[number]
// Each language under its own name, whatever the panel speaks.
const LANG_NAME: Record<Lang, string> = { en: 'English', it: 'Italiano' }
// Dates and times written in the panel's language, whatever the system locale.
const LOCALE: Record<Lang, string> = { en: 'en-GB', it: 'it-IT' }
const LANG_OPTION = 'savvy-progress.language'

const STRINGS = {
  en: {
    pane: 'Agents',
    cost: 'Cost',
    tokens: 'Tokens',
    time: 'Time',
    collapse: 'Collapse',
    expand: 'Expand',
    running: 'Running',
    finished: 'Finished',
    planned: 'Planned',
    empty: 'No subagents yet.',
    round: 'round',
    failed: 'error',
    after: 'after',
    skippedOne: 'skipped',
    skipped: 'skipped',
    leftBackground: 'background work left running',
    waitingBackground: 'waiting on background work',
    countOpen: 'counter not closed',
    tokensWord: 'tokens',
    agentsCount: 'agents',
    isRunning: 'running',
    isFinished: 'finished',
    isPlanned: 'planned',
    opened: 'Agents panel opened.',
    closed: 'Agents panel closed.',
    done: 'Done',
    plan: 'Plan',
    design: 'Design',
    tasks: 'Tasks',
    review: 'Review',
    busy: 'running',
    theme: 'Theme',
    auto: 'Auto, by the calendar',
    language: 'Language',
    langAuto: 'Auto, by the settings',
    themeIs: 'Theme',
    noTheme: (name: string) => `No theme named "${name}". /savvy-theme with no name lists them.`,
    notKept: 'Not kept for the next sessions',
    ctx: 'ctx',
    clearFinished: 'Clear finished',
    planWord: 'plan',
    policy: { within: 'within', full: 'full', pace: 'pace' } as Record<BudgetPolicy, string>,
    fiveHour: '5h',
    week: '7d',
    windowReset: 'reset',
    ago: (minutes: number) => minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`,
    budget: 'Budget',
    budgetUsage: 'Usage: /savvy-budget <claude|codex|gemini|agy> <within|full|pace|once>',
    goUntil: (family: string, time: string) => `${family}: go until ${time}.`,
    decided: (family: string, until: string) => `ok: ${family} go until ${until}`,
    pacing: (family: string) => `ok: ${family} pace`,
    badPolicy: 'policy must be pace',
    agentsInfo: 'Show or hide the panel of subagents: running, finished and planned, with model, context, cost and time',
    savvyTheme: "Pick the figures' theme (a holiday, a period, a season, classic) or auto for the calendar; no name lists them",
    themeHint: '[theme|auto]',
    savvyBudget: 'Set a family budget policy: within the rolling windows, full when you accept using a reset, pace to keep working by re-tiering without asking, once for costly work until the next reset; no arguments lists policies',
    budgetHint: '[claude|codex|gemini|agy] [within|full|pace|once]',
    themeNote: (theme: string, id: string) => `savvy-progress: the theme is now ${theme} (\`${id}\`); savvy-flow's chat follows it from the next message.`,
    ignoredFlow: 'ignored: only the main session reports the flow',
    ignoredSteps: 'ignored: only subagents report steps',
    noRow: (agentId: string) => `ignored: no panel row for agent ${agentId}`,
    closeCount: (done: number, total: number) =>
      `Your step counter on the agents panel still reads ${done}/${total}. Before you stop, call mcp__savvy-progress__step once with done: ${total} and skipped set to the planned steps you left undone (leave skipped out when there are none). ` +
      'Then end with your final report again, in full and unchanged: your last message is what the orchestrator receives.',
    ignoredDecision: "ignored: only the main session records the user's decision",
    badFamily: 'family must be claude, codex, gemini or agy',
    badAnswer: "answer must quote the user's own words",
    staleAnswer: "Not recorded: those words are not a reply to this gate's refusal (the user said them earlier, or never). Ask the user now, and quote their reply.",
    badModel: 'model and effort must be strings',
    badStatus: 'codexStatus must be a safe filename stem',
    badGeminiStatus: 'geminiStatus must be a safe filename stem',
    badTier: 'tier must be fable, astra or carbon, and match the family when one is given',
    badUses: 'uses must be 1, a positive whole number or "session"',
    topDecided: (tier: string, uses: string) => `ok: ${tier} allowed for ${uses}`,
    topUsesOne: '1 launch', topUsesMany: (n: number) => `${n} launches`, topUsesSession: 'the session',
    topGate: (t: TopGateText) =>
      `Top-tier gate: savvy-${t.tier} (${t.name}) is for PLANS only (writing a plan or a design-decision document), and each ${t.action} needs the user's explicit yes, whatever the budget says. ` +
      `${t.spent ? 'The yes recorded for it is used up. ' : ''}Ask the user in chat; on their yes, record their words with the decide tool (tier ${t.key}, uses 1, or "session" if they said so for more). ` +
      `For anything that is not a plan, offer ${t.alternative} instead.`,
    planGate: (description: string, title: string) =>
      `Plan gate: '${description}' is not a task of the current plan '${title}'. Update the plan first: call progress with the new title, tasks and total (the new plan replaces the old one), then launch with description = the task's title.`,
    fitGate: (description: string, tier: string) =>
      `Fit gate: '${description}' reads as a ready procedure run through a connected tool, which is savvy-tools' work (savvy-flow, "Connected tools"), not savvy-${tier}'s. No worker was started. ` +
      `Relaunch it as savvy-tools with the same description and its recipe (tier tools in the plan); judging what it returns stays with you. ` +
      `If it needs savvy-${tier} after all (a diagnosis, a new or broken recipe, delicate code), relaunch it with a line of its own in the prompt: why-not-tools: <reason>`,
    routingCard: [
      'routing: re-tier each open task against this card before its launch, above all after a compaction or a resume.',
      '- Tools (or Codex Luna/Terra, if Codex has the tool): a ready capture, export or check run through a connected tool.',
      '- Light: mechanical edits, builds, tests. Medium: standard work in a few files.',
      '- Careful: a clear approach, delicate to carry out. Heavy: unfamiliar or messy work, an unclear cause, a new or broken recipe.',
      "- Fable: plans only, on the user's yes.",
      '- Codex, Gemini: Luna/Flash = Light, Terra/Argon = Medium, Sol/Hydrogen = Careful-Heavy; if the user asked to balance, share by headroom.',
      '- You: design, judging images, the final review.',
    ].join('\n'),
    gate: (g: GateText) =>
      `Budget gate: ${g.family} verdict ask under the within policy — ${g.facts.map(f => `${f.window} ${f.used}% → ${f.projected}% at reset ${f.resetsAt}${f.exhaustsAt ? `, runs out ${f.exhaustsAt}` : ''}`).join('; ')}. ` +
      `Ask the user before starting savvy-${g.tier}${g.share.length ? ` (a ${g.tier} run so far ≈ ${g.share.map(x => `${x.percent}% of ${x.window === 'fiveHour' ? '5h' : 'week'}`).join(', ')})` : ''}. ` +
      `On their yes, record it with the decide tool (family ${g.key}, their words), or they type /savvy-budget ${g.key} once; ` +
      `it holds until the next reset. Otherwise take a cheaper tier or the other family, or wait for the reset.`,
  },
  it: {
    pane: 'Agenti',
    cost: 'Costo',
    tokens: 'Token',
    time: 'Tempo',
    collapse: 'Comprimi',
    expand: 'Espandi',
    running: 'In corso',
    finished: 'Finiti',
    planned: 'Pianificati',
    empty: 'Ancora nessun agente.',
    round: 'giro',
    failed: 'errore',
    after: 'dopo',
    skippedOne: 'saltato',
    skipped: 'saltati',
    leftBackground: 'lavoro in background lasciato attivo',
    waitingBackground: 'in attesa del lavoro in background',
    countOpen: 'contatore non chiuso',
    tokensWord: 'token',
    agentsCount: 'agenti',
    isRunning: 'in corso',
    isFinished: 'finito',
    isPlanned: 'pianificato',
    opened: 'Pannello degli agenti aperto.',
    closed: 'Pannello degli agenti chiuso.',
    done: 'Fatto',
    plan: 'Piano',
    design: 'Design',
    tasks: 'Compiti',
    review: 'Revisione',
    busy: 'in corso',
    theme: 'Tema',
    auto: 'Automatico, secondo il calendario',
    language: 'Lingua',
    langAuto: 'Automatica, secondo le impostazioni',
    themeIs: 'Tema',
    noTheme: (name: string) => `Nessun tema chiamato "${name}". /savvy-theme senza nome li elenca.`,
    notKept: 'Non salvato per le prossime sessioni',
    ctx: 'cont',
    clearFinished: 'Svuota finiti',
    planWord: 'piano',
    policy: { within: 'entro', full: 'pieno', pace: 'ritmo' } as Record<BudgetPolicy, string>,
    fiveHour: '5h',
    week: '7g',
    windowReset: 'azzerata',
    ago: (minutes: number) => minutes < 60 ? `${minutes} min fa` : minutes < 1440 ? `${Math.floor(minutes / 60)} h fa` : `${Math.floor(minutes / 1440)} g fa`,
    budget: 'Budget',
    budgetUsage: 'Uso: /savvy-budget <claude|codex|gemini|agy> <entro|pieno|ritmo|una-volta>',
    goUntil: (family: string, time: string) => `${family}: via libera fino a ${time}.`,
    decided: (family: string, until: string) => `ok: ${family} via libera fino a ${until}`,
    pacing: (family: string) => `ok: ${family} ritmo`,
    badPolicy: 'policy deve essere pace',
    agentsInfo: 'Mostra o nasconde il pannello dei sottoagenti: in corso, finiti e pianificati, con modello, contesto, costo e tempo',
    savvyTheme: 'Sceglie il tema delle figure (una festa, un periodo, una stagione, classico) o auto per il calendario; senza nome li elenca',
    themeHint: '[tema|auto]',
    savvyBudget: 'Imposta il budget di una famiglia: entro le finestre, pieno se accetti di usare un azzeramento, una-volta per il lavoro costoso fino al prossimo azzeramento; senza argomenti li elenca',
    budgetHint: '[claude|codex|gemini|agy] [entro|pieno|una-volta]',
    themeNote: (theme: string, id: string) => `savvy-progress: il tema ora è ${theme} (\`${id}\`); la chat di savvy-flow lo segue dal prossimo messaggio.`,
    ignoredFlow: 'ignorato: solo la sessione principale riporta il flusso',
    ignoredSteps: 'ignorato: solo i sottoagenti riportano i passi',
    noRow: (agentId: string) => `ignorato: nessuna riga del pannello per l'agente ${agentId}`,
    closeCount: (done: number, total: number) =>
      `Il tuo contatore dei passi nel pannello agenti segna ancora ${done}/${total}. Prima di fermarti, chiama una volta mcp__savvy-progress__step con done: ${total} e skipped uguale ai passi pianificati che non hai fatto (omettilo se non ce ne sono). ` +
      "Poi chiudi ripetendo il tuo resoconto finale, completo e invariato: l'orchestratore riceve il tuo ultimo messaggio.",
    ignoredDecision: "ignorato: solo la sessione principale registra la decisione dell'utente",
    badFamily: 'family deve essere claude, codex, gemini o agy',
    badAnswer: "answer deve riportare le parole dell'utente",
    staleAnswer: "Non registrato: quelle parole non sono una risposta al blocco appena avvenuto (l'utente le ha dette prima, o mai). Chiedi ora all'utente, e riporta la sua risposta.",
    badModel: 'model ed effort devono essere stringhe',
    badStatus: 'codexStatus deve essere un nome di file sicuro',
    badGeminiStatus: 'geminiStatus deve essere un nome di file sicuro',
    badTier: 'tier deve essere fable, astra o carbon, coerente con la famiglia se indicata',
    badUses: 'uses deve essere 1, un intero positivo o "session"',
    topDecided: (tier: string, uses: string) => `ok: ${tier} consentito per ${uses}`,
    topUsesOne: '1 avvio', topUsesMany: (n: number) => `${n} avvii`, topUsesSession: 'la sessione',
    topGate: (t: TopGateText) =>
      `Blocco del livello massimo: savvy-${t.tier} (${t.name}) è solo per i PIANI (scrivere un piano o un documento di decisioni di progetto), e ogni ${t.action} vuole il sì esplicito dell'utente, qualunque cosa dica il budget. ` +
      `${t.spent ? 'Il sì registrato per lui è esaurito. ' : ''}Chiedi all'utente in chat; se dice sì, registra le sue parole con lo strumento decide (tier ${t.key}, uses 1, o "session" se ne ha autorizzati di più). ` +
      `Per tutto ciò che non è un piano, proponi ${t.alternative}.`,
    planGate: (description: string, title: string) =>
      `Blocco del piano: '${description}' non è un compito del piano attuale '${title}'. Aggiorna prima il piano: chiama progress con il nuovo titolo, i compiti e il totale (il nuovo piano sostituisce il vecchio), poi avvia con description = il titolo del compito.`,
    fitGate: (description: string, tier: string) =>
      `Blocco di idoneità: '${description}' è una procedura pronta da eseguire con uno strumento collegato, lavoro di savvy-tools (savvy-flow, "Connected tools"), non di savvy-${tier}. Nessun worker avviato. ` +
      `Rilancialo come savvy-tools con la stessa description e la sua ricetta (tier tools nel piano); giudicare ciò che riporta resta a te. ` +
      `Se serve davvero savvy-${tier} (una diagnosi, una ricetta nuova o rotta, codice delicato), rilancialo con una riga a sé nel prompt: why-not-tools: <motivo>`,
    routingCard: [
      'instradamento: prima di ogni avvio rivedi con questa scheda il livello del compito, soprattutto dopo una compattazione o una ripresa.',
      '- Tools (o Codex Luna/Terra, se Codex ha lo strumento): una cattura, un export o un controllo pronti, con uno strumento collegato.',
      '- Light: modifiche meccaniche, build, test. Medium: lavoro ordinario in pochi file.',
      '- Careful: approccio chiaro, esecuzione delicata. Heavy: lavoro sconosciuto o confuso, causa non chiara, ricetta nuova o rotta.',
      "- Fable: solo piani, col sì dell'utente.",
      "- Codex, Gemini: Luna/Flash = Light, Terra/Argon = Medium, Sol/Hydrogen = Careful-Heavy; in equilibrio: per margine.",
      '- Tu: il design, il giudizio sulle immagini, la revisione finale.',
    ].join('\n'),
    gate: (g: GateText) =>
      `Blocco del budget: ${g.family} chiede una decisione con la politica entro — ${g.facts.map(f => `${f.window === '5h' ? '5h' : 'settimana'} ${f.used}% → ${f.projected}% all'azzeramento ${f.resetsAt}${f.exhaustsAt ? `, si esaurisce ${f.exhaustsAt}` : ''}`).join('; ')}. ` +
      `Chiedi all'utente prima di avviare savvy-${g.tier}${g.share.length ? ` (finora un'esecuzione ${g.tier} ≈ ${g.share.map(x => `${x.percent}% di ${x.window === 'fiveHour' ? '5h' : 'settimana'}`).join(', ')})` : ''}. ` +
      `Se dice sì, registralo con lo strumento decide (famiglia ${g.key}, con le sue parole), oppure scrive /savvy-budget ${g.key} una-volta; ` +
      `vale fino al prossimo azzeramento. Altrimenti usa un livello più economico o l'altra famiglia, o attendi l'azzeramento.`,
  },
} as const

// What the gate's refusal says, before it is put in words.
type TopGateText = { tier: string; key: string; name: string; action: string; spent: boolean; alternative: string }
type GateText = {
  family: string
  key: PlanFamily
  tier: string
  facts: { window: string; used: number; projected: number; resetsAt: string; exhaustsAt: string | null }[]
  share: { window: PlanWindowKey; percent: number }[]
}

// Module scope is fine here: session.start sets it again on every (re)load.
let lang: Lang = 'en'
const tr = () => STRINGS[lang]
// The option as last set or picked: `auto` or a language. Module scope as above.
let langOption = 'auto'

const isLang = (v: unknown): v is Lang => LANGS.some(l => l === v)

const isItalian = (v: unknown): boolean => typeof v === 'string' && /^(it\b|it[_-]|italian|italiano)/i.test(v.trim())

async function detectLang($: EngineInterface, option: unknown): Promise<Lang> {
  if (isLang(option)) return option
  try {
    const settings = (await $.settings.read()) as Record<string, unknown>
    if (typeof settings.language === 'string' && settings.language.trim()) return isItalian(settings.language) ? 'it' : 'en'
  } catch {
    // No settings: fall through to the locale.
  }
  const locale = (await $.env.get('LC_ALL')) || (await $.env.get('LC_MESSAGES')) || (await $.env.get('LANG'))
  return isItalian(locale) ? 'it' : 'en'
}

// ---------------------------------------------------------------------------
// Theme: the `theme` option, or the calendar's (`themes.ts`). The option is
// picked in `/config`, with `/savvy-theme` or in the panel's picker; its value
// lives in the `theme` atom too, so a pick redraws the bar and the panel at once.

const OPTION = 'savvy-progress.theme'

// Module scope is fine here: every drawing sets it from the atom first.
let theme: Theme = 'classic'

async function applyTheme($: EngineInterface): Promise<void> {
  theme = themeOf(await read($, picked), await $.clock.now())
}

// The command's names: a theme's own, `auto`, or its Italian name (the calendar's
// holidays are Italian), with any case, spaces or accents.
const ALIASES: Record<string, string> = {
  classico: 'classic',
  capodanno: 'new-year',
  epifania: 'befana',
  'saldi-invernali': 'winter-sales',
  'san-valentino': 'valentine',
  carnevale: 'carnival',
  'festa-della-donna': 'womens-day',
  'festa-del-papa': 'fathers-day',
  'vacanze-pasquali': 'easter-holidays',
  pasqua: 'easter',
  pasquetta: 'easter',
  liberazione: 'liberation',
  'festa-dei-lavoratori': 'labour-day',
  'primo-maggio': 'labour-day',
  'festa-della-mamma': 'mothers-day',
  'festa-della-repubblica': 'republic-day',
  'vacanze-estive': 'summer-holidays',
  'saldi-estivi': 'summer-sales',
  'rientro-a-scuola': 'back-to-school',
  ognissanti: 'all-saints',
  defunti: 'all-souls',
  'commemorazione-dei-defunti': 'all-souls',
  immacolata: 'immaculate',
  'periodo-natalizio': 'christmas',
  vigilia: 'christmas-eve',
  'vigilia-di-natale': 'christmas-eve',
  natale: 'christmas-day',
  'santo-stefano': 'st-stephen',
  'san-silvestro': 'new-years-eve',
  primavera: 'spring',
  estate: 'summer',
  autunno: 'autumn',
  inverno: 'winter',
}

export const themeNamed = (name: string): string | undefined => {
  const key = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f']/g, '')
    .replace(/[\s_]+/g, '-')
  if (key === 'auto') return 'auto'
  return THEMES.find(t => t === key) ?? ALIASES[key]
}

// A theme as the picker and `/savvy-theme` name it, in the panel's language.
const themeLabel = (t: Theme): string => (lang === 'it' ? THEME_LABEL_IT[t] : THEME_LABEL[t])

const describeTheme = (value: string, ms: number, labelOf: (t: Theme) => string = themeLabel): string =>
  value === 'auto' ? `auto (${labelOf(themeOn(ms))})` : labelOf(themeOf(value, ms))

// A language picked in the panel: it speaks it from the next drawing, and the option
// keeps it across sessions (its change reloads the plugin, which reads it again).
async function pickLanguage($: EngineInterface, value: string): Promise<void> {
  langOption = value === 'auto' || isLang(value) ? value : 'auto'
  lang = await detectLang($, langOption)
  $.ui.invalidate('ui.render')
}

async function saveLanguage($: EngineInterface, value: string): Promise<void> {
  // Not kept: the pick still holds until the next load.
  await $.config.set({ key: LANG_OPTION, value }).catch(() => undefined)
}

// One pick, from wherever it came: the atom redraws the bar and the panel; the
// option keeps it across sessions (savvy-flow's chat reads it there). A pick
// the model did not see happen (the picker, `/config`) is told to it in one line.
async function pickTheme($: EngineInterface, value: string, isSeen: boolean): Promise<void> {
  await update($, picked, () => value)
  // The atom's readers redraw on the write; the bar and the panel also read the
  // calendar, so ask for both again rather than lean on what they read.
  $.ui.invalidate('ui.render')
  if (isSeen) return
  // Told to the model in the panel's language, with the theme named as that language names it.
  const text = tr().themeNote(describeTheme(value, await $.clock.now()), value)
  await $.session.append({ message: { type: 'user', content: [{ type: 'text', text }] } }).catch(() => undefined)
}

// True while this plugin saves its own pick, which its `config.set` hook leaves alone.
let isSaving = false

async function saveTheme($: EngineInterface, value: string): Promise<string | undefined> {
  isSaving = true
  try {
    const { deny } = await $.config.set({ key: OPTION, value })
    return deny
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  } finally {
    isSaving = false
  }
}

// The agents panel draws `shown`, a copy of the live values the tick refreshes once
// a second, never the live values themselves: every redraw sent the theme picker's
// open list back to where it started, so while the picker has the focus the copy
// waits, and nothing the panel reads changes.
// The hold lasts as long as the focus, which stays on the picker however often its
// list is opened again, and is gone only when the focus moves on (Esc, a click
// elsewhere): PICK_HOLD_MS only guards against a focus that never comes back. It
// lives in `picking`, which no drawing reads, so writing it redraws nothing, and
// it outlives the reload a pick causes (the option's change restarts the plugin).
const PICK_HOLD_MS = 5 * 60_000

async function showPanel($: EngineInterface, isForced = false): Promise<void> {
  const since = await read($, picking)
  if (!isForced && since && (await $.clock.now()) - since < PICK_HOLD_MS) return
  const { cacheReadAt: _, statusMtimes: __, claudeCacheReadAt: ___, geminiCacheReadAt: _g, geminiStatusMtimes: _gm, geminiProbeAt: _gp, geminiProbeFailedAt: _gf, ...usage } = await read($, usageReadings)
  const view = { flow: await read($, flow), agents: await read($, agents), now: hasPlans(usage) ? await $.clock.now() : await read($, now), models: shownModels(await read($, models)), usage }
  const last = await read($, shown)
  if (JSON.stringify(last) !== JSON.stringify(view)) await update($, shown, () => view)
}

const dressOf = (): Dress | undefined => (theme === 'classic' ? undefined : DRESSES[theme])

const accent = (): string => dressOf()?.accent ?? ACCENT

const blank = (): Flow => ({
  title: 'savvy-flow',
  total: 0,
  done: 0,
  running: 0,
  phase: 'plan',
  isFinished: false,
  tasks: [],
})

const isNewFlow = (prev: Flow | null, input: ProgressInput): boolean =>
  !prev || prev.isFinished || (input.title !== undefined && input.title.trim() !== prev.title)

const oneOf = (allowed: readonly string[], value: unknown): string | undefined => {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return allowed.includes(v) ? v : undefined
}

const cleanTasks = (tasks: ProgressInput['tasks']): PlannedTask[] | undefined =>
  tasks
    ?.filter(t => t.title?.trim())
    .map(t => {
      const effort = oneOf(EFFORTS, t.effort)
      const model = oneOf(MODELS, t.model)
      const agent = typeof t.agent === 'string' ? t.agent.trim() : ''
      return {
        title: (t.title ?? '').trim(),
        tier: (t.tier ?? '').replace(/^savvy-/, '').trim().toLowerCase(),
        after: (t.after ?? []).filter(n => Number.isInteger(n) && n > 0),
        // A task that declares none keeps the shape it always had.
        ...(effort ? { effort } : {}),
        ...(model ? { model } : {}),
        ...(agent ? { agent } : {}),
      }
    })

const merge = (prev: Flow | null, input: ProgressInput): Flow => {
  // A new title means a new flow: never carry counters over from an earlier one.
  const base = isNewFlow(prev, input) || !prev ? blank() : { ...blank(), ...prev }
  const tasks = cleanTasks(input.tasks) ?? base.tasks
  const total = Math.max(0, Math.round(input.total ?? (input.tasks ? tasks.length : base.total)))
  const done = Math.min(total || Infinity, Math.max(0, Math.round(input.done ?? base.done)))
  const phase = input.phase && PHASES.includes(input.phase) ? input.phase : base.phase
  return {
    ...base,
    title: input.title?.trim() || base.title,
    total,
    done,
    phase: input.finished ? 'close' : phase,
    isFinished: input.finished === true,
    tasks,
  }
}

// The bar says what the agents panel says: `active` is every run the panel lists
// as running, of any type (a reviewer, a verifier, Explore), not only the plan's
// workers that `f.running` counts for the faint layer. The accepted tasks stay
// `done/total`, the orchestrator's own count; what runs is told beside them.
const runningOf = (list: AgentRun[]): number => list.filter(a => a.status === 'running').length

const label = (f: Flow, active = 0): string => {
  const s = tr()
  if (f.isFinished) return s.done
  if (f.phase === 'plan') return s.plan
  if (f.phase === 'design') return s.design
  const busy = Math.max(active, f.running)
  const count = f.total ? `${f.done}/${f.total}${busy ? ` · ${busy} ${s.busy}` : ''}` : `${busy} ${s.busy}`
  return `${f.phase === 'review' ? s.review : s.tasks} ${count}`
}

// Every task accepted is 100% only once nothing runs: a review still under way
// keeps the bar, and its percent, short of the end.
const RUNNING_CAP = 0.99

const ratio = (f: Flow, active = 0): number => {
  if (f.isFinished) return 1
  const accepted = f.total ? f.done / f.total : 0
  return Math.max(active, f.running) ? Math.min(accepted, RUNNING_CAP) : accepted
}

// Deterministic noise so the dither does not shimmer between redraws.
const noise = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// The whole row is one SVG: the desktop wraps sibling elements onto new lines,
// so title, bar, percent and the crab live in one drawing; only the count and
// the dismiss are Buttons beside it.
const H = 22
const BAR_H = 16
const CRAB_W = 26
const CELL = 3
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

const clip = (s: string, max: number): string => (s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s)

// Rough advance of system UI text, in em; good enough to size the title's slot.
const charEm = (ch: string): number =>
  /[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-ZА-ЯЁmwшщжюМШЩЖЮ@%]/.test(ch) ? 0.72 : 0.56

export const textWidth = (s: string, size: number): number => [...s].reduce((w, ch) => w + charEm(ch) * size, 0)

// Cuts `s` to fit `maxW` pixels, with an ellipsis when it had to cut.
const fitText = (s: string, size: number, maxW: number): string => {
  if (textWidth(s, size) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (textWidth(out + ch + '…', size) > maxW) break
    out += ch
  }
  return out + '…'
}

const rowSvg = (f: Flow, W: number, active: number): string => {
  // The title takes what it needs, up to 40% of the row; the bar takes the rest.
  const title = fitText(f.title, 13, Math.max(60, W * 0.4))
  const BAR_X = Math.round(16 + textWidth(title, 13) + 12)
  const BAR_W = Math.max(60, W - BAR_X - 46 - CRAB_W)
  const color = f.isFinished ? DONE : accent()
  const sparkle = f.isFinished ? undefined : dressOf()?.sparkle
  const y0 = (H - BAR_H) / 2
  const fillW = Math.round(BAR_W * ratio(f, active))
  const runW = f.total ? Math.round((BAR_W * Math.min(f.total, f.done + f.running)) / f.total) : 0
  const dots: string[] = []

  // Dithered fill: sparse at the start, dense toward the head.
  const cols = Math.floor(fillW / CELL)
  const rows = Math.floor(BAR_H / CELL)
  for (let c = 0; c < cols; c++) {
    const density = 0.35 + 0.6 * Math.pow(c / Math.max(1, cols), 1.2)
    for (let r = 0; r < rows; r++) {
      if (noise(c, r) < density) dots.push(`<rect class="t${Math.floor(noise(r, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="2" height="2"/>`)
    }
  }
  // Handed to workers, not yet accepted: a faint second layer.
  const faint: string[] = []
  for (let c = cols; c < Math.floor(runW / CELL); c++) {
    for (let r = 0; r < rows; r++) {
      if (noise(c + 7, r + 3) < 0.2) faint.push(`<rect class="t${Math.floor(noise(r + 5, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="1.7" height="1.7"/>`)
    }
  }

  const ticks: string[] = []
  for (let i = 1; i < f.total; i++) {
    const x = Math.round((BAR_W * i) / f.total)
    if (x > fillW + 4) ticks.push(`<rect x="${x}" y="${BAR_H / 2 - 4}" width="1.5" height="8" rx="0.75"/>`)
  }

  const text = label(f, active)
  const pillW = Math.round(18 + text.length * 6.6)
  const pillX = Math.max(0, Math.min(BAR_W - pillW, fillW - pillW))
  const percent = `${Math.round(ratio(f, active) * 100)}%`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
.t{fill:#1f1f1f}.m{fill:#8a8a8a}.k{fill:#e4e4e2}.tk{fill:#b4b4b0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.m{fill:#9a9a9a}.k{fill:#2c2c2c}.tk{fill:#5a5a5a}}
/* Pixels twinkle in four out-of-phase groups; a finished bar settles to a slow glow. */
.t0,.t1,.t2,.t3{animation:tw ${f.isFinished ? 3.2 : 2.2}s ease-in-out infinite}
.t1{animation-duration:${f.isFinished ? 3.8 : 2.8}s;animation-delay:-.7s}.t2{animation-duration:${f.isFinished ? 4.4 : 1.9}s;animation-delay:-1.3s}.t3{animation-duration:${f.isFinished ? 3.5 : 3.3}s;animation-delay:-.4s}
@keyframes tw{0%,100%{opacity:1}50%{opacity:${f.isFinished ? 0.8 : 0.3}}}
@media (prefers-reduced-motion: reduce){.t0,.t1,.t2,.t3{animation:none}}
${sparkle ? `.dusk .t1{fill:${sparkle[0]}}.dusk .t3{fill:${sparkle[1]}}` : ''}
</style>
<defs><clipPath id="c"><rect x="0" y="0" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath></defs>
<circle cx="5" cy="${H / 2}" r="4" fill="${color}"/>
<text class="t" x="16" y="${H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="500">${xml(title)}</text>
<g transform="translate(${BAR_X},${y0})">
<rect class="k" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/>
<g clip-path="url(#c)">
<g fill="${color}"${sparkle ? ' class="dusk"' : ''}>${dots.join('')}</g>
<g fill="${color}" opacity="0.45">${faint.join('')}</g>
<g class="tk">${ticks.join('')}</g>
</g>
<rect x="${pillX}" width="${pillW}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${color}"/>
<text x="${pillX + pillW / 2}" y="${BAR_H / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" fill="#ffffff">${xml(text)}</text>
</g>
<text class="m" x="${W - CRAB_W - 6}" y="${H / 2 + 4.5}" text-anchor="end" font-family="${FONT}" font-size="12.5" font-variant-numeric="tabular-nums">${percent}</text>
${crabCss()}${crab(W - CRAB_W + 1, 0, 'other', false, active > 0, 0.8)}
</svg>`
}

const barText = (f: Flow, width: number, active: number): string => {
  const filled = Math.round(width * ratio(f, active))
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

// ---------------------------------------------------------------------------
// Agents panel: every subagent of the session, plus the tasks the flow planned.

const TIER_COLOR: Record<string, string> = {
  fable: '#7F77DD',
  heavy: '#D85A30',
  careful: '#BA7517',
  medium: '#378ADD',
  light: '#1D9E75',
  tools: '#C46686',
  // The Codex relays, one per intensity: moon, earth, sun, star.
  'codex-luna': '#8FA3BF',
  'codex-terra': '#6E9B4A',
  'codex-sol': '#E0A526',
  'codex-astra': '#9B7BE0',
  // The Gemini relays, one per intensity: bolt, bulb, sign, drop, gem.
  'gemini-flash': '#D4B21C',
  'gemini-argon': '#D2559A',
  'gemini-neon': '#F2542D',
  'gemini-hydrogen': '#2BA6C6',
  'gemini-carbon': '#3F51B5',
  // The Antigravity relays for its Claude and GPT models, on that quota of its own.
  'agy-opus': '#B5651D',
  'agy-sonnet': '#C98B5A',
  'agy-gpt': '#5E8C7B',
  other: '#888780',
}

// What each savvy tier runs on, for planned tasks that have no run yet.
const colorOf = (tier: string): string => TIER_COLOR[tier] ?? '#888780'

const TIER_MODEL: Record<string, string> = {
  fable: 'Fable · high',
  heavy: 'Opus · xhigh',
  careful: 'Opus · high',
  medium: 'Sonnet · medium',
  light: 'Sonnet · low',
  tools: 'Sonnet · medium',
  'codex-luna': 'Codex · Luna',
  'codex-terra': 'Codex · Terra',
  'codex-sol': 'Codex · Sol',
  'codex-astra': 'Codex · Astra',
  'gemini-flash': 'Gemini · Flash',
  'gemini-argon': 'Gemini · Argon',
  'gemini-neon': 'Gemini · Neon',
  'gemini-hydrogen': 'Gemini · Hydrogen',
  'gemini-carbon': 'Gemini · Carbon',
  'agy-opus': 'Agy · Opus',
  'agy-sonnet': 'Agy · Sonnet',
  'agy-gpt': 'Agy · GPT-OSS',
}

// A Claude tier with no costume of its own wears that of the tier on its model and effort, in its own color.
const CLAUDE_WEARS: Record<string, string> = { tools: 'medium' }

// A Codex figure wears the costume of a Claude tier, on its own body, with its badge.
const CODEX_WEARS: Record<string, string> = {
  'codex-astra': 'fable',
  'codex-sol': 'careful',
  'codex-terra': 'medium',
  'codex-luna': 'light',
}

const CODEX_EFFORT: Record<string, string> = { luna: 'low', terra: 'medium', sol: 'high', astra: 'high' }

export const codexModelName = (slug: string): string => {
  const m = /^gpt-(\d+(?:\.\d+)*?)-(luna|terra|sol|astra)$/.exec(slug)
  return m?.[2] ? `${m[2].charAt(0).toUpperCase()}${m[2].slice(1)} ${m[1]}` : slug
}

// A Gemini figure, likewise, wears the costume of the Claude tier its intensity matches.
const GEMINI_WEARS: Record<string, string> = {
  'gemini-carbon': 'fable',
  'gemini-hydrogen': 'careful',
  'gemini-neon': 'careful',
  'gemini-argon': 'medium',
  'gemini-flash': 'light',
}

// An Antigravity Claude or GPT figure wears the costume of the Claude tier its model and effort match, on the crab.
const AGY_WEARS: Record<string, string> = {
  'agy-opus': 'careful',
  'agy-sonnet': 'medium',
  'agy-gpt': 'light',
}
const AGY_EFFORT: Record<string, string> = { opus: 'high', sonnet: 'medium', gpt: 'medium' }
const AGY_LABEL: Record<string, string> = { opus: 'Opus', sonnet: 'Sonnet', gpt: 'GPT-OSS' }
// Every relay that runs `agy -p` and writes ~/.gemini/savvy-status: its row's state, tokens and model come from there.
const AGY_RELAYS: Record<string, string> = { ...GEMINI_WEARS, ...AGY_WEARS }

// What each Gemini relay passes to `agy --effort`.
const GEMINI_EFFORT: Record<string, string> = { flash: 'low', argon: 'medium', neon: 'medium', hydrogen: 'high', carbon: 'high' }

// `gemini-4-argon` → `Argon 4`, `gemini-3.8-flash` → `Flash 3.8`; any other slug as given.
export const geminiModelName = (slug: string): string => {
  const m = /^gemini-(\d+(?:\.\d+)*?)-(flash|argon|neon|hydrogen|carbon)$/.exec(slug)
  return m?.[2] ? `${m[2].charAt(0).toUpperCase()}${m[2].slice(1)} ${m[1]}` : slug
}

// The Claude tier whose costume a tier's figure wears (one of CLAUDE_WEARS, or a relay of either family), or undefined.
const wornBy = (tier: string): string | undefined => CLAUDE_WEARS[tier] ?? CODEX_WEARS[tier] ?? GEMINI_WEARS[tier] ?? AGY_WEARS[tier]

// Same rule as the relays: the lowest priority among visible models of the family.
export const codexModelsFrom = (cache: unknown): Record<string, string> => {
  const entries = (cache as { models?: unknown } | null)?.models
  if (!Array.isArray(entries)) return {}
  const best: Record<string, { slug: string; priority: number }> = {}
  for (const entry of entries) {
    if (!entry || typeof entry.slug !== 'string' || entry.visibility !== 'list' || typeof entry.priority !== 'number') continue
    const family = Object.keys(CODEX_EFFORT).find(f => entry.slug.endsWith(`-${f}`))
    if (family && (!best[family] || entry.priority < best[family].priority)) best[family] = entry
  }
  return Object.fromEntries(Object.entries(best).map(([family, entry]) => [family, entry.slug]))
}

// The hints as the panel draws them: when the cache was last read is no change to show, so it stays out of the copy
// and a re-read that finds the same models redraws nothing.
const shownModels = ({ cacheReadAt: _, ...hints }: ModelHints): ModelHints => hints

const codexModel = (tier: string, hints: ModelHints, declared?: string, effort?: string, withEffort = true): string => {
  const family = tier.replace(/^codex-/, '')
  const slug = declared || hints.codex[family]
  // With no cache and no declaration, keep today's bare intensity label.
  const label = slug ? codexModelName(slug) : family.charAt(0).toUpperCase() + family.slice(1)
  return `${label}${withEffort && (slug || effort) ? ` · ${effort || CODEX_EFFORT[family]}` : ''}`
}

// Gemini has no models cache to predict from: a run names its declared slug, else the bare intensity.
const geminiModel = (tier: string, declared?: string, effort?: string, withEffort = true): string => {
  const family = tier.replace(/^gemini-/, '')
  const label = declared ? geminiModelName(declared) : family.charAt(0).toUpperCase() + family.slice(1)
  return `${label}${withEffort && (declared || effort) ? ` · ${effort || GEMINI_EFFORT[family]}` : ''}`
}

// An Antigravity Claude or GPT relay names its declared model (`claude-opus-5-5` → `Opus 5.5`), else its bare model.
const agyModel = (tier: string, declared?: string, effort?: string, withEffort = true): string => {
  const family = tier.replace(/^agy-/, '')
  const gpt = declared ? /^gpt-oss-(\d+)b$/i.exec(declared) : null
  const label = gpt ? `GPT-OSS ${gpt[1]}B` : declared ? modelName(declared) : AGY_LABEL[family] ?? family
  return `${label}${withEffort && (declared || effort) ? ` · ${effort || AGY_EFFORT[family]}` : ''}`
}
const relayModel = (tier: string, declared?: string, effort?: string, withEffort = true): string =>
  tier in AGY_WEARS ? agyModel(tier, declared, effort, withEffort) : geminiModel(tier, declared, effort, withEffort)

// Cache attempts, including failures, are limited across ticks and module reloads.
async function refreshCodexModels($: EngineInterface): Promise<void> {
  const at = await $.clock.now()
  const hints = await read($, models)
  if (hints.cacheReadAt !== undefined && at - hints.cacheReadAt < 60_000) return
  await update($, models, prev => ({ ...prev, cacheReadAt: at }))
  let codex: Record<string, string> = {}
  try {
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'))
    if (home) codex = codexModelsFrom(JSON.parse(await $.fs.read(`${home.replace(/[\\/]+$/, '')}/.codex/models_cache.json`)))
  } catch {
    // An absent, unreadable or invalid cache leaves the bare intensity label.
  }
  await update($, models, prev => ({ ...prev, codex }))
}

// USD per million tokens: input, output, cache read, cache write (5-minute TTL).
// The engine reports tokens, not money, so the panel's cost is an estimate.
const PRICES: [RegExp, [number, number, number, number]][] = [
  [/fable|mythos/, [10, 50, 0.25, 12.5]],
  [/opus-5-5/, [4, 20, 0.2, 5]],
  [/opus/, [5, 25, 0.5, 6.25]],
  [/sonnet/, [2, 10, 0.2, 2.5]],
  [/haiku-5-5/, [0.1, 0.5, 0.01, 0.125]],
  [/haiku/, [1, 5, 0.1, 1.25]],
]

// USD per million: input, output, cached input. Standard short-context estimates,
// verified 2026-11-12 against https://developers.openai.com/api/docs/models and
// https://developers.openai.com/api/docs/pricing (current family versions).
// Older/future versions use their family's current rates; unknown families have no price.
const GPT_PRICES: Record<string, [number, number, number]> = {
  luna: [0.1, 0.5, 0.01],
  terra: [1, 5, 0.05],
  sol: [2, 10, 0.1],
  astra: [10, 50, 1],
}

export const codexCostOf = (model: string, u: CodexTokens): number | undefined => {
  const price = GPT_PRICES[model.toLowerCase().split('-').pop() ?? '']
  if (!price) return undefined
  const [i, o, r] = price
  // Cached input is part of input; reasoning is already part of output.
  return ((u.input_tokens - u.cached_input_tokens) * i + u.cached_input_tokens * r + u.output_tokens * o) / 1e6
}

const nonnegative = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0

// The providers' rolling window lengths determine the start from the reset.
const PLAN_WINDOW_MINUTES: Readonly<Record<PlanWindowKey, number>> = { fiveHour: 300, week: 10080 }
const MINUTE_MS = 60_000
// Recent slopes smooth the short window over 30 minutes and the week over a whole day: people sleep, so a slope
// of working hours alone, run on through the nights to the weekly reset, projected a busy session at many times the limit.
const RECENT_SPAN_MS: Readonly<Record<PlanWindowKey, number>> = { fiveHour: 30 * MINUTE_MS, week: 24 * 60 * MINUTE_MS }
// Half a span is enough evidence for the short window; the week's slope needs nearly the whole day.
const RECENT_MIN_COVERAGE: Readonly<Record<PlanWindowKey, number>> = { fiveHour: 0.5, week: 0.9 }
const PROJECTION_MIN_ELAPSED_MS = 5 * MINUTE_MS
// The average pace never divides by less than an hour (short window) or a day (week): a window minutes old,
// as Gemini's are when its windows start at first use, projected 3% of a week at 50 times the limit.
const PROJECTION_FLOOR_MS: Readonly<Record<PlanWindowKey, number>> = { fiveHour: 60 * MINUTE_MS, week: 24 * 60 * MINUTE_MS }
// One sample per minute for the short window, one per five minutes for the week: at most 31 and 289 samples.
const HISTORY_BUCKET_MS: Readonly<Record<PlanWindowKey, number>> = { fiveHour: MINUTE_MS, week: 5 * MINUTE_MS }
const historyMaxSamples = (key: PlanWindowKey): number => RECENT_SPAN_MS[key] / HISTORY_BUCKET_MS[key] + 1
// A reading older than this says what the provider said then, not now: it can be wrong both ways (other
// processes spent more, or the provider reset the window early), so it shows its age and decides no verdict.
export const READING_STALE_MS = 30 * MINUTE_MS
const PLAN_WINDOWS: readonly PlanWindowKey[] = ['fiveHour', 'week']
const PLAN_FAMILIES: readonly PlanFamily[] = ['claude', 'codex', 'gemini', 'agy']
const BUDGET_RED = '#D0453F'
const BUDGET_AMBER = '#E0A526'
const PLAN_TEXT_SIZE = 11
// Same nine-pixel inset as the existing plan tiles, on both sides.
const PLAN_TEXT_INSET = 9

// A family the user never set is on pace; within is what a user stores to be asked.
const DEFAULT_POLICY: BudgetPolicy = 'pace'
const budgetPolicy = (usage: UsageReadings, family: PlanFamily): BudgetPolicy => usage.policies?.[family] ?? DEFAULT_POLICY

const recordWindow = (previous: WindowHistory | undefined, value: PlanWindow, key: PlanWindowKey, at: number, spentUsd?: number): WindowHistory => {
  const last = previous?.samples.at(-1)
  const reset = previous?.resetsAt !== value.resetsAt || Boolean(last && value.percentUsed < last.percentUsed)
  const samples = (reset ? [] : previous?.samples ?? []).filter(sample => sample.at >= at - RECENT_SPAN_MS[key] && sample.at <= at)
  const sample = { at, percentUsed: value.percentUsed, ...(nonnegative(spentUsd) ? { spentUsd } : {}) }
  const bucket = HISTORY_BUCKET_MS[key]
  const sameBucket = samples.length && Math.floor(samples[samples.length - 1]!.at / bucket) === Math.floor(at / bucket)
  return { resetsAt: value.resetsAt, samples: [...(sameBucket ? samples.slice(0, -1) : samples), sample].slice(-historyMaxSamples(key)) }
}

const READ_AT: Readonly<Record<PlanFamily, 'claudeReadAt' | 'codexReadAt' | 'geminiReadAt' | 'agyReadAt'>> = {
  claude: 'claudeReadAt', codex: 'codexReadAt', gemini: 'geminiReadAt', agy: 'agyReadAt',
}

// Pure: all histories live in the existing usage atom, never module-level mutable state.
export const recordPlanUsage = (usage: UsageReadings, family: PlanFamily, plan: PlanUsage, at: number): UsageReadings => {
  const history: PlanHistory = {}
  for (const key of PLAN_WINDOWS) {
    const value = plan[key]
    if (value) history[key] = recordWindow(usage.history?.[family]?.[key], value, key, at, usage.spentUsd?.[family])
  }
  return { ...usage, [family]: plan, [READ_AT[family]]: at,
    history: { ...usage.history, [family]: history } }
}

const recentPace = (history: WindowHistory | undefined, value: PlanWindow, key: PlanWindowKey, at: number): number | undefined => {
  if (history?.resetsAt !== value.resetsAt) return undefined
  const samples = history?.samples.filter(sample => sample.at >= at - RECENT_SPAN_MS[key] && sample.at <= at) ?? []
  const first = samples[0], last = samples.at(-1)
  if (!first || !last || last.at - first.at < RECENT_SPAN_MS[key] * RECENT_MIN_COVERAGE[key]) return undefined
  const slope = (last.percentUsed - first.percentUsed) / (last.at - first.at)
  return nonnegative(slope) ? slope : undefined
}

export const projectPlanWindow = (value: PlanWindow | undefined, key: PlanWindowKey, at: number, history?: WindowHistory): PlanProjection | undefined => {
  if (!value || !nonnegative(value.percentUsed) || value.percentUsed === 0 || !value.resetsAt) return undefined
  const resetAt = Date.parse(value.resetsAt)
  const elapsed = at - (resetAt - PLAN_WINDOW_MINUTES[key] * MINUTE_MS)
  if (!Number.isFinite(resetAt) || !Number.isFinite(at) || resetAt <= at || elapsed < PROJECTION_MIN_ELAPSED_MS) return undefined
  const recent = recentPace(history, value, key, at)
  const rate = recent ?? value.percentUsed / Math.max(elapsed, PROJECTION_FLOOR_MS[key])
  const projectedAtReset = value.percentUsed + rate * (resetAt - at)
  const fits = projectedAtReset <= 100
  // A window already exhausted reports now, including a recent plateau above 100%.
  const exhaustAt = value.percentUsed >= 100 ? at : rate > 0 ? at + (100 - value.percentUsed) / rate : undefined
  return { projectedAtReset, ...(exhaustAt !== undefined && exhaustAt < resetAt ? { exhaustsAt: new Date(exhaustAt).toISOString() } : {}),
    pace: recent === undefined ? 'average' : 'recent', fits }
}

// Under pace the orchestrator re-tiers by itself: over 100% it cuts, a week under 90% near its reset has room.
const PACE_SPEND_BELOW = 90
const PACE_SPEND_WITHIN_MS = 2 * 1440 * MINUTE_MS
const PACE_ADVICE = {
  retier: 'Projection over 100%: cut a tier, shrink briefs, run fewer workers in parallel; move work to the family with headroom only if that family\'s own windows stay at or under 100%.',
  spend: 'Weekly projection under 90% with the reset under two days away: room to use more.',
} as const

const windowVerdict = (policy: BudgetPolicy, key: PlanWindowKey, value: PlanWindow, projection: PlanProjection | undefined, at: number): WindowBudget['verdict'] => {
  if (!projection) return 'ok'
  if (policy === 'pace') {
    if (!projection.fits) return 'retier'
    const left = Date.parse(value.resetsAt ?? '') - at
    return key === 'week' && projection.projectedAtReset < PACE_SPEND_BELOW && left > 0 && left < PACE_SPEND_WITHIN_MS ? 'spend' : 'ok'
  }
  return projection.fits ? 'ok' : policy === 'within' ? 'ask' : 'over'
}

// When the family's reading was observed: for Codex and Gemini the source's own timestamp, never when this session read the file.
export const isStale = (readAt: number | undefined, at: number): boolean => readAt !== undefined && at - readAt > READING_STALE_MS

export const budgetSummary = (usage: UsageReadings, at: number): BudgetSummary => {
  const summary: BudgetSummary = { claude: {}, codex: {}, gemini: {}, agy: {} }
  for (const family of PLAN_FAMILIES) {
    const policy = budgetPolicy(usage, family)
    const readAt = usage[READ_AT[family]]
    const stale = isStale(readAt, at)
    for (const key of PLAN_WINDOWS) {
      const value = usage[family]?.[key]
      if (!value) continue
      // A stale reading projects nothing and so decides no verdict, unless it is already at its limit (within a window
      // usage only grows); a passed reset is a new window whose reset is unknown.
      const projection = stale && value.percentUsed < 100 ? undefined : projectPlanWindow(value, key, at, usage.history?.[family]?.[key])
      const verdict = windowVerdict(policy, key, value, projection, at)
      const reset = isReset(value, at)
      summary[family][key] = { used: reset ? 0 : value.percentUsed, resetsAt: reset ? null : value.resetsAt ?? null,
        projectedAtReset: projection?.projectedAtReset ?? null, exhaustsAt: projection?.exhaustsAt ?? null,
        pace: projection?.pace ?? null, policy, verdict,
        readAt: readAt === undefined || !Number.isFinite(readAt) ? null : new Date(readAt).toISOString(), stale,
        ...(verdict === 'retier' || verdict === 'spend' ? { advice: PACE_ADVICE[verdict] } : {}) }
    }
  }
  return summary
}

// A tier's cost as a share of a window: the percent the window moved per dollar this session spent over the
// window's recent history. Other sessions on the same plan move the window too, so the share errs high.
const MIN_SPEND_USD = 0.5
const CLAUDE_TIERS: readonly string[] = ['fable', 'heavy', 'careful', 'medium', 'light', 'tools']
// The costly tiers each family's ask verdict holds back until the user decides.
const GATED_TIERS: Readonly<Record<string, PlanFamily>> = {
  fable: 'claude', heavy: 'claude', careful: 'claude', 'codex-sol': 'codex', 'codex-astra': 'codex',
  'gemini-neon': 'gemini', 'gemini-hydrogen': 'gemini', 'gemini-carbon': 'gemini',
  'agy-opus': 'agy', 'agy-sonnet': 'agy',
}
const FAMILY_NAME: Readonly<Record<PlanFamily, string>> = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini', agy: 'Agy' }
const WINDOW_NAME: Readonly<Record<PlanWindowKey, string>> = { fiveHour: '5h', week: 'week' }
const roundTo = (n: number, digits: number): number => Math.round(n * 10 ** digits) / 10 ** digits

const percentPerUsd = (usage: UsageReadings, family: PlanFamily, key: PlanWindowKey, at: number): number | undefined => {
  const value = usage[family]?.[key]
  const history = usage.history?.[family]?.[key]
  if (!value || !history || isReset(value, at) || history.resetsAt !== value.resetsAt) return undefined
  const priced = history.samples.filter(sample => nonnegative(sample.spentUsd))
  const first = priced[0], last = priced.at(-1)
  if (!first || !last) return undefined
  const spent = last.spentUsd! - first.spentUsd!, moved = last.percentUsed - first.percentUsed
  return spent >= MIN_SPEND_USD && moved > 0 ? moved / spent : undefined
}

// Finished Claude runs with a measured cost, per tier; null shares until the windows have moved with spend.
export const tierEstimates = (runs: AgentRun[], usage: UsageReadings, at: number): TierEstimates => {
  const rates = { fiveHour: percentPerUsd(usage, 'claude', 'fiveHour', at), week: percentPerUsd(usage, 'claude', 'week', at) }
  const estimates: TierEstimates = {}
  for (const tier of CLAUDE_TIERS) {
    const done = runs.filter(r => r.status === 'done' && r.costUsd > 0 && isSavvy(r.type) && tierOf(r.type) === tier)
    if (!done.length) continue
    const usd = done.reduce((sum, r) => sum + r.costUsd, 0) / done.length
    const share = (rate: number | undefined): number | null => rate === undefined ? null : roundTo(usd * rate, 1)
    estimates[tier] = { runs: done.length, usd: roundTo(usd, 2), fiveHour: share(rates.fiveHour), week: share(rates.week) }
  }
  return estimates
}

const soonestReset = (usage: UsageReadings, family: PlanFamily, at: number): string => {
  const resets = PLAN_WINDOWS.map(key => usage[family]?.[key]?.resetsAt)
    .filter((reset): reset is string => Boolean(reset) && Date.parse(reset!) > at)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
  // One yes covers one short window at most, even when only the week's reset is known.
  const cap = at + PLAN_WINDOW_MINUTES.fiveHour * MINUTE_MS
  return resets[0] && Date.parse(resets[0]) <= cap ? resets[0] : new Date(cap).toISOString()
}

// The user's yes to costly work on a family despite its ask verdict, until the family's soonest reset.
export const decideBudget = (usage: UsageReadings, family: PlanFamily, at: number, by: 'user' | 'orchestrator', words?: string): UsageReadings => {
  const said = words?.trim()
  return { ...usage, decisions: { ...usage.decisions,
    [family]: { until: soonestReset(usage, family, at), at, by, ...(said ? { words: said } : {}) } } }
}

// Fable, Codex Astra and Gemini Carbon are for plans only: each launch, and each resume, needs the user's recorded yes.
// `key` is the decide tool's name for the tier.
const TOP_TIERS: Readonly<Record<string, { family: PlanFamily; name: string; alternative: string; key: string }>> = {
  fable: { family: 'claude', name: 'Claude Fable', alternative: 'Heavy (Claude)', key: 'fable' },
  'codex-astra': { family: 'codex', name: 'Codex Astra', alternative: 'Sol (Codex)', key: 'astra' },
  'gemini-carbon': { family: 'gemini', name: 'Gemini Carbon', alternative: 'Hydrogen (Gemini)', key: 'carbon' },
}
const TOP_TIER_NAMES: Readonly<Record<string, string>> = {
  fable: 'fable', astra: 'codex-astra', 'codex-astra': 'codex-astra', carbon: 'gemini-carbon', 'gemini-carbon': 'gemini-carbon',
}

// An Agent launch or a SendMessage resume of a top tier, refused unless a recorded yes still has uses left.
// The top tier a call or a worker is: its savvy type, or any type run on a Fable model (`model: "FABLE"`, a model id).
const topTierKey = (subagentType: string, model?: unknown): string | undefined => {
  if (isSavvy(subagentType) && tierOf(subagentType) in TOP_TIERS) return tierOf(subagentType)
  return typeof model === 'string' && /fable/i.test(model) ? 'fable' : undefined
}

export const topTierGate = (subagentType: string, usage: UsageReadings, resume = false, language: Lang = 'en', model?: unknown): string | undefined => {
  const tier = topTierKey(subagentType, model), top = tier ? TOP_TIERS[tier] : undefined
  if (!tier || !top) return undefined
  const permit = usage.topTiers?.[tier]
  if (permit && (permit.uses === 'session' || permit.uses > 0)) return undefined
  const it = language === 'it'
  return STRINGS[language].topGate({ tier, key: top.key, name: top.name,
    action: resume ? (it ? 'ripresa (SendMessage)' : 'resume (SendMessage)') : (it ? 'avvio' : 'launch'),
    spent: Boolean(permit), alternative: top.alternative })
}

// One launch or resume of a top tier used; a session permit stays, a counted one is left with one use fewer.
export const spendTopTier = (usage: UsageReadings, subagentType: string, model?: unknown): UsageReadings => {
  const tier = topTierKey(subagentType, model)
  const permit = tier ? usage.topTiers?.[tier] : undefined
  if (!tier) return usage
  if (!permit || permit.uses === 'session') return usage
  return { ...usage, topTiers: { ...usage.topTiers, [tier]: { ...permit, uses: permit.uses - 1 } } }
}

// The user's yes to a top tier: one launch by default, a number, or the whole session.
export const allowTopTier = (usage: UsageReadings, tier: string, at: number, words: string, uses: number | 'session' = 1): UsageReadings =>
  ({ ...usage, topTiers: { ...usage.topTiers, [tier]: { at, words: words.trim(), uses } } })

const decisionHolds = (usage: UsageReadings, family: PlanFamily, at: number): boolean => {
  const until = usage.decisions?.[family]?.until
  return Boolean(until && Date.parse(until) > at)
}

// An Agent call of a costly tier, refused while its family asks and the user has not decided; open otherwise.
export const budgetGate = (subagentType: string, usage: UsageReadings, runs: AgentRun[], at: number, language: Lang = 'en'): string | undefined => {
  if (!isSavvy(subagentType)) return undefined
  const tier = tierOf(subagentType)
  const family = GATED_TIERS[tier]
  if (!family || decisionHolds(usage, family, at)) return undefined
  const windows = budgetSummary(usage, at)[family]
  const asking = PLAN_WINDOWS.filter(key => windows[key]?.verdict === 'ask')
  if (!asking.length) return undefined
  const facts = asking.map(key => {
    const w = windows[key]!
    return { window: WINDOW_NAME[key], used: Math.round(w.used), projected: Math.round(w.projectedAtReset ?? w.used),
      resetsAt: w.resetsAt ?? '', exhaustsAt: w.exhaustsAt }
  })
  const estimate = family === 'claude' ? tierEstimates(runs, usage, at)[tier] : undefined
  const share = PLAN_WINDOWS.flatMap(window => estimate?.[window] == null ? [] : [{ window, percent: estimate[window]! }])
  return STRINGS[language].gate({ family: FAMILY_NAME[family], key: family, tier, facts, share })
}

// An Agent call of a savvy worker outside the current plan, refused: the panel matches runs to planned
// tasks by description = title, so a launch the plan does not name would leave the bar stale. Open when no
// plan is active (no tasks, or the flow finished), and for any non-savvy type (Explore, claude-code-guide).
export const planGate = (subagentType: string, description: unknown, plan: Flow | null | undefined, language: Lang = 'en'): string | undefined => {
  if (!isSavvy(subagentType) || !plan || plan.isFinished || !plan.tasks?.length) return undefined
  const asked = typeof description === 'string' ? description.trim() : ''
  if (plan.tasks.some(t => t.title === asked)) return undefined
  return STRINGS[language].planGate(asked, plan.title)
}

// The tiers a mechanical run through a connected tool is wasted on.
const FIT_TIERS: readonly string[] = ['fable', 'heavy', 'careful']

// An Agent call of a costly Claude tier whose brief reads as a ready procedure run through a connected tool, refused
// unless the prompt says why in a `why-not-tools:` line: that work is savvy-tools'. It holds no state: the line is
// what lets a brief through. Open on any missing text or error.
export const fitGate = (subagentType: unknown, description: unknown, prompt: unknown, language: Lang = 'en'): string | undefined => {
  try {
    if (typeof subagentType !== 'string' || typeof description !== 'string' || typeof prompt !== 'string') return undefined
    const tier = tierOf(subagentType)
    if (!FIT_TIERS.includes(tier) || !readsAsRecipe(description, prompt) || saysWhyNotTools(prompt)) return undefined
    return STRINGS[language].fitGate(description.trim(), tier)
  } catch {
    // A guard that cannot judge never holds work back.
    return undefined
  }
}

// The routing rules in short, for the orchestrator: a plan outlives a compaction or a resume with its tiers, while the
// skill that set them is gone from the context. None while no plan is open.
const routingCard = (plan: Flow | null | undefined): string | undefined =>
  plan && !plan.isFinished && plan.tasks?.length ? tr().routingCard : undefined

export const claudePlanUsage = (limits: SessionRateLimit[]): PlanUsage | undefined => {
  const window = (kind: string) => {
    const value = limits.find(l => l.kind === kind && nonnegative(l.percentUsed))
    return value ? { percentUsed: value.percentUsed, ...(value.resetsAt ? { resetsAt: value.resetsAt } : {}) } : undefined
  }
  const fiveHour = window('five_hour'), week = window('seven_day')
  return fiveHour || week ? { fiveHour, week } : undefined
}

const STATUS_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/
const STATUS_MAX_BYTES = 16 * 1024
// Bound session usage reads even during busy worker events.
const CLAUDE_USAGE_POLL_MS = 60_000
const STATUS_POLL_MS = 3000
const STATUS_STALE_MS = 15_000

// The writer publishes only bounded fields. The panel never opens a Codex rollout.
const codexLimitsFrom = (limits: { primary?: unknown; secondary?: unknown } | undefined): PlanUsage | undefined => {
  const window = (value: unknown, minutes: number) => {
    const w = value as { used_percent?: unknown; window_minutes?: unknown; resets_at?: unknown } | undefined
    return w?.window_minutes === minutes && nonnegative(w.used_percent) && nonnegative(w.resets_at) && Number.isFinite(new Date(w.resets_at * 1000).getTime())
      ? { percentUsed: w.used_percent, resetsAt: new Date(w.resets_at * 1000).toISOString() } : undefined
  }
  const fiveHour = window(limits?.primary, PLAN_WINDOW_MINUTES.fiveHour), week = window(limits?.secondary, PLAN_WINDOW_MINUTES.week)
  return fiveHour || week ? { fiveHour, week } : undefined
}

export const codexStatusFrom = (text: string): CodexStatus | undefined => {
  try {
    if (text.length > STATUS_MAX_BYTES) return undefined
    const value = JSON.parse(text)
    const u = value?.totalTokenUsage
    if (value?.version !== 1 || !['running', 'done', 'failed'].includes(value.state) ||
        !(value.sessionId === null || typeof value.sessionId === 'string' && value.sessionId.length <= 120) ||
        !(value.model === null || typeof value.model === 'string' && value.model.length <= 120) ||
        typeof value.action !== 'string' || [...value.action].length > 60 || !nonnegative(value.updatedAt) ||
        !u || ![u.input_tokens, u.cached_input_tokens, u.output_tokens].every(nonnegative) ||
        !(u.reasoning_output_tokens === null || nonnegative(u.reasoning_output_tokens)) ||
        u.cached_input_tokens > u.input_tokens) return undefined
    return { version: 1, sessionId: value.sessionId, model: value.model, state: value.state, action: value.action,
      totalTokenUsage: { input_tokens: u.input_tokens, cached_input_tokens: u.cached_input_tokens,
        output_tokens: u.output_tokens, reasoning_output_tokens: u.reasoning_output_tokens },
      rateLimits: codexLimitsFrom(value.rateLimits), updatedAt: value.updatedAt }
  } catch { return undefined }
}

// A manual snapshot has no run state, session id or token counters.
export const codexPlanFrom = (text: string): { rateLimits: PlanUsage; updatedAt: number } | undefined => {
  try {
    if (text.length > STATUS_MAX_BYTES) return undefined
    const value = JSON.parse(text)
    if (!value || !nonnegative(value.updatedAt) ||
        !(value.model === null || typeof value.model === 'string' && value.model.length <= 120)) return undefined
    if ('version' in value) {
      const status = codexStatusFrom(text)
      return status?.rateLimits ? { rateLimits: status.rateLimits, updatedAt: status.updatedAt } : undefined
    }
    const rateLimits = codexLimitsFrom(value.rateLimits)
    return rateLimits ? { rateLimits, updatedAt: value.updatedAt } : undefined
  } catch { return undefined }
}

export const codexRun = (a: AgentRun, usage: UsageReadings, at: number): AgentRun => {
  if (!a.codexStatus) return a
  const status = usage.statuses[a.codexStatus]
  const relayStatus = a.relayStatus ?? a.status
  const relayEndedAt = a.relayEndedAt ?? a.endedAt
  const codexState = status?.state === 'running' && at - status.updatedAt > STATUS_STALE_MS ? undefined : status?.state
  const state = codexState === 'running' ? 'running' : relayStatus === 'running' ? 'running'
    : codexState === 'failed' ? 'failed' : relayStatus
  return { ...a, relayStatus, relayEndedAt, status: state, codexState,
    endedAt: state === 'running' ? undefined : relayEndedAt ?? at,
    ...(status?.action ? { stepNote: status.action } : {}) }
}

// The Gemini mirror of codexRun: an independently running Gemini keeps its relay's row live.
export const geminiRun = (a: AgentRun, usage: UsageReadings, at: number): AgentRun => {
  if (!a.geminiStatus) return a
  const status = usage.geminiStatuses?.[a.geminiStatus]
  const relayStatus = a.relayStatus ?? a.status
  const relayEndedAt = a.relayEndedAt ?? a.endedAt
  const geminiState = status?.state === 'running' && at - status.updatedAt > STATUS_STALE_MS ? undefined : status?.state
  const state = geminiState === 'running' ? 'running' : relayStatus === 'running' ? 'running'
    : geminiState === 'failed' ? 'failed' : relayStatus
  return { ...a, relayStatus, relayEndedAt, status: state, geminiState,
    endedAt: state === 'running' ? undefined : relayEndedAt ?? at,
    ...(status?.action ? { stepNote: status.action } : {}) }
}

// A row relayed to Codex or Gemini: its own state is the relay's, merged with the other model's.
const isRelayed = (a: AgentRun): boolean => Boolean(a.codexStatus || a.geminiStatus)
const relayRun = (a: AgentRun, usage: UsageReadings, at: number): AgentRun =>
  a.codexStatus ? codexRun(a, usage, at) : a.geminiStatus ? geminiRun(a, usage, at) : a

async function syncRelayRuns($: EngineInterface): Promise<void> {
  const usage = await read($, usageReadings)
  const at = await $.clock.now()
  await update($, agents, list => list.map(a => relayRun(a, usage, at)))
  await syncRunning($)
}

async function refreshClaudeUsage($: EngineInterface, force = false): Promise<void> {
  const at = await $.clock.now()
  const previous = await read($, usageReadings)
  if (!force && previous.claudeCacheReadAt !== undefined && at - previous.claudeCacheReadAt < CLAUDE_USAGE_POLL_MS) return
  let claimed = false
  await update($, usageReadings, prev => {
    claimed = force || prev.claudeCacheReadAt === undefined || at - prev.claudeCacheReadAt >= CLAUDE_USAGE_POLL_MS
    return claimed ? { ...prev, claudeCacheReadAt: at } : prev
  })
  if (!claimed) return
  try {
    const claude = claudePlanUsage((await $.session.usage()).rateLimits)
    if (claude) await update($, usageReadings, prev => recordPlanUsage(prev, 'claude', claude, at))
  } catch { /* Keep the last valid observation and its age. */ }
}

async function refreshCodexUsage($: EngineInterface, force = false): Promise<void> {
  const at = await $.clock.now()
  const previous = await read($, usageReadings)
  if (!force && previous.cacheReadAt !== undefined && at - previous.cacheReadAt < STATUS_POLL_MS) return
  await update($, usageReadings, prev => ({ ...prev, cacheReadAt: at }))
  const statuses: UsageReadings['statuses'] = {}, statusMtimes: Record<string, number> = {}
  let latest: { rateLimits: PlanUsage; updatedAt: number; source: { name: string; mtimeMs: number } } | undefined
  try {
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'))
    if (home) {
      const directory = `${home.replace(/[\\/]+$/, '')}/.codex/savvy-status`
      const files = (await $.fs.list(directory)).filter(f => f.kind === 'file' && !f.isLink &&
        f.name.endsWith('.json') && STATUS_NAME.test(f.name.slice(0, -5)) && f.size <= STATUS_MAX_BYTES)
        .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name))
      const wanted = new Set((await read($, agents)).map(a => a.codexStatus).filter(Boolean))
      wanted.add('snapshot')
      for (const file of files) {
        const name = file.name.slice(0, -5)
        // Find the newest valid plan, even if newer files contain only run state.
        if (!wanted.has(name) && latest && file.mtimeMs <= latest.updatedAt) continue
        const cached = previous.statuses[name]
        let status = cached
        let plan = cached?.rateLimits ? { rateLimits: cached.rateLimits, updatedAt: cached.updatedAt } : undefined
        const savedSnapshot = name === 'snapshot' && previous.codex && previous.codexUpdatedAt !== undefined &&
          previous.codexSource?.name === name && previous.codexSource.mtimeMs === file.mtimeMs
        if (savedSnapshot) plan = { rateLimits: previous.codex!, updatedAt: previous.codexUpdatedAt! }
        // Running files refresh every three seconds; finished files only on a changed mtime.
        else if (!cached || cached.state === 'running' || previous.statusMtimes?.[name] !== file.mtimeMs) {
          try {
            const text = await $.fs.read(`${directory}/${file.name}`)
            status = codexStatusFrom(text)
            plan = codexPlanFrom(text)
          } catch { status = undefined; plan = undefined }
        }
        if (status) { statuses[name] = status; statusMtimes[name] = file.mtimeMs }
        if (plan && (!latest || plan.updatedAt > latest.updatedAt)) latest = { ...plan, source: { name, mtimeMs: file.mtimeMs } }
      }
    }
  } catch { /* Keep the panel's last plan reading across filesystem gaps. */ }
  await update($, usageReadings, prev => {
    const refreshed = { ...prev, statuses, statusMtimes }
    return latest && (prev.codexUpdatedAt === undefined || latest.updatedAt > prev.codexUpdatedAt)
      ? { ...recordPlanUsage(refreshed, 'codex', latest.rateLimits, latest.updatedAt),
          codexReadAt: latest.updatedAt, codexUpdatedAt: latest.updatedAt, codexSource: latest.source } : refreshed
  })
  await syncRelayRuns($)
}

// agy's `/usage` data ({ groups: [{ name, buckets: [{ window, remaining_fraction, reset_time }] }] }): the Gemini
// family is the group named "Gemini Models"; the agy family is "Claude and GPT models", Antigravity's own quota for
// the third-party models it serves. A window not started yet has `reset_time` 1970-01-01: a reset passed, so it reads unused.
const GEMINI_GROUP = 'Gemini Models'
const AGY_GROUP = 'Claude and GPT models'
const GEMINI_WINDOWS: Readonly<Record<string, PlanWindowKey>> = { '5h': 'fiveHour', weekly: 'week' }

export const geminiLimitsFrom = (data: unknown, name = GEMINI_GROUP): PlanUsage | undefined => {
  const groups = (data as { groups?: unknown } | null | undefined)?.groups
  if (!Array.isArray(groups)) return undefined
  const group = groups.find(g => g && typeof g === 'object' && (g as { name?: unknown }).name === name) as { buckets?: unknown } | undefined
  if (!Array.isArray(group?.buckets)) return undefined
  const plan: PlanUsage = {}
  for (const bucket of group.buckets as { window?: unknown; remaining_fraction?: unknown; reset_time?: unknown }[]) {
    const key = typeof bucket?.window === 'string' ? GEMINI_WINDOWS[bucket.window] : undefined
    const left = bucket?.remaining_fraction
    const reset = typeof bucket?.reset_time === 'string' ? Date.parse(bucket.reset_time) : NaN
    if (!key || plan[key] || !nonnegative(left) || left > 1 || !Number.isFinite(reset)) continue
    plan[key] = { percentUsed: Math.round((1 - left) * 100), resetsAt: new Date(reset).toISOString() }
  }
  return plan.fiveHour || plan.week ? plan : undefined
}

export const agyLimitsFrom = (data: unknown): PlanUsage | undefined => geminiLimitsFrom(data, AGY_GROUP)

// The whole output of `agy -p "/usage" --output-format json`.
export const geminiUsageFrom = (text: string, name = GEMINI_GROUP): PlanUsage | undefined => {
  try {
    const value = JSON.parse(text)
    return value?.command?.name === 'usage' ? geminiLimitsFrom(value.command.data, name) : undefined
  } catch { return undefined }
}
export const agyUsageFrom = (text: string): PlanUsage | undefined => geminiUsageFrom(text, AGY_GROUP)

const nullableCount = (n: unknown): boolean => n === undefined || n === null || nonnegative(n)

export const geminiStatusFrom = (text: string): GeminiStatus | undefined => {
  try {
    if (text.length > STATUS_MAX_BYTES) return undefined
    const value = JSON.parse(text)
    const u = value?.totalTokenUsage
    // cache_read_tokens is apart from input_tokens in agy's usage, so it may exceed it.
    if (value?.version !== 1 || !['running', 'done', 'failed'].includes(value.state) ||
        !(value.sessionId === null || typeof value.sessionId === 'string' && value.sessionId.length <= 120) ||
        !(value.model === null || typeof value.model === 'string' && value.model.length <= 120) ||
        typeof value.action !== 'string' || [...value.action].length > 60 || !nonnegative(value.updatedAt) ||
        !u || ![u.input_tokens, u.output_tokens, u.cache_read_tokens].every(nonnegative) ||
        !nullableCount(u.thinking_tokens) || !nullableCount(u.total_tokens)) return undefined
    return { version: 1, sessionId: value.sessionId, model: value.model, state: value.state, action: value.action,
      totalTokenUsage: { input_tokens: u.input_tokens, output_tokens: u.output_tokens, cache_read_tokens: u.cache_read_tokens,
        thinking_tokens: u.thinking_tokens ?? null, total_tokens: u.total_tokens ?? null },
      rateLimits: geminiLimitsFrom(value.rateLimits), agyRateLimits: agyLimitsFrom(value.rateLimits), updatedAt: value.updatedAt }
  } catch { return undefined }
}

// A manual snapshot has no run state, session id or token counters.
export const geminiPlanFrom = (text: string): { rateLimits: PlanUsage; updatedAt: number } | undefined => {
  try {
    if (text.length > STATUS_MAX_BYTES) return undefined
    const value = JSON.parse(text)
    if (!value || !nonnegative(value.updatedAt) ||
        !(value.model === null || typeof value.model === 'string' && value.model.length <= 120)) return undefined
    if ('version' in value) {
      const status = geminiStatusFrom(text)
      return status?.rateLimits ? { rateLimits: status.rateLimits, updatedAt: status.updatedAt } : undefined
    }
    const rateLimits = geminiLimitsFrom(value.rateLimits)
    return rateLimits ? { rateLimits, updatedAt: value.updatedAt } : undefined
  } catch { return undefined }
}

// The agy family's reading in the same file: a relay's status or a manual snapshot.
export const agyPlanFrom = (text: string): { rateLimits: PlanUsage; updatedAt: number } | undefined => {
  try {
    if (text.length > STATUS_MAX_BYTES) return undefined
    const value = JSON.parse(text)
    if (!value || !nonnegative(value.updatedAt)) return undefined
    if ('version' in value) {
      const status = geminiStatusFrom(text)
      return status?.agyRateLimits ? { rateLimits: status.agyRateLimits, updatedAt: status.updatedAt } : undefined
    }
    if (!(value.model === null || typeof value.model === 'string' && value.model.length <= 120)) return undefined
    const rateLimits = agyLimitsFrom(value.rateLimits)
    return rateLimits ? { rateLimits, updatedAt: value.updatedAt } : undefined
  } catch { return undefined }
}

// The Codex reader's mirror for ~/.gemini/savvy-status, with its own statuses and poll stamp.
async function refreshGeminiUsage($: EngineInterface, force = false): Promise<void> {
  const at = await $.clock.now()
  const previous = await read($, usageReadings)
  if (!force && previous.geminiCacheReadAt !== undefined && at - previous.geminiCacheReadAt < STATUS_POLL_MS) return
  await update($, usageReadings, prev => ({ ...prev, geminiCacheReadAt: at }))
  const statuses: Record<string, GeminiStatus> = {}, statusMtimes: Record<string, number> = {}
  let latest: { rateLimits: PlanUsage; updatedAt: number; source: { name: string; mtimeMs: number } } | undefined
  // The agy family's newest reading, from the same files.
  let latestAgy: { rateLimits: PlanUsage; updatedAt: number } | undefined
  try {
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'))
    if (home) {
      const directory = `${home.replace(/[\\/]+$/, '')}/.gemini/savvy-status`
      const files = (await $.fs.list(directory)).filter(f => f.kind === 'file' && !f.isLink &&
        f.name.endsWith('.json') && STATUS_NAME.test(f.name.slice(0, -5)) && f.size <= STATUS_MAX_BYTES)
        .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name))
      const wanted = new Set((await read($, agents)).map(a => a.geminiStatus).filter(Boolean))
      wanted.add('snapshot')
      for (const file of files) {
        const name = file.name.slice(0, -5)
        // Older files than both newest readings add nothing; a file with no agy group never ends the search for one.
        if (!wanted.has(name) && latest && latestAgy && file.mtimeMs <= Math.min(latest.updatedAt, latestAgy.updatedAt)) continue
        const cached = previous.geminiStatuses?.[name]
        let status = cached
        let plan = cached?.rateLimits ? { rateLimits: cached.rateLimits, updatedAt: cached.updatedAt } : undefined
        let agyPlan = cached?.agyRateLimits ? { rateLimits: cached.agyRateLimits, updatedAt: cached.updatedAt } : undefined
        const savedSnapshot = name === 'snapshot' && previous.gemini && previous.geminiUpdatedAt !== undefined &&
          previous.geminiSource?.name === name && previous.geminiSource.mtimeMs === file.mtimeMs
        if (savedSnapshot) plan = { rateLimits: previous.gemini!, updatedAt: previous.geminiUpdatedAt! }
        else if (!cached || cached.state === 'running' || previous.geminiStatusMtimes?.[name] !== file.mtimeMs) {
          try {
            const text = await $.fs.read(`${directory}/${file.name}`)
            status = geminiStatusFrom(text)
            plan = geminiPlanFrom(text)
            agyPlan = agyPlanFrom(text)
          } catch { status = undefined; plan = undefined; agyPlan = undefined }
        }
        if (status) { statuses[name] = status; statusMtimes[name] = file.mtimeMs }
        if (plan && (!latest || plan.updatedAt > latest.updatedAt)) latest = { ...plan, source: { name, mtimeMs: file.mtimeMs } }
        if (agyPlan && (!latestAgy || agyPlan.updatedAt > latestAgy.updatedAt)) latestAgy = agyPlan
      }
    }
  } catch { /* Keep the panel's last plan reading across filesystem gaps. */ }
  // A session that never saw a Gemini snapshot keeps its usage as it was.
  const seen = Object.keys(statuses).length > 0 || previous.geminiStatuses !== undefined
  await update($, usageReadings, prev => {
    const refreshed = seen ? { ...prev, geminiStatuses: statuses, geminiStatusMtimes: statusMtimes } : prev
    const withGemini = latest && (prev.geminiUpdatedAt === undefined || latest.updatedAt > prev.geminiUpdatedAt)
      ? { ...recordPlanUsage(refreshed, 'gemini', latest.rateLimits, latest.updatedAt),
          geminiReadAt: latest.updatedAt, geminiUpdatedAt: latest.updatedAt, geminiSource: latest.source } : refreshed
    return latestAgy && (prev.agyReadAt === undefined || latestAgy.updatedAt > prev.agyReadAt)
      ? recordPlanUsage(withGemini, 'agy', latestAgy.rateLimits, latestAgy.updatedAt) : withGemini
  })
  if (seen) await syncRelayRuns($)
}

// agy's own answer, when the Gemini reading is older than five minutes: relays write one only when they run, so a
// reading two days old stood for the current week after Google had reset it. `agy -p /usage` calls no model and takes
// a few seconds; it runs at most once per five minutes, never while one of this session's Gemini relays runs (that
// relay's own snapshot is on its way), and only once a Gemini reading exists (no agy, no Gemini, nothing to reread).
const GEMINI_REREAD_MS = 5 * MINUTE_MS
const AGY_TIMEOUT_MS = 10_000
// The run under way, so the budget tool and the gate wait for the answer a tick has just asked for. Runtime only:
// a reload starts with none, and the usage atom keeps the readings.
let agyInFlight: Promise<void> | undefined

// `~/.local/bin/agy` (agy.exe on Windows) where the installer puts it, for a host launched without it on PATH; else PATH's.
async function agyPath($: EngineInterface): Promise<string> {
  try {
    const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE'))
    if (home) {
      const directory = `${home.replace(/[\\/]+$/, '')}/.local/bin`
      const names = new Set((await $.fs.list(directory)).filter(f => f.kind === 'file' || f.isLink).map(f => f.name))
      for (const name of ['agy.exe', 'agy']) if (names.has(name)) return `${directory}/${name}`
    }
  } catch { /* No such folder: PATH's agy. */ }
  return 'agy'
}

// `fromTick`: the background tick gives up after a failed run until a newer reading arrives (signed out, agy waits
// for a browser sign-in until it is killed: no session should start it every five minutes for nothing); the budget
// tool and the gate still try, at most once per five minutes.
export async function rereadGemini($: EngineInterface, fromTick = false): Promise<void> {
  if (agyInFlight) return fromTick ? undefined : agyInFlight
  const at = await $.clock.now()
  const usage = await read($, usageReadings)
  if (!(hasPlan(usage.gemini) || hasPlan(usage.agy)) || (usage.geminiUpdatedAt !== undefined && at - usage.geminiUpdatedAt < GEMINI_REREAD_MS)) return
  if (fromTick && usage.geminiProbeFailedAt !== undefined && usage.geminiProbeFailedAt >= (usage.geminiUpdatedAt ?? 0)) return
  if ((await read($, agents)).some(a => a.geminiStatus && a.status === 'running')) return
  let claimed = false
  await update($, usageReadings, prev => {
    claimed = prev.geminiProbeAt === undefined || at - prev.geminiProbeAt >= GEMINI_REREAD_MS
    return claimed ? { ...prev, geminiProbeAt: at } : prev
  })
  if (!claimed) return
  const run = (async () => {
    let plan: PlanUsage | undefined, agyPlan: PlanUsage | undefined
    try {
      const { exitCode, stdout } = await $.process.run([await agyPath($), '-p', '/usage', '--output-format', 'json'],
        { stdin: '', timeoutMs: AGY_TIMEOUT_MS })
      plan = exitCode === 0 ? geminiUsageFrom(stdout) : undefined
      agyPlan = exitCode === 0 ? agyUsageFrom(stdout) : undefined
    } catch { /* Signed out, missing or slow: the reading keeps its age and, once stale, decides nothing. */ }
    const done = await $.clock.now()
    await update($, usageReadings, prev => {
      if (!plan && !agyPlan) return { ...prev, geminiProbeFailedAt: done }
      const withGemini = !plan || prev.geminiUpdatedAt !== undefined && prev.geminiUpdatedAt >= done ? prev
        : { ...recordPlanUsage(prev, 'gemini', plan, done), geminiReadAt: done, geminiUpdatedAt: done,
            geminiSource: { name: 'agy', mtimeMs: done }, geminiProbeFailedAt: undefined }
      return !agyPlan || prev.agyReadAt !== undefined && prev.agyReadAt >= done ? withGemini
        : recordPlanUsage(withGemini, 'agy', agyPlan, done)
    })
  })()
  agyInFlight = run.finally(() => { agyInFlight = undefined })
  return agyInFlight
}

const hasPlan = (plan?: PlanUsage): boolean => Boolean(plan?.fiveHour || plan?.week)
const hasPlans = (usage: Pick<UsageReadings, 'claude' | 'codex' | 'gemini' | 'agy'>): boolean =>
  hasPlan(usage.claude) || hasPlan(usage.codex) || hasPlan(usage.gemini) || hasPlan(usage.agy)

// Keep the observed usage at the reset instant; it becomes expired strictly after it.
const isReset = (value: PlanUsage['fiveHour'], at: number): boolean => Boolean(value?.resetsAt && at > Date.parse(value.resetsAt))
const planAt = (plan: PlanUsage | undefined, at: number): PlanUsage | undefined => plan && Object.fromEntries(
  Object.entries(plan).map(([key, value]) => [key, isReset(value, at) ? { ...value, percentUsed: 0 } : value]))

export const planUsageText = (usage: Pick<UsageReadings, 'claude' | 'codex' | 'gemini' | 'agy' | 'policies' | 'history'>, at = 0): string => {
  if (!hasPlans(usage)) return ''
  const budget = budgetSummary({ ...usage, statuses: {} }, at)
  // A family with no reading is left out, as its plan tile is.
  const family = (name: string, key: PlanFamily, plan?: PlanUsage) => hasPlan(plan)
    ? `${name}${Object.values(budget[key]).some(window => window.verdict === 'ask') ? '!' : ''} ${plan?.fiveHour?.percentUsed ?? '—'}/${plan?.week?.percentUsed ?? '—'}%` : ''
  return [family('Claude', 'claude', planAt(usage.claude, at)), family('Codex', 'codex', planAt(usage.codex, at)),
    family('Gemini', 'gemini', planAt(usage.gemini, at)), family('Agy', 'agy', planAt(usage.agy, at))].filter(Boolean).join('  ')
}

const codexAccount = (a: AgentRun, usage: UsageReadings) => {
  const status = a.codexStatus && usage.statuses[a.codexStatus]
  return status ? { tokens: status.totalTokenUsage.input_tokens + status.totalTokenUsage.output_tokens,
    cost: codexCostOf(status.model || a.codexModel || tierOf(a.type), status.totalTokenUsage) } : { tokens: undefined, cost: undefined }
}

// No verified Gemini price table: its cost stays unknown, its tokens are input, cache reads and output.
const geminiAccount = (a: AgentRun, usage: UsageReadings) => {
  const status = a.geminiStatus && usage.geminiStatuses?.[a.geminiStatus]
  return status ? { tokens: status.totalTokenUsage.input_tokens + status.totalTokenUsage.cache_read_tokens + status.totalTokenUsage.output_tokens,
    cost: undefined as number | undefined } : { tokens: undefined, cost: undefined }
}

const hasClaudeUsage = (a: AgentRun): boolean => a.steps > 0 || a.tokens > 0 || a.contextTokens > 0 || a.costUsd > 0

const rowAccount = (a: AgentRun, usage: UsageReadings) => tierOf(a.type) in CODEX_WEARS ? codexAccount(a, usage)
  : tierOf(a.type) in AGY_RELAYS ? geminiAccount(a, usage)
  : { tokens: hasClaudeUsage(a) ? a.contextTokens : undefined, cost: hasClaudeUsage(a) ? a.costUsd : undefined }

const accountText = (a: AgentRun, usage: UsageReadings): string => {
  const value = rowAccount(a, usage)
  return [value.tokens === undefined ? '' : fmtTokens(value.tokens), value.cost === undefined ? '' : `≈${fmtCost(value.cost)}`].filter(Boolean).join(' ')
}

const rowStats = (a: AgentRun, usage: UsageReadings, at: number): string => {
  const ctx = a.contextMax && (a.steps > 0 || a.contextTokens > 0) ? `${tr().ctx} ${ctxOf(a)}%` : ''
  return [[ctx, accountText(a, usage)].filter(Boolean).join(' · '), fmtTime(elapsed(a, at))].filter(Boolean).join(' ')
}

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

const priceOf = (model: string): [number, number, number, number] =>
  PRICES.find(([re]) => re.test(model.toLowerCase()))?.[1] ?? [4, 20, 0.2, 5]

export const costOf = (model: string, u: Usage): number => {
  const [i, o, r, w] = priceOf(model)
  return (
    ((u.input_tokens || 0) * i +
      (u.output_tokens || 0) * o +
      (u.cache_read_input_tokens || 0) * r +
      (u.cache_creation_input_tokens || 0) * w) /
    1e6
  )
}

// Haiku 4.5 and older have a 200k window; Haiku 5.5 and every other current model, 1M.
export const windowOf = (model: string): number => (/haiku/i.test(model) && !/haiku-5-5/i.test(model) ? 200_000 : 1_000_000)

// `savvy-careful`, or `savvy-flow:savvy-careful` when the agents ship in a plugin.
const bareType = (type: string): string => type.replace(/^[^:]*:/, '')

const isSavvy = (type: string): boolean => bareType(type).startsWith('savvy-')

const tierOf = (type: string): string => {
  const t = bareType(type).replace(/^savvy-/, '').toLowerCase()
  return t in TIER_COLOR && isSavvy(type) ? t : 'other'
}

const modelName = (id: string): string => {
  const m = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(id)
  const [, family = '', major = '', minor] = m ?? []
  if (!family) return id.replace(/^claude-/, '').replace(/\[.*\]$/, '') || '—'
  return `${family.charAt(0).toUpperCase()}${family.slice(1).toLowerCase()} ${major}${minor ? '.' + minor : ''}`
}

// A learned label's version as numbers (`Opus 5.5` → [5, 5]), to tell the newer of two apart.
const versionOf = (label: string): [number, number] => {
  const m = /(\d+)(?:\.(\d+))?$/.exec(label)
  return [Number(m?.[1] ?? 0), Number(m?.[2] ?? 0)]
}
const isNewer = (a: string, b: string): boolean => {
  const [x, y] = [versionOf(a), versionOf(b)]
  return x[0] !== y[0] ? x[0] > y[0] : x[1] > y[1]
}

// The engine exposes resolved run ids, but no API to resolve an arbitrary alias.
// An alias resolves to its family's newest model, so the newest id seen for a family
// names its planned label: a run pinned to an older one never relabels the alias.
export const learnClaudeModels = (known: Record<string, string>, ids: string[]): Record<string, string> => {
  const learned = { ...known }
  for (const id of ids) {
    const family = /(?:^|\b)(fable|mythos|opus|sonnet|haiku)-\d+/i.exec(id)?.[1]?.toLowerCase()
    const alias = family === 'mythos' ? 'fable' : family
    const label = alias ? modelName(id).replace(/^Mythos /, 'Fable ') : ''
    if (alias && (!learned[alias] || isNewer(label, learned[alias]))) learned[alias] = label
  }
  return learned
}

async function rememberClaudeModels($: EngineInterface, ids: string[]): Promise<void> {
  const prev = await read($, models)
  const claude = learnClaudeModels(prev.claude, ids)
  if (JSON.stringify(claude) !== JSON.stringify(prev.claude)) {
    await update($, models, hints => ({ ...hints, claude: learnClaudeModels(hints.claude, ids) }))
  }
}

// What a run shows as its model: a Codex relay names its intensity, not the
// Claude model relaying it (its cost and tokens stay the relay's own).
export const runModel = (a: AgentRun, withEffort = true, hints: ModelHints = EMPTY_MODELS): string => {
  const tier = tierOf(a.type)
  if (tier in CODEX_WEARS) return codexModel(tier, hints, a.codexModel, a.codexEffort, withEffort)
  if (tier in AGY_RELAYS) return relayModel(tier, a.geminiModel, a.geminiEffort, withEffort)
  return withEffort && a.effort ? `${modelName(a.model)} · ${a.effort}` : modelName(a.model)
}

const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// The unit is the one the value rounds to: 999_500 is 1.0M, not 1000k; 999.6 is 1k, not 1000.
export const fmtTokens = (n: number): string => {
  if (Math.round(n) < 1e3) return `${Math.round(n)}`
  return Math.round(n / 1e3) < 1e3 ? `${Math.round(n / 1e3)}k` : `${(n / 1e6).toFixed(1)}M`
}

const fmtCost = (usd: number): string => `$${usd < 10 ? usd.toFixed(2) : usd.toFixed(1)}`

const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

const elapsed = (a: AgentRun, at: number): number => (a.endedAt ?? Math.max(at, a.startedAt)) - a.startedAt

type Planned = PlannedTask & { n: number }

const plannedTier = (p: PlannedTask): string => (p.tier in TIER_COLOR ? p.tier : 'other')

// A planned task of no tier waits under its agent type's name, as its run will show.
const plannedName = (p: PlannedTask): string => {
  const tier = plannedTier(p)
  return tier === 'other' ? p.agent || tier : tier
}

// What a planned task will run on: the model and the effort its plan declares (the
// user's choice), its tier's otherwise. A Codex task names the predicted model but
// no effort: the user's effort for Codex is in its brief, which the bar never sees,
// and the plan's effort moves only the relay. Its run declares the effort it uses.
export const plannedModel = (p: PlannedTask, hints: ModelHints = EMPTY_MODELS): string => {
  const tier = plannedTier(p)
  const ofTier = TIER_MODEL[tier] ?? ''
  if (tier in CODEX_WEARS) return codexModel(tier, hints, undefined, undefined, false)
  if (tier in AGY_RELAYS) return relayModel(tier, undefined, undefined, false)
  const [model = '', effort = ''] = ofTier.split(' · ')
  const declared = p.model ? `${p.model.charAt(0).toUpperCase()}${p.model.slice(1)}` : model
  return [hints.claude[declared.toLowerCase()] || declared, p.effort ?? effort].filter(Boolean).join(' · ')
}

const plannedOf = (f: Flow | null, list: AgentRun[]): Planned[] => {
  if (!f || f.isFinished) return []
  const started = new Set(list.map(a => norm(a.description)))
  return (f.tasks ?? []).map((t, i) => ({ ...t, n: i + 1 })).filter(t => !started.has(norm(t.title)))
}

// The finished runs leave the panel's Finished list; the rows stay, so the totals, the
// estimates and the planned tasks' matching still count them. A run that runs again returns.
export const clearFinished = (list: AgentRun[]): AgentRun[] =>
  list.map(a => (a.status !== 'running' && !a.isCleared ? { ...a, isCleared: true } : a))

const isShown = (a: AgentRun): boolean => a.status === 'running' || !a.isCleared

export const totals = (list: AgentRun[], at: number, usage: UsageReadings = EMPTY_USAGE) => {
  // Every engine request is Claude's, including the relay around Codex.
  const knownClaude = list.some(hasClaudeUsage)
  const claude = { cost: knownClaude ? list.reduce((s, a) => s + a.costUsd, 0) : undefined,
    tokens: knownClaude ? list.reduce((s, a) => s + a.tokens, 0) : undefined }
  const codex: { cost: number | undefined; tokens: number | undefined } = { cost: undefined, tokens: undefined }
  const sessions = new Map<string, { tokens: number; cost?: number }>()
  for (const a of list) {
    const status = a.codexStatus && usage.statuses[a.codexStatus]
    if (!(tierOf(a.type) in CODEX_WEARS) || !status || !status.sessionId) continue
    const own = codexAccount(a, usage)
    const previous = sessions.get(status.sessionId)
    if (own.tokens !== undefined && (!previous || own.tokens >= previous.tokens)) sessions.set(status.sessionId, { tokens: own.tokens, cost: own.cost })
  }
  for (const own of sessions.values()) {
    codex.tokens = (codex.tokens ?? 0) + own.tokens
    if (own.cost !== undefined) codex.cost = (codex.cost ?? 0) + own.cost
  }
  // Gemini likewise: the largest cumulative snapshot of each conversation, counted once.
  const gemini: { cost: number | undefined; tokens: number | undefined } = { cost: undefined, tokens: undefined }
  const conversations = new Map<string, number>()
  for (const a of list) {
    const status = a.geminiStatus && usage.geminiStatuses?.[a.geminiStatus]
    if (!(tierOf(a.type) in GEMINI_WEARS) || !status || !status.sessionId) continue
    const own = geminiAccount(a, usage).tokens
    if (own !== undefined && own >= (conversations.get(status.sessionId) ?? -1)) conversations.set(status.sessionId, own)
  }
  for (const tokens of conversations.values()) gemini.tokens = (gemini.tokens ?? 0) + tokens
  // The Antigravity Claude and GPT relays likewise, on their own line: another quota.
  const agy: { cost: number | undefined; tokens: number | undefined } = { cost: undefined, tokens: undefined }
  const agyConversations = new Map<string, number>()
  for (const a of list) {
    const status = a.geminiStatus && usage.geminiStatuses?.[a.geminiStatus]
    if (!(tierOf(a.type) in AGY_WEARS) || !status || !status.sessionId) continue
    const own = geminiAccount(a, usage).tokens
    if (own !== undefined && own >= (agyConversations.get(status.sessionId) ?? -1)) agyConversations.set(status.sessionId, own)
  }
  for (const tokens of agyConversations.values()) agy.tokens = (agy.tokens ?? 0) + tokens
  const start = Math.min(...list.map(a => a.startedAt))
  const end = Math.max(...list.map(a => a.endedAt ?? Math.max(at, a.startedAt)))
  // Codex shows only where it is used: a Codex worker in the list or a Codex plan reading.
  const showsCodex = list.some(a => tierOf(a.type) in CODEX_WEARS) || hasPlan(usage.codex)
  const showsGemini = list.some(a => tierOf(a.type) in GEMINI_WEARS) || hasPlan(usage.gemini)
  const showsAgy = list.some(a => tierOf(a.type) in AGY_WEARS)
  return { claude, codex, gemini, agy, showsCodex, showsGemini, showsAgy, time: list.length ? end - start : 0 }
}

const knownCost = (cost?: number): string => cost === undefined ? '—' : fmtCost(cost)
const knownTokens = (tokens?: number): string => tokens === undefined ? '—' : fmtTokens(tokens)
const codexCost = (t: ReturnType<typeof totals>): string => t.showsCodex ? `Codex ${knownCost(t.codex.cost)}` : ''
const codexTokens = (t: ReturnType<typeof totals>): string => t.showsCodex ? `Codex ${knownTokens(t.codex.tokens)}` : ''
const geminiCost = (t: ReturnType<typeof totals>): string => t.showsGemini ? `Gemini ${knownCost(t.gemini.cost)}` : ''
const geminiTokens = (t: ReturnType<typeof totals>): string => t.showsGemini ? `Gemini ${knownTokens(t.gemini.tokens)}` : ''
const agyCost = (t: ReturnType<typeof totals>): string => t.showsAgy ? `Agy ${knownCost(t.agy.cost)}` : ''
const agyTokens = (t: ReturnType<typeof totals>): string => t.showsAgy ? `Agy ${knownTokens(t.agy.tokens)}` : ''
// The relays' families, on the line beneath Claude's.
const relayCosts = (t: ReturnType<typeof totals>): string => [codexCost(t), geminiCost(t), agyCost(t)].filter(Boolean).join(' · ')
const relayTokens = (t: ReturnType<typeof totals>): string => [codexTokens(t), geminiTokens(t), agyTokens(t)].filter(Boolean).join(' · ')
const familyCosts = (t: ReturnType<typeof totals>) => [`Claude ${knownCost(t.claude.cost)}`, relayCosts(t)].filter(Boolean).join(' · ')
const familyTokens = (t: ReturnType<typeof totals>) => [`Claude ${knownTokens(t.claude.tokens)}`, relayTokens(t)].filter(Boolean).join(' · ')

// --- desktop drawings: each row is one SVG, as the band above the prompt is.

const PANE_CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tile{fill:#f4f3f0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.k{fill:#2c2c2b}.ln{stroke:#333331}.tile{fill:#262625}}
.live{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.3}}
@media (prefers-reduced-motion: reduce){.live{animation:none}}
</style>`

// Pure CSS, run by the compositor: no redraws. Periods divide one second, so the
// once-a-second redraw of a running row restarts them in phase. Every crab walks;
// each costume adds its prop's own motion on top.
const CRAB_CSS = `<style>
.run .la{animation:st .5s steps(1) infinite}.run .lb{animation:st .5s steps(1) infinite -.25s}
.run .bd{animation:bob .5s steps(1) infinite -.125s}
.run g{transform-box:fill-box}
@keyframes st{50%{transform:translateY(-1px)}}@keyframes bob{50%{transform:translateY(1px)}}
.c-fable.run{animation:float 1s ease-in-out infinite}
.c-fable.run .la,.c-fable.run .lb,.c-fable.run .bd{animation:none}
.c-fable.run .ant{animation:blink 1s steps(1) infinite}
.c-fable.run .star{animation:blink .5s steps(1) infinite -.25s}
@keyframes float{50%{transform:translateY(-2px)}}@keyframes blink{50%{opacity:.15}}
.c-heavy.run .it{animation:scan 1s steps(1) infinite}
.c-heavy.run .gl{animation:blink 1s steps(1) infinite -.5s}
@keyframes scan{25%{transform:translate(-1px,1px)}50%{transform:translate(-2px,2px)}75%{transform:translate(-1px,1px)}}
.c-careful.run .it{transform-origin:100% 100%;animation:twist .5s ease-in-out infinite}
@keyframes twist{50%{transform:rotate(-35deg)}}
.c-medium.run .pan{transform-origin:0 50%;animation:tilt 1s ease-in-out infinite}
.c-medium.run .egg{animation:flip 1s ease-in-out infinite}
@keyframes tilt{20%,40%{transform:rotate(-12deg)}}@keyframes flip{30%{transform:translateY(-5px) scaleY(-1)}60%{transform:translateY(0)}}
.c-light.run .la{animation-duration:.25s}.c-light.run .lb{animation-duration:.25s;animation-delay:-.125s}
.c-light.run .flag{transform-origin:0 50%;animation:wave .25s steps(1) infinite}
@keyframes wave{50%{transform:skewY(-12deg) scaleX(.85)}}
.c-explore.run .it{transform-origin:50% 100%;animation:fence .5s ease-in-out infinite}
@keyframes fence{50%{transform:rotate(25deg)}}
@media (prefers-reduced-motion: reduce){.run,.run g{animation:none!important}}
</style>`

// The classic costumes, one per tier (the sprite itself is in `sprite.ts`).
const COSTUMES: Record<string, (f: Fill, t: string) => void> = {
  // Fable: astronaut in a glass dome; floats instead of walking, the antenna and the star blink.
  fable: (f, t) => {
    crabBody(f)
    f(6, 7, 18, 1, '#E6E8EE'); f(5, 8, 1, 14, '#E6E8EE'); f(24, 8, 1, 14, '#E6E8EE'); f(6, 22, 18, 1, '#C9CCD2')
    f(6, 8, 18, 14, 'rgba(169,214,245,.32)'); f(8, 9, 2, 1, '#fff'); f(8, 10, 1, 2, '#fff')
    f(14, 4, 2, 3, '#C9CCD2'); f(14, 2, 2, 2, t, 'ant'); f(13, 18, 4, 2, t)
    f(27, 3, 1, 3, '#F5C542', 'star'); f(26, 4, 3, 1, '#F5C542', 'star')
  },
  // Heavy: detective with a deerstalker; the magnifier sweeps and glints.
  heavy: (f, t) => {
    crabBody(f, -4, 'it')
    stamp(f, 6, 3, ['......bbbbbb......', '....bbcbbcbbbb....', '...bbbbbbbbbbbb...', '..bcbbcbbcbbcbbb..', '.bbbbbbbbbbbbbbbb.', 'dddddddddddddddddd'], { b: '#7A4A26', c: '#A0703F', d: '#5A3519' })
    f(6, 9, 18, 1, t)
    stamp(f, 23, 1, ['.kkk.', 'k...k', 'k...k', 'k...k', '.kkk.'], { k: '#3A3A3C' }, 'it')
    f(24, 2, 3, 3, 'rgba(169,214,245,.7)', 'it'); f(25, 6, 1, 4, '#7A4A26', 'it'); f(24, 2, 1, 1, '#fff', 'gl')
  },
  // Careful: engineer in a hard hat; the wrench turns a bolt.
  careful: (f, t) => {
    crabBody(f)
    stamp(f, 6, 4, ['.....yyyyyyyy.....', '...yyyyyhhyyyyy...', '..yyyyyyhhyyyyyy..', '..yyyyyyhhyyyyyy..', '.yyyyyyyhhyyyyyyy.', 'dddddddddddddddddd'], { y: '#F5C542', h: '#FBE08A', d: '#C99A1E' })
    f(13, 5, 4, 2, t)
    stamp(f, 0, 10, ['.s.s', 'sss.', '.s..', '.s..'], { s: '#8E929A' }, 'it')
  },
  // Medium: chef, the toque traced from DockCrab's Sprites.chefHat; tosses the omelette.
  medium: (f, t) => {
    crabBody(f, -4, 'pan')
    stamp(f, 6, 0, ['........lll.......', '.......lllll......', '.wwwwgwwwwwwgwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwgwwwwwggwwwww', '.wwwwgwwwwwggwwwww', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.'], { w: '#F4F3EE', l: '#F7F6F2', g: '#D2D1C8', b: t, d: '#B45F43' })
    f(22, 8, 7, 2, '#4A4A48', 'pan'); f(26, 10, 1, 1, '#4A4A48', 'pan'); f(24, 7, 3, 1, '#F5B731', 'egg')
  },
  // Light: racer in a helmet; runs at double pace, the checkered flag flutters.
  light: (f, t) => {
    crabBody(f, -4)
    stamp(f, 6, 5, ['....rrrrrrrrrr....', '..rrrrrrwwrrrrrr..', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.kkkkkkkkkkkkkkkkr'], { r: t, w: '#F8F6F1', k: INK })
    f(25, 1, 1, 9, '#8E929A')
    stamp(f, 26, 1, ['wkwk', 'kwkw', 'wkwk'], { w: '#F8F6F1', k: INK }, 'flag')
  },
  // Explore: pirate scouting the code; the cutlass fences.
  explore: f => {
    crabBody(f)
    stamp(f, 5, 3, ['.kk..............kk.', '.kkk....kkkk....kkk.', '..kkkkkkkwwkkkkkkk..', '..kkkkkkkkkkkkkkkk..', '.gggggggggggggggggg.'], { k: '#55514C', w: '#F8F6F1', g: '#F5C542' })
    f(7, 11, 11, 1, INK); f(18, 11, 4, 3, INK)
    f(27, 6, 1, 9, '#C9CCD2', 'it'); f(26, 15, 3, 1, '#7A4A26', 'it')
  },
  other: f => crabBody(f),
}

// A theme's CSS rides on the classic crab's.
export const figureCss = (dress: Dress | null = dressOf() ?? null): string => (dress ? CRAB_CSS + THEME_CSS + dress.css : CRAB_CSS)

const crabCss = (): string => figureCss()

const costumeOf = (type: string): string => (type === 'Explore' ? 'explore' : tierOf(type))

const CRAB_SCALE = 1.1

// Body and props nest inside `bd` so a prop rides the bob and adds its own motion;
// legs stay outside it and step on their own.
// In a theme every figure moves: a running one at full pace, any other idles.
// A Codex or Gemini figure wears its tier's costume and moves as that tier does.
const crab = (x: number, y: number, costume: string, dim = false, isWalking = false, scale = CRAB_SCALE, dress: Dress | null = dressOf() ?? null): string => {
  const { f, groups } = pixels()
  const wears = wornBy(costume)
  const figure = wears ?? costume
  const themed = dress && costumeIn(dress, figure)
  const draw = themed ?? COSTUMES[figure] ?? ((g: Fill) => crabBody(g))
  if (costume in CODEX_WEARS) {
    withBody(codexBody, () => draw(f, colorOf(costume)))
    codexBadge(f, costume.replace(/^codex-/, ''), colorOf(costume))
  } else if (costume in GEMINI_WEARS) {
    withBody(geminiBody, () => draw(f, colorOf(costume)))
    geminiBadge(f, costume.replace(/^gemini-/, ''), colorOf(costume))
  } else draw(f, colorOf(costume))
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => k !== 'bd' && k !== 'la' && k !== 'lb')
  const body = `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>`
  const motion = isWalking ? ' run' : themed ? ' idle' : ''
  const cls = themed && dress ? `${dress.prefix}-${figure}` : figure
  return `<g transform="translate(${x},${y}) scale(${scale})" opacity="${dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="c-${cls}${motion}">${body}${group('la')}${group('lb')}</g></g>`
}

// One figure at the origin in a theme's dress (null: classic); its CSS is `figureCss`.
export const figureSvg = (figure: string, dress: Dress | null, isWalking = false, scale = CRAB_SCALE): string =>
  crab(0, 0, figure, false, isWalking, scale, dress)

const statusMark = (x: number, y: number, status: string, color: string): string => {
  if (status === 'running') return `<circle class="live" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`
  if (status === 'done') return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="#3B9C5F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  if (status === 'failed') return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="#D0453F" stroke-width="1.8" stroke-linecap="round"/>`
  return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#9a9a96" stroke-width="1.4"/><path d="M${x} ${y - 2.5}v2.8l1.8 1.2" fill="none" stroke="#9a9a96" stroke-width="1.4" stroke-linecap="round"/>`
}

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${PANE_CSS}${crabCss()}${body}</svg>`

// The pane's own title already says "Agents": the header names the flow, if any.
const tile = (x: number, y: number, width: number, height: number, label: string, body: string): string =>
  `<rect class="tile" x="${x}" y="${y}" width="${width}" height="${height}" rx="8"/>
<text class="s" x="${x + 9}" y="${y + 16}" font-family="${FONT}" font-size="11">${xml(label)}</text>${body}`

type PlanMarker = { text: string; color?: string }

const tileValue = (x: number, y: number, width: number, value: string, bold = true, suffix = '', marker?: PlanMarker): string =>
  `<text class="t" x="${x + PLAN_TEXT_INSET}" y="${y}" font-family="${FONT}" font-size="${PLAN_TEXT_SIZE}"${bold ? ' font-weight="600"' : ''} font-variant-numeric="tabular-nums">${xml(fitText(value, PLAN_TEXT_SIZE, width - PLAN_TEXT_INSET * 2 - textWidth((marker?.text ?? '') + suffix, PLAN_TEXT_SIZE)))}${marker ? `<tspan${marker.color ? ` fill="${marker.color}"` : ''}>${xml(marker.text)}</tspan>` : ''}${suffix ? `<tspan class="s" font-weight="400">${xml(suffix)}</tspan>` : ''}</text>`

const readingAge = (readAt: number, at: number, language: Lang): string =>
  STRINGS[language].ago(Math.max(0, Math.floor((at - readAt) / 60_000)))

type PlanFormat = { locale?: string; timeZone?: string; lang?: Lang }
type PlanTileOptions = PlanFormat & { policy?: BudgetPolicy; history?: PlanHistory }

// Six days avoids an ambiguous repeated weekday, including across DST changes.
const PLAN_WEEKDAY_HORIZON_MS = 6 * 24 * 60 * MINUTE_MS
const formatPlanTimestamp = (timestamp: string, weekly: boolean, at: number, options?: PlanFormat): string => {
  const reset = new Date(timestamp)
  if (!Number.isFinite(reset.getTime())) return ''
  const timeZone = options?.timeZone
  const time = reset.toLocaleTimeString(options?.locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone })
  const day = weekly ? reset.toLocaleDateString(options?.locale, reset.getTime() - at > PLAN_WEEKDAY_HORIZON_MS
    ? { day: 'numeric', month: 'short', timeZone } : { weekday: 'short', timeZone }) + ' ' : ''
  return `${day}${time}`
}

export const formatPlanReset = (value: PlanUsage['fiveHour'], weekly: boolean, at: number, options?: PlanFormat): string => {
  if (!value?.resetsAt || isReset(value, at)) return ''
  const time = formatPlanTimestamp(value.resetsAt, weekly, at, options)
  return time ? `↻ ${time}` : ''
}

const projectionMarker = (projection: PlanProjection | undefined, policy: BudgetPolicy, at: number, options?: PlanFormat): PlanMarker | undefined => {
  if (!projection) return undefined
  if (projection.fits) return { text: `  → ${Math.round(projection.projectedAtReset)}%` }
  return projection.exhaustsAt ? { text: `  100% ↯ ${formatPlanTimestamp(projection.exhaustsAt, true, at, options)}`,
    color: policy === 'full' ? BUDGET_AMBER : BUDGET_RED } : undefined
}

export const planTile = (x: number, y: number, width: number, name: string, plan: PlanUsage | undefined, color: string, at: number, readAt?: number, options?: PlanTileOptions): string => {
  const s = STRINGS[options?.lang ?? 'en']
  const age = readAt === undefined ? '' : ` · ${readingAge(readAt, at, options?.lang ?? 'en')}`
  const policy = options?.policy ?? DEFAULT_POLICY
  const window = (label: string, key: PlanWindowKey, value: PlanUsage['fiveHour'], offset: number): string => {
    const resetWindow = isReset(value, at)
    const percentUsed = resetWindow ? 0 : value?.percentUsed
    const percent = value ? `${label}  ${percentUsed}%${resetWindow ? ` ${s.windowReset}` : ''}` : `${label}  —`
    const formattedReset = formatPlanReset(value, key === 'week', at, options)
    const time = formattedReset ? `  ${formattedReset}` : ''
    const suffix = value ? age : ''
    const available = width - PLAN_TEXT_INSET * 2
    const candidate = isStale(readAt, at) ? undefined : projectionMarker(projectPlanWindow(value, key, at, options?.history?.[key]), policy, at, options)
    // Drop the projection first; keep the existing reset and reading age whenever they fit.
    const marker = candidate && textWidth(percent + time + candidate.text + suffix, PLAN_TEXT_SIZE) <= available ? candidate : undefined
    const text = textWidth(percent + time + suffix, PLAN_TEXT_SIZE) <= available ? percent + time : percent
    const meterW = width - 18
    return tileValue(x, y + offset, width, text, true, suffix, marker) + (value
      ? `<rect class="k" x="${x + 9}" y="${y + offset + 6}" width="${meterW}" height="4" rx="2"/><rect x="${x + 9}" y="${y + offset + 6}" width="${meterW * Math.min(100, Math.max(0, percentUsed!)) / 100}" height="4" rx="2" fill="${percentUsed! >= 90 ? '#D0453F' : color}"/>` : '')
  }
  return tile(x, y, width, 82, `${name} · ${s.planWord} · ${s.policy[policy]}`, hasPlan(plan)
    ? window(s.fiveHour, 'fiveHour', plan?.fiveHour, 33) + window(s.week, 'week', plan?.week, 62)
    : tileValue(x, y + 33, width, '—'))
}

const headerSvg = (W: number, title: string, t: ReturnType<typeof totals>, at: number, usage: UsageReadings): string => {
  const s = tr()
  const dress = dressOf()
  const fitted = fitText(title, 14, dress ? W - 64 : W)
  // The theme's weather falls right of the title, short of the ornament.
  const weather = title ? (dress?.weather?.(Math.ceil(textWidth(fitted, 14)) + 12, W - 30, at) ?? '') : ''
  const gap = 6
  const tw = (W - gap * 2) / 3
  const top = title ? 28 : 0
  const metricTile = (i: number, k: string, v: string, second = '') => {
    const x = i * (tw + gap)
    return tile(x, top, tw, 56, k, tileValue(x, top + 33, tw, v) + (second ? tileValue(x, top + 48, tw, second, false) : ''))
  }
  // Only a family with a reading gets a tile: a lone family (no Codex) spans the row. Tiles go two to a row;
  // a third family starts a row of its own, which it spans.
  const families = planFamilies(usage)
  const stacked = W < 360 || families.length < 2
  const planW = stacked ? W : (W - gap) / 2
  const plans = families.map(([name, plan, color, readAt, family], i) => {
    const row = stacked ? i : Math.floor(i / 2), column = stacked ? 0 : i % 2
    const spans = !stacked && column === 0 && i === families.length - 1
    return planTile(column * (planW + gap), top + 62 + 88 * row, spans ? W : planW, name, plan, color, at, readAt,
      { policy: budgetPolicy(usage, family), history: usage.history?.[family], lang, locale: LOCALE[lang] })
  }).join('')
  return svg(
    W,
    headerHeight(title, W, usage),
    `${weather}${title ? `<text class="t" x="0" y="15" font-family="${FONT}" font-size="14" font-weight="600">${xml(fitted)}</text>` : ''}
${title ? (dress?.ornament(W) ?? '') : ''}
${metricTile(0, s.cost + ' ≈', `Claude ${knownCost(t.claude.cost)}`, relayCosts(t))}${metricTile(1, s.tokens, `Claude ${knownTokens(t.claude.tokens)}`, relayTokens(t))}${metricTile(2, s.time, fmtTime(t.time))}${plans}`,
  )
}

type PlanRow = [string, PlanUsage | undefined, string, number | undefined, PlanFamily]

const planFamilies = (usage: UsageReadings): PlanRow[] =>
  ([['Claude', usage.claude, CLAY, usage.claudeReadAt, 'claude'], ['Codex', usage.codex, colorOf('codex-sol'), usage.codexReadAt, 'codex'],
    ['Gemini', usage.gemini, colorOf('gemini-hydrogen'), usage.geminiReadAt, 'gemini'],
    ['Agy Claude/GPT', usage.agy, colorOf('agy-opus'), usage.agyReadAt, 'agy']] as PlanRow[])
    .filter(([, plan]) => hasPlan(plan))

const headerHeight = (title: string, W: number, usage: UsageReadings): number => {
  const tiles = planFamilies(usage).length
  return (title ? 88 : 60) + (tiles === 0 ? 0 : 88 * (W < 360 ? tiles : Math.ceil(tiles / 2)))
}

// The task's own progress when the worker reports steps; a finished run is full.
// A worker's own count as its row reads it: the steps it left undone stand beside
// the count, so 6/6 with one skipped is not taken for 6/6.
const stepCount = (a: AgentRun): string =>
  a.stepTotal ? `${a.stepDone ?? 0}/${a.stepTotal}${a.stepSkipped ? ` · ${a.stepSkipped} ${a.stepSkipped === 1 ? tr().skippedOne : tr().skipped}` : ''}` : ''

// A worker whose own count is still open: it declared steps and has not closed them (done below total).
const isCountOpen = (a: AgentRun): boolean => !!a.stepTotal && (a.stepDone ?? 0) < a.stepTotal

// A finished run whose worker never closed its count: neither work under way nor work missing, so the row
// says the count was left open, in a neutral colour, instead of a stale note of a step in progress.
export const isCountLeftOpen = (a: AgentRun): boolean => a.status === 'done' && !a.pendingCompletion && isCountOpen(a)

// A tool call shows on its worker's row once it has lasted this long: a long command reads
// as work under way, with its time, between the worker's own step calls.
const ACTIVITY_AFTER_MS = 30_000
const ACTIVITY_MAX = 60

// What a tool call is doing, in a few words: its own description, a file by its name (a
// Windows path too), a pattern, or a command's program; an MCP tool by its own name.
export const activityOf = (e: Record<string, unknown>): string => {
  const tool = typeof e.tool === 'string' ? e.tool : ''
  const text = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')
  const name = tool.startsWith('mcp__') ? tool.split('__').slice(2).join('__') || tool : tool
  const file = text(e.file_path) || text(e.notebook_path)
  const what = text(e.description) || (file ? file.split(/[\\/]/).filter(Boolean).pop() ?? file : '') ||
    text(e.pattern) || text(e.command).split(' ')[0]
  return (what ? `${name}: ${what}` : name).slice(0, ACTIVITY_MAX)
}

// The row's step line: the worker's count and its note, or the tool call it has been in
// for a while with its time, or how long it has been parked on its own background work;
// a worker that reported with work still in the background says so.
const stepLine = (a: AgentRun, at: number): string => {
  const isLong = a.status === 'running' && !!a.activity && a.activityAt !== undefined && at - a.activityAt >= ACTIVITY_AFTER_MS
  const isParked = a.status === 'running' && a.isWaiting === true && !a.isHandedBack && a.waitingSince !== undefined
  const note = isLong ? `${a.activity} · ${fmtTime(at - a.activityAt!)}`
    : isParked ? `${tr().waitingBackground} · ${fmtTime(at - a.waitingSince!)}`
    : isCountLeftOpen(a) ? tr().countOpen : a.stepNote
  return [a.stepTotal ? stepCount(a) : '', note, a.isHandedBack && a.leftBackground ? tr().leftBackground : '']
    .filter(Boolean).join(' · ')
}

export const progressOf = (a: AgentRun): number | null => {
  const waiting = a.codexState === 'running' || a.geminiState === 'running' || a.isWaiting || a.pendingCompletion
  if (a.stepTotal) return Math.min(waiting ? RUNNING_CAP : 1, (a.stepDone ?? 0) / a.stepTotal)
  if (waiting) return 0
  return a.status === 'done' ? 1 : null
}

const ctxOf = (a: AgentRun): number => (a.contextMax ? Math.min(100, Math.round((a.contextTokens / a.contextMax) * 100)) : 0)

const agentSvg = (W: number, a: AgentRun, at: number, hints: ModelHints, usage: UsageReadings): string => {
  const s = tr()
  const tier = tierOf(a.type)
  const color = colorOf(tier)
  const ctx = ctxOf(a)
  const textW = W - 42 - 22
  const meta = [runModel(a, true, hints)]
  if (a.round > 1) meta.push(`${s.round} ${a.round}`)
  if (a.status === 'failed') meta.push(s.failed)
  const barW = textW
  const progress = progressOf(a)
  const stats = rowStats(a, usage, at)
  const steps = stepLine(a, at)
  const stepsW = Math.max(0, barW - textWidth(stats, 11) - 12)
  // Without reported steps the bar falls back to the context, drawn grey.
  const fillW = Math.round(barW * (progress ?? ctx / 100))
  const isNeutral = progress === null || isCountLeftOpen(a)
  return svg(
    W,
    66,
    `${crab(0, 14, costumeOf(a.type), false, a.status === 'running')}
<text class="t" x="42" y="18" font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(a.description || a.type, 13, textW))}</text>
<text x="42" y="34" font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(tier === 'other' ? a.type : tier)}</tspan><tspan class="s">  ${xml(meta.join('  ·  '))}</tspan></text>
${steps && stepsW > 30 ? `<text class="${isCountLeftOpen(a) ? 's' : 't'}" x="42" y="49" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(fitText(steps, 11, stepsW))}</text>` : ''}
<text class="s" x="${42 + barW}" y="49" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${stats}</text>
<rect class="k" x="42" y="55" width="${barW}" height="4" rx="2"/><rect${isNeutral ? ' class="m"' : ''} x="42" y="55" width="${fillW}" height="4" rx="2"${isNeutral ? '' : ` fill="${color}"`}/>
${statusMark(W - 8, 16, a.status, color)}
<line class="ln" x1="0" y1="65.5" x2="${W}" y2="65.5"/>`,
  )
}

const plannedSvg = (W: number, p: Planned, hints: ModelHints): string => {
  const tier = plannedTier(p)
  const color = colorOf(tier)
  const textW = W - 42 - 22
  const meta = [plannedModel(p, hints)]
  if (p.after.length) meta.push(`${tr().after} ${p.after.join(', ')}`)
  return svg(
    W,
    46,
    `${crab(0, 6, tier, true)}
<text class="s" x="42" y="18" font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(`${p.n}. ${p.title}`, 13, textW))}</text>
<text x="42" y="34" font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(plannedName(p))}</tspan><tspan class="m">  ${xml(meta.filter(Boolean).join('  ·  '))}</tspan></text>
${statusMark(W - 8, 16, 'planned', color)}
<line class="ln" x1="0" y1="45.5" x2="${W}" y2="45.5"/>`,
  )
}

const compactSvg = (W: number, list: AgentRun[], planned: Planned[], t: ReturnType<typeof totals>, usage: UsageReadings, at: number): string => {
  const icons = [
    ...list.filter(a => a.status === 'running').map(a => ({ k: costumeOf(a.type), c: colorOf(tierOf(a.type)), s: 'running', dim: false })),
    ...list.filter(a => a.status !== 'running').map(a => ({ k: costumeOf(a.type), c: colorOf(tierOf(a.type)), s: a.status, dim: false })),
    ...planned.map(p => ({ k: plannedTier(p), c: colorOf(p.tier), s: 'planned', dim: true })),
  ]
  const fit = Math.max(1, Math.floor((W - 150) / 36))
  const shown = icons.slice(0, fit)
  const more = icons.length - shown.length
  const body = shown
    .map((ic, i) => crab(i * 36, 0, ic.k, ic.dim, ic.s === 'running') + (ic.s === 'running' ? `<circle class="live" cx="${i * 36 + 32}" cy="4" r="3" fill="${ic.c}"/>` : ''))
    .join('')
  const x = shown.length * 36 + (more ? 4 : 0)
  return svg(
    W,
    compactHeight(usage),
    `${body}${more ? `<text class="s" x="${x}" y="21" font-family="${FONT}" font-size="12">+${more}</text>` : ''}
<text class="s" x="0" y="48" font-family="${FONT}" font-size="11">≈ ${xml(familyCosts(t))}</text>
<text class="s" x="0" y="64" font-family="${FONT}" font-size="11">${xml(familyTokens(t))} · ${fmtTime(t.time)}</text>
${hasPlans(usage) ? `<text class="s" x="0" y="80" font-family="${FONT}" font-size="11">${xml(fitText(planUsageText(usage, at), 11, W))}</text>` : ''}`,
  )
}

const compactHeight = (usage: UsageReadings): number => hasPlans(usage) ? 84 : 68

// --- terminal drawing: the same rows in text.

const ctxBar = (pct: number, width: number): string => {
  const filled = Math.round((width * pct) / 100)
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

const STATUS_GLYPH: Record<string, string> = { running: '●', done: '✓', failed: '✗', planned: '◷' }

// Opens the agents pane, or closes it when it is up; true when it ends up open.
async function togglePane($: EngineInterface): Promise<boolean> {
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (isOpen) {
    await $.ui.close({ id: PANE })
    return false
  }
  const at = await $.clock.now()
  await update($, now, () => at)
  // A panel opened afresh has no picker with the focus.
  await update($, picking, () => 0)
  await showPanel($)
  await $.ui.open({ id: PANE, title: tr().pane })
  return true
}

async function autoOpen($: EngineInterface, key: string): Promise<void> {
  const p = await read($, panel)
  if (p.autoOpenedFor === key) return
  await update($, panel, prev => ({ ...prev, autoOpenedFor: key }))
  if (!(await $.ui.panes()).some(p => p.id === PANE)) await update($, picking, () => 0)
  void $.ui.open({ id: PANE, title: tr().pane })
}

// ---------------------------------------------------------------------------
// Reconcile: an answered turn can leave its worker waiting on background work.
// The roster confirms its finish and settles ghosts lost to a kill or reload.

const LIST_EVERY_MS = 5000

const ENDED: Partial<Record<AgentInfo['status'], AgentRun['status']>> = {
  completed: 'done',
  idle: 'done', // between turns: its turn ended; a later step marks it running again.
  failed: 'failed',
  killed: 'failed',
}

// `listedAt` is when the list was asked for: a run started since may not be in it yet.
const reconciled = (list: AgentRun[], infos: AgentInfo[], listedAt: number, usage: UsageReadings): AgentRun[] => {
  const statusOf = new Map(infos.map((i): [string, AgentInfo['status']] => [i.id, i.status]))
  const unique = new Map<string, AgentRun>()
  for (const a of list) {
    const key = a.agentId || a.id
    const previous = unique.get(key)
    if (!previous || a.startedAt >= previous.startedAt) unique.set(key, a)
  }
  return [...unique.values()].map((a): AgentRun => {
    let relay = isRelayed(a) ? { ...a, status: a.relayStatus ?? a.status, endedAt: a.relayEndedAt ?? a.endedAt } : a
    const listed = relay.agentId && statusOf.get(relay.agentId)
    // A worker that handed back its report is done, whatever the roster still holds
    // for it: a command it left in the background keeps it `waiting` for as long as
    // that command lives. The row says so instead of running on as a ghost.
    if (relay.isHandedBack && relay.status !== 'failed') {
      relay = { ...relay, status: 'done', endedAt: relay.endedAt ?? listedAt, isWaiting: undefined, waitingSince: undefined,
        pendingCompletion: undefined, leftBackground: listed === 'waiting' || undefined }
    } else if (listed === 'waiting' && relay.status !== 'failed') {
      relay = { ...relay, status: 'running', endedAt: undefined, isWaiting: true, waitingSince: relay.waitingSince ?? listedAt,
        pendingCompletion: undefined }
    } else if (relay.status === 'running') {
      const settled = (status: AgentRun['status']): AgentRun => ({ ...relay, status, endedAt: listedAt,
        isWaiting: undefined, waitingSince: undefined, pendingCompletion: undefined })
      // A just-ended turn may have been evicted already, or be a workflow agent
      // absent from this roster. Its answer still settles it in that case.
      if (listed === undefined && relay.pendingCompletion) relay = settled('done')
      else if (!relay.agentId || (listed === undefined && !relay.isWorkflow && relay.startedAt < listedAt)) relay = settled('failed')
      else if (listed && ENDED[listed]) relay = settled(ENDED[listed]!)
    }
    return isRelayed(a) ? relayRun({ ...relay, relayStatus: relay.status, relayEndedAt: relay.endedAt }, usage, listedAt) : relay
  })
}

// The bar's faint layer: the plan's workers running now, as the agents list says. A
// savvy worker is one; so is an agent of any other type running a task of the plan.
// Beside it, the ids of every run the list holds as running, of any type, written only
// when that set changes: the panel reads them to never draw a copy that lacks one.
async function syncRunning($: EngineInterface): Promise<void> {
  const f = await read($, flow)
  const tasks = new Set((f?.tasks ?? []).map(t => norm(t.title)))
  const list = await read($, agents)
  const running = list.filter(a => a.status === 'running' && (isSavvy(a.type) || tasks.has(norm(a.description)))).length
  if (f && f.running !== running) await update($, flow, prev => (prev ? { ...prev, running } : prev))
  const ids = list.filter(a => a.status === 'running').map(a => a.id).sort()
  if (JSON.stringify(await read($, runningIds)) !== JSON.stringify(ids)) await update($, runningIds, () => ids)
}

// A run whose spawn answered no agentId is keyed on its Agent call's tool_use_id,
// and its loop's events, matched by agentId, would never reach it. The Agent
// call's own record names the agent (`agentId`, or `agent_id` in its older
// spelling): the row takes it, and a record of a run already over settles it.
async function adoptAgentId($: EngineInterface, toolUseId: string | undefined, result: unknown): Promise<void> {
  if (!toolUseId || typeof result !== 'object' || result === null) return
  const record = result as { agentId?: unknown; agent_id?: unknown; status?: unknown }
  const agentId = typeof record.agentId === 'string' && record.agentId ? record.agentId : typeof record.agent_id === 'string' ? record.agent_id : ''
  if (!agentId) return
  const list = await read($, agents)
  if (!list.some(a => a.id === toolUseId && !a.agentId) || list.some(a => a.agentId === agentId)) return
  const at = await $.clock.now()
  await update($, agents, rows =>
    rows.map(a =>
      a.id !== toolUseId || a.agentId
        ? a
        : { ...a, agentId, ...(record.status === 'completed' ? { status: 'done' as const, endedAt: at } : {}) },
    ),
  )
  await syncRunning($)
}

// Module scope is fine: a reload only makes the next tick reconcile at once.
let lastListAt = 0

// The effort an Agent call asks for, by its tool_use_id, while the call is under way:
// the spawn inside it does not carry it, and the engine names a run's effort only at
// its first model request. Module scope is fine: a reload in between leaves the row
// without an effort until that request.
const askedEffort = new Map<string, string>()

// Off by default. Preserve event keys/nesting and routing fields, not message bodies.
const resumeDebugShape = (value: unknown, key = '', depth = 0): unknown => {
  if (typeof value === 'string') return /^(tool|to|summary|description|agentId|parentAgentId|parentId|tool_use_id|turnId|name|model|subagentType|resumedAgentId|teammateId|plugin|tier|kind|hook_event_name|agent_id|agent_type|id|type|status|reason)$/.test(key)
    ? value.slice(0, 500) : { type: 'string', length: value.length }
  if (!value || typeof value !== 'object') return value
  if (depth >= 4) return { keys: Object.keys(value).slice(0, 40) }
  if (Array.isArray(value)) return value.slice(0, 8).map(v => resumeDebugShape(v, key, depth + 1))
  return Object.fromEntries(Object.entries(value).slice(0, 40).map(([k, v]) => [k, resumeDebugShape(v, k, depth + 1)]))
}

async function debugResume($: EngineInterface, event: string, received: unknown, decision: unknown = {}): Promise<void> {
  try {
    if (await $.env.get('SAVVY_PROGRESS_DEBUG_RESUME') !== '1') return
    $.ui.log(`[savvy-progress:resume-debug] ${JSON.stringify({ at: await $.clock.now(), event,
      received: resumeDebugShape(received), decision: resumeDebugShape(decision) })}`, { to: 'debug' })
  } catch { /* Diagnostics must never prevent a send or a resume. */ }
}

// SendMessage can reuse an agent directly, without an agent.spawn event.
// Consume its title on a new model turn, before requesting the model or usage.
async function beginQueuedTask($: EngineInterface, agentId: string, turnId: string, index: number): Promise<void> {
  const at = await $.clock.now()
  let applied = false
  await update($, agents, list => {
    applied = false
    return list.map(a => {
      if (a.agentId !== agentId) return a
      const isNewTurn = (a.relayStatus ?? a.status) !== 'running' || (index === 0 && a.turnId !== turnId)
      if (!a.nextTitle || !isNewTurn) return a.turnId === turnId ? a : { ...a, turnId }
      applied = true
      return { id: a.id, agentId: a.agentId, type: a.type, description: a.nextTitle,
        ...(a.name ? { name: a.name } : {}), model: a.model, ...(a.effort ? { effort: a.effort } : {}),
        round: norm(a.nextTitle) === norm(a.description) ? a.round + 1 : 1,
        turnId, status: 'running', startedAt: at, contextMax: a.contextMax, contextTokens: 0, tokens: 0, costUsd: 0, steps: 0,
        ...(a.isWorkflow ? { isWorkflow: true } : {}) }
    })
  })
  if (applied) {
    await update($, now, () => at)
    await syncRunning($)
    await showPanel($)
  }
}

async function reconcile($: EngineInterface, stoppingAgentId?: string): Promise<void> {
  const listedAt = await $.clock.now()
  lastListAt = listedAt
  const infos = await $.agent.list()
  if (stoppingAgentId) await debugResume($, 'agent.list:stop', infos.filter(a => a.id === stoppingAgentId || a.parentId === stoppingAgentId),
    { agentId: stoppingAgentId })
  const usage = await read($, usageReadings)
  await update($, agents, list => reconciled(list, infos, listedAt, usage))
  await syncRunning($)
}

const describeBudgetPolicies = (usage: UsageReadings, at: number): string => {
  const s = tr()
  return [`${s.budget}: ${PLAN_FAMILIES.map(family => `${FAMILY_NAME[family]} ${s.policy[budgetPolicy(usage, family)]}`).join(' · ')}.`,
    ...PLAN_FAMILIES.filter(family => decisionHolds(usage, family, at)).map(family =>
      s.goUntil(FAMILY_NAME[family], formatPlanTimestamp(usage.decisions![family]!.until, true, at, { locale: LOCALE[lang] })))].join(' ')
}

// The command takes each argument in either language.
const BUDGET_ARGS: Readonly<Record<string, BudgetPolicy | 'once'>> = {
  within: 'within', full: 'full', pace: 'pace', once: 'once', entro: 'within', pieno: 'full', ritmo: 'pace', 'una-volta': 'once', unavolta: 'once',
}

async function runBudgetCommand($: EngineInterface, e: CommandRunInput): Promise<{ text: string }> {
  const args = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const at = await $.clock.now()
  if (!args.length) return { text: describeBudgetPolicies(await read($, usageReadings), at) }
  const [family, asked] = args
  const known = PLAN_FAMILIES.find(value => value === family)
  const policy = Object.hasOwn(BUDGET_ARGS, asked ?? '') ? BUDGET_ARGS[asked!] : undefined
  if (args.length !== 2 || !known || !policy) return { text: tr().budgetUsage }
  // once is the user's yes until the next reset; the policy stays. Observations and the other family survive.
  await update($, usageReadings, prev => policy === 'once' ? decideBudget(prev, known, at, 'user')
    : { ...prev, policies: { ...prev.policies, [known]: policy } })
  await showPanel($, true)
  $.ui.invalidate('ui.render')
  return { text: describeBudgetPolicies(await read($, usageReadings), at) }
}

// The host accepts text results; both tools expose the same compact JSON line, and the tiers'
// estimates on a line of their own once a tier has a finished run.
const formatBudgetText = (budget: BudgetSummary): string => `budget: ${JSON.stringify(budget)}`

async function budgetLines($: EngineInterface): Promise<string> {
  await rereadGemini($)
  const usage = await read($, usageReadings), at = await $.clock.now()
  const estimates = tierEstimates(await read($, agents), usage, at)
  return [formatBudgetText(budgetSummary(usage, at)),
    ...(Object.keys(estimates).length ? [`estimates: ${JSON.stringify(estimates)}`] : [])].join('\n')
}

async function readBudgetResult($: EngineInterface): Promise<{ result: string }> {
  return { result: await budgetLines($) }
}

// What the user picked or typed in an AskUserQuestion dialog: the values of its stored `answers` (and any notes in
// `annotations`), never the result's text, which carries the question the model wrote.
const askedAnswers = (record: unknown): string[] => {
  const { answers, annotations } = (record && typeof record === 'object' ? record : {}) as { answers?: unknown; annotations?: unknown }
  const values = (value: unknown): unknown[] => value && typeof value === 'object' ? Object.values(value) : []
  return [...values(answers), ...values(annotations).map(note => (note as { notes?: unknown } | null)?.notes)]
    .filter((text): text is string => typeof text === 'string' && Boolean(text.trim()))
}

// What the user has written this session, one entry per user message: their own text, or what they answered in an
// AskUserQuestion dialog. Every other tool result is no words of theirs.
export const userWordsOf = (messages: readonly SessionMessage[]): string[] => {
  const asked = new Map<string, unknown>()
  const said: string[] = []
  for (const m of messages) {
    if (m.role === 'assistant') {
      for (const use of m.toolUses ?? []) if (use.tool === 'AskUserQuestion') asked.set(use.tool_use_id, use.result)
      continue
    }
    if (!m.toolResults?.length) {
      if (m.text.trim()) said.push(m.text)
      continue
    }
    const answers = m.toolResults.filter(r => asked.has(r.tool_use_id) && !r.isError)
      .flatMap(r => askedAnswers(r.result ?? asked.get(r.tool_use_id)))
    if (answers.length) said.push(answers.join('\n'))
  }
  return said
}

async function userWords($: EngineInterface): Promise<string[]> {
  try {
    return userWordsOf(await $.session.messages())
  } catch {
    return []
  }
}

const normalized = (text: string): string => text.toLowerCase().replace(/[\s"'“”‘’«»]+/g, ' ').trim()

// The gate said ask just now: remember when, and how many user messages came before, so only a later one can answer it.
async function noteRefusal($: EngineInterface, scope: { family: PlanFamily } | { tier: string }): Promise<void> {
  const refusal: GateRefusal = { at: await $.clock.now(), userMessages: (await userWords($)).length }
  await update($, usageReadings, prev => ({ ...prev, refusals: 'family' in scope
    ? { ...prev.refusals, families: { ...prev.refusals?.families, [scope.family]: refusal } }
    : { ...prev.refusals, tiers: { ...prev.refusals?.tiers, [scope.tier]: refusal } } }))
}

// The words a yes quotes must come from a user message submitted after the gate's latest refusal for that scope;
// with no refusal yet, from any user message. Undefined when they do, else the message to refuse with.
async function quoteFault($: EngineInterface, answer: string, since: GateRefusal | undefined): Promise<string | undefined> {
  const said = await userWords($)
  const quote = normalized(answer)
  const found = (messages: string[]): boolean => messages.some(text => normalized(text).includes(quote))
  if (!quote || !found(said)) return tr().badAnswer
  return !since || found(said.slice(since.userMessages)) ? undefined : tr().staleAnswer
}

async function recordTopTier($: EngineInterface, e: Record<string, unknown>): Promise<{ result: string } | { deny: string }> {
  const tier = typeof e.tier === 'string' ? TOP_TIER_NAMES[e.tier] : undefined
  if (!tier || (e.family !== undefined && e.family !== TOP_TIERS[tier]!.family)) return { deny: tr().badTier }
  if (typeof e.answer !== 'string' || !e.answer.trim()) return { deny: tr().badAnswer }
  const uses = e.uses === undefined ? 1 : e.uses
  if (uses !== 'session' && !(typeof uses === 'number' && Number.isInteger(uses) && uses >= 1)) return { deny: tr().badUses }
  const fault = await quoteFault($, e.answer, (await read($, usageReadings)).refusals?.tiers?.[tier])
  if (fault) return { deny: fault }
  const at = await $.clock.now()
  await update($, usageReadings, prev => allowTopTier(prev, tier, at, e.answer as string, uses as number | 'session'))
  const s = tr()
  return { result: s.topDecided(TOP_TIERS[tier]!.name, uses === 'session' ? s.topUsesSession : uses === 1 ? s.topUsesOne : s.topUsesMany(uses as number)) }
}

async function recordDecision($: EngineInterface, e: Record<string, unknown>): Promise<{ result: string } | { deny: string }> {
  // A worker cannot open the gate it is held by: only the main session records the user's answer.
  if (e.agentId) return { result: tr().ignoredDecision }
  if (e.tier !== undefined) return recordTopTier($, e)
  const family = PLAN_FAMILIES.find(value => value === e.family)
  if (!family) return { deny: tr().badFamily }
  if (e.policy !== undefined && e.policy !== 'pace') return { deny: tr().badPolicy }
  if (typeof e.answer !== 'string' || !e.answer.trim()) return { deny: tr().badAnswer }
  const fault = await quoteFault($, e.answer, (await read($, usageReadings)).refusals?.families?.[family])
  if (fault) return { deny: fault }
  const at = await $.clock.now()
  if (e.policy !== undefined) {
    // The user's standing word: the policy persists until they change it, unlike a yes that ends at a reset.
    await update($, usageReadings, prev => ({ ...prev, policies: { ...prev.policies, [family]: 'pace' } }))
    return { result: tr().pacing(FAMILY_NAME[family]) }
  }
  await update($, usageReadings, prev => decideBudget(prev, family, at, 'orchestrator', e.answer as string))
  return { result: tr().decided(FAMILY_NAME[family], (await read($, usageReadings)).decisions![family]!.until) }
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    langOption = options.language === 'auto' || isLang(options.language) ? options.language : 'auto'
    lang = await detectLang($, langOption)
    await update($, picked, () => (typeof options.theme === 'string' ? options.theme : 'auto'))
    await applyTheme($)
    await $.tool.register({
      name: 'progress',
      description:
        'Report /savvy-flow progress to the progress bar above the prompt and the agents panel. ' +
        'Call it after presenting the plan (title, total, tasks, phase "delegate"), each time a task is accepted (done), ' +
        'when switching phase or re-planning (tasks), and once at the end with finished: true. Fields left out keep their previous value. ' +
        'Returns a string: an ok: acknowledgement first, then a budget: line with compact JSON per family/window ' +
        '(used, resetsAt, projectedAtReset, exhaustsAt, pace, policy, verdict). ' +
        'A verdict of ask needs the user\'s decision before long work (the Agent tool refuses a costly tier of that family until it is recorded); over is accepted by full policy; ' +
        'under pace the verdict is retier (projection over 100%, with an advice string: re-tier, never ask) or spend (weekly under 90% with the reset under two days away). ' +
        'Once a tier has finished runs, a third line, estimates:, gives its mean cost and share of each window. ' +
        'A call that sets tasks ends with the routing card, which tier takes what: re-tier each open task against it before its launch. ' +
        'For the main session only: a call from a subagent is ignored (workers report with `step`).',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short name of the overall task, a few words.' },
          total: { type: 'integer', minimum: 0, description: 'Number of planned worker tasks.' },
          done: { type: 'integer', minimum: 0, description: 'Number of tasks accepted after review.' },
          phase: { type: 'string', enum: [...PHASES] },
          finished: { type: 'boolean', description: 'True once the flow is closed.' },
          clearFinished: {
            type: 'boolean',
            description: "True to clear the finished runs from the panel's Finished list (the user asked, or the list grew long); the totals, the running runs and the planned tasks stay as they are.",
          },
          tasks: {
            type: 'array',
            description:
              'The planned worker tasks in order, numbered from 1. Each title must equal the Agent tool `description` the task will be delegated with, so the panel can match runs to tasks.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'A few words; reused verbatim as the Agent description.' },
                tier: {
                  type: 'string',
                  enum: [...CLAUDE_TIERS, ...Object.keys(GEMINI_WEARS), ...Object.keys(CODEX_WEARS), ...Object.keys(AGY_WEARS), 'other'],
                  description: 'The savvy tier; `other` for an agent of the project that is no savvy worker, named in `agent`.',
                },
                after: { type: 'array', items: { type: 'integer' }, description: 'Numbers of the tasks this one waits for.' },
                effort: {
                  type: 'string',
                  enum: [...EFFORTS],
                  description: "Only when the task's Agent call passes an `effort` (the user chose it): that effort, shown in place of the tier's.",
                },
                model: {
                  type: 'string',
                  enum: [...MODELS],
                  description: "Only when the task's Agent call passes a `model`: that model, shown in place of the tier's.",
                },
                agent: { type: 'string', description: "For tier `other`: the Agent call's `subagent_type`, shown as the task's tier." },
              },
              required: ['title', 'tier'],
            },
          },
        },
      },
    })
    await $.tool.register({
      name: 'budget',
      description: 'Read the current budget summary per family (claude, codex, gemini, agy — Antigravity\'s Claude and GPT models quota) and window (fiveHour, week), without changing the progress bar. ' +
        'Returns a string: a budget: line with compact JSON containing used, resetsAt, projectedAtReset, exhaustsAt, pace, policy and verdict (ok, over, ask, retier, spend) and, for retier and spend, an advice string. ' +
        'Null projection fields mean no estimate yet; ask needs the user\'s decision before long work. Policies are set by /savvy-budget, or by decide with policy pace. ' +
        'Once a tier has finished runs, a second line, estimates:, gives per tier the runs, their mean cost in USD and that cost as a percent of each Claude window (null until observed).',
      inputSchema: { type: 'object', properties: {}, required: [] },
    })
    await $.tool.register({
      name: 'decide',
      description: 'Record the user\'s yes to costly work on a family whose budget verdict is ask: it opens the budget gate on that family\'s ' +
        'costly tiers (Fable, Heavy, Careful; Codex Sol, Astra; Gemini Hydrogen, Carbon) until the family\'s next reset. Call it only after the user said yes in chat, ' +
        'quoting their words in answer (an option they picked or wrote in AskUserQuestion counts, quoted as they chose it); never on your own judgment. Main session only. ' +
        "With tier (fable, astra or carbon) it instead records the user's yes to launching that top tier, which is for PLANS only: it holds for one launch " +
        'or resume by default, uses sets a number or "session" when the user\'s words allow more; it does not open the budget gate. ' +
        'With policy "pace" (and family) it instead records the user\'s standing word to keep working inside the budget by re-tiering, ' +
        'without asking: the family\'s policy becomes pace and stays until the user changes it with /savvy-budget; answer quotes their words.',
      inputSchema: {
        type: 'object',
        properties: {
          family: { type: 'string', enum: [...PLAN_FAMILIES] },
          answer: { type: 'string', description: "The user's own words that said yes." },
          policy: { type: 'string', enum: ['pace'], description: 'Record the pace policy for the family, from the user\'s own words; it persists.' },
          tier: { type: 'string', enum: ['fable', 'astra', 'carbon'], description: 'Top tier the yes is for; Fable, Astra and Carbon are for plans only.' },
          uses: { description: 'With tier: launches or resumes the yes covers; 1 by default, or "session".', oneOf: [{ type: 'integer', minimum: 1 }, { type: 'string', enum: ['session'] }] },
        },
        required: ['answer'],
      },
    })
    await $.tool.register({
      name: 'step',
      description:
        'For savvy-flow workers: report progress on your own task to the agents panel. ' +
        'Right after reading the brief, call it with `total` (your plan in 3-8 steps) and `done: 0`; ' +
        'call it again at the start of each step, and before any command expected to run longer than a minute, with a note naming the actual action (reading CreatureProbe.cs, running EditMode tests), never working; close with `done` equal to `total` and `skipped` for the steps left undone. ' +
        'Codex relays also declare their exact `model` slug, `effort`, and a unique `codexStatus` filename stem before piping Codex JSON through the status writer (declarations need no done). ' +
        'Gemini relays likewise declare `model`, `effort` and a unique `geminiStatus` before piping agy stream-json through theirs. ' +
        'Cheap and silent: it only draws a bar.',
      inputSchema: {
        type: 'object',
        properties: {
          done: { type: 'integer', minimum: 0, description: 'Steps finished so far.' },
          total: { type: 'integer', minimum: 1, description: 'Steps planned; may change if the plan changes.' },
          note: { type: 'string', description: 'The concrete action: reading CreatureProbe.cs or running EditMode tests; never working.' },
          model: { type: 'string', description: 'Codex and Gemini relays: the exact model slug passed to codex exec or agy (for example gpt-6.1-sol, gemini-4-argon).' },
          effort: { type: 'string', description: 'Codex and Gemini relays: the reasoning effort passed to codex exec or agy.' },
          codexStatus: { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$', description: 'Codex relays: the unique name of this invocation in ~/.codex/savvy-status/<name>.json.' },
          geminiStatus: { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$', description: 'Gemini and Antigravity Claude/GPT relays: the unique name of this invocation in ~/.gemini/savvy-status/<name>.json.' },
          skipped: {
            type: 'integer',
            minimum: 0,
            description: 'Planned steps left undone (a step merged into another is done), shown beside the count. Leave it out when there are none.',
          },
        },
        required: [],
      },
    })
    await $.command.register({
      name: 'agents-info',
      description: tr().agentsInfo,
    })
    await $.command.register({
      name: 'savvy-theme',
      description: tr().savvyTheme,
      argumentHint: tr().themeHint,
      immediate: true,
    })
    await $.command.register({
      name: 'savvy-budget',
      description: tr().savvyBudget,
      argumentHint: tr().budgetHint,
      immediate: true,
    })

    // A flow that closed before this (re)load leaves no bar; its runs stay in the panel.
    await refreshCodexModels($)
    await refreshClaudeUsage($, true)
    await refreshCodexUsage($, true)
    await refreshGeminiUsage($, true)
    await rememberClaudeModels($, (await read($, agents)).map(a => a.model))
    await update($, flow, f => (f?.isFinished ? null : f))
    try {
      await reconcile($)
    } catch {
      // No agents list here (a -p run, the SDK): the tick tries again.
    }

    // Ticks the running agents' clocks and, now and then, checks them against the
    // engine's list; quiet when nothing runs.
    $.clock.every(1000, () => {
      void (async () => {
        await refreshCodexModels($)
        await refreshClaudeUsage($)
        await refreshCodexUsage($)
        await refreshGeminiUsage($)
        void rereadGemini($, true).catch(() => undefined)
        const list = await read($, agents)
        if (list.some(a => a.status === 'running')) {
          const at = await $.clock.now()
          await update($, now, () => at)
          if (at - lastListAt >= LIST_EVERY_MS) await reconcile($)
        }
        await showPanel($)
      })().catch(() => undefined)
    })
    return started
  })

  on('command.run', { command: 'savvy-budget' }, runBudgetCommand)
  on('tool.call', { tool: BUDGET_TOOL }, readBudgetResult)
  on('tool.call', { tool: DECIDE_TOOL }, async ($, e) => recordDecision($, e as unknown as Record<string, unknown>))

  on('command.run', { command: 'savvy-theme' }, async ($, e) => {
    const at = await $.clock.now()
    const asked = e.args.trim()
    if (!asked) {
      const rows = [`  auto — ${tr().auto}`, ...THEMES.map(t => `  ${t} — ${themeLabel(t)}`)]
      return { text: `${tr().themeIs}: ${describeTheme(await read($, picked), at)}.\n${rows.join('\n')}` }
    }
    const value = themeNamed(asked)
    if (!value) return { text: tr().noTheme(asked) }
    await pickTheme($, value, true)
    const deny = await saveTheme($, value)
    return { text: `${tr().themeIs}: ${describeTheme(value, at)}.${deny ? ` ${tr().notKept}: ${deny}` : ''}` }
  })

  // A pick in `/config`: the panel follows it at once (this plugin's own save is not one).
  on('config.set', { key: OPTION }, async ($, e, next) => {
    const result = await next(e)
    if (!isSaving && typeof result.value === 'string') await pickTheme($, result.value, false)
    return result
  })

  on('command.run', { command: 'agents-info' }, async $ => {
    const isOpen = await togglePane($)
    return { text: isOpen ? tr().opened : tr().closed }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    // The flow is the main session's: a call from a worker's loop carries its
    // agentId and changes nothing, or a worker could rename, finish or reset it.
    if (e.agentId) return { result: tr().ignoredFlow }
    const input = e as unknown as ProgressInput
    const prev = await read($, flow)
    if (isNewFlow(prev, input) && input.title !== undefined) {
      // A new flow starts with a clean list; agents still running stay.
      await update($, agents, list => list.filter(a => a.status === 'running'))
    }
    await update($, flow, p => merge(p, input))
    if (input.clearFinished === true) await update($, agents, clearFinished)
    await syncRunning($)
    const next = await read($, flow)
    if (next && input.tasks?.length) await autoOpen($, next.title)
    const card = input.tasks ? routingCard(next) : undefined
    return { result: [`ok: ${label(next ?? blank(), runningOf(await read($, agents)))}`, await budgetLines($), ...(card ? [card] : [])].join('\n') }
  })

  // A worker's own progress: the call runs in the worker's loop, so agentId names it.
  on('tool.call', { tool: STEP_TOOL }, async ($, e) => {
    const input = e as unknown as { done?: number; total?: number; note?: string; skipped?: number; model?: string; effort?: string; codexStatus?: string; geminiStatus?: string }
    if ((input.model !== undefined && typeof input.model !== 'string') || (input.effort !== undefined && typeof input.effort !== 'string')) {
      return { deny: tr().badModel }
    }
    if (input.codexStatus !== undefined && (typeof input.codexStatus !== 'string' || !STATUS_NAME.test(input.codexStatus))) return { deny: tr().badStatus }
    if (input.geminiStatus !== undefined && (typeof input.geminiStatus !== 'string' || !STATUS_NAME.test(input.geminiStatus))) return { deny: tr().badGeminiStatus }
    const agentId = e.agentId
    if (!agentId) return { result: tr().ignoredSteps }
    // Set on every run of the updater, which may run again on a conflict.
    let isMatched = false
    await update($, agents, list => {
      isMatched = list.some(a => a.agentId === agentId)
      return list.map(a => {
        if (a.agentId !== agentId) return a
        const total = Math.max(0, Math.round(input.total ?? a.stepTotal ?? 0))
        const done = Math.max(0, Math.round(input.done ?? a.stepDone ?? 0))
        const skipped = Math.min(total || Infinity, Math.max(0, Math.round(input.skipped ?? a.stepSkipped ?? 0)))
        const { stepSkipped: _, ...row } = a
        return {
          ...row,
          stepTotal: total,
          stepDone: total ? Math.min(total, done) : done,
          stepNote: input.note === undefined ? a.stepNote : input.note.trim() || undefined,
          ...(tierOf(a.type) in CODEX_WEARS ? {
            ...(input.model?.trim() ? { codexModel: input.model.trim() } : {}),
            ...(input.effort?.trim() ? { codexEffort: input.effort.trim() } : {}),
            ...(input.codexStatus?.trim() ? { codexStatus: input.codexStatus.trim() } : {}),
          } : {}),
          ...(tierOf(a.type) in AGY_RELAYS ? {
            ...(input.model?.trim() ? { geminiModel: input.model.trim() } : {}),
            ...(input.effort?.trim() ? { geminiEffort: input.effort.trim() } : {}),
            ...(input.geminiStatus?.trim() ? { geminiStatus: input.geminiStatus.trim() } : {}),
          } : {}),
          // A worker that skipped nothing keeps the row it always had.
          ...(skipped ? { stepSkipped: skipped } : {}),
        }
      })
    })
    return { result: isMatched ? 'ok' : tr().noRow(agentId) }
  })

  // A worker's tool calls feed its row: the call it is in now and since when, so a long
  // command reads as work under way; SubagentHandback is its report delivered. Every call
  // goes on to the tool, and a hook here never refuses one.
  on('tool.call', async ($, e, next) => {
    const agentId = e.agentId
    if (!agentId || e.tool === STEP_TOOL) return next(e)
    if (!(await read($, agents)).some(a => a.agentId === agentId && a.status === 'running')) return next(e)
    if ((e.tool as string) === HANDBACK_TOOL) {
      const result = await next(e)
      if (!result.deny) await update($, agents, list => list.map(a => (a.agentId === agentId
        ? { ...a, isHandedBack: true, activity: undefined, activityId: undefined, activityAt: undefined } : a)))
      return result
    }
    const activityId = e.tool_use_id || `${agentId}:${await $.clock.now()}`
    const activityAt = await $.clock.now()
    const activity = activityOf(e as unknown as Record<string, unknown>)
    await update($, agents, list => list.map(a => (a.agentId === agentId ? { ...a, activity, activityId, activityAt } : a)))
    try {
      return await next(e)
    } finally {
      await update($, agents, list => list.map(a => (a.agentId === agentId && a.activityId === activityId
        ? { ...a, activity: undefined, activityId: undefined, activityAt: undefined } : a)))
    }
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    const claude = claudePlanUsage(e.rateLimits)
    if (claude) {
      const at = await $.clock.now()
      await update($, usageReadings, prev => recordPlanUsage(prev, 'claude', claude, at))
    }
    return result
  })

  // summary is local to SendMessage's tool.call: session.send does not carry it.
  // A resume may use agent.spawn, or reuse the loop and go straight to turn.step.
  on('tool.call', { tool: 'SendMessage' }, async ($, e, next) => {
    const summary = typeof e.summary === 'string' ? e.summary.trim() : ''
    const to = typeof e.to === 'string' ? e.to : ''
    const rows = await read($, agents)
    let target = rows.find(a => a.agentId === to || a.name === to || a.id === to)
    if (summary && !target && to) {
      try {
        const id = (await $.agent.list()).find(a => a.name === to || a.id === to || a.teammateId === to)?.id
        target = rows.find(a => a.agentId === id)
      } catch { /* A host without a roster can still address a stored id/name. */ }
    }
    const id = target?.id
    // A resume of a top-tier worker is a launch for the gate: it needs a recorded yes with a use left.
    if (target) {
      const held = topTierGate(target.type, await read($, usageReadings), true, lang, target.model)
      if (held) {
        await noteRefusal($, { tier: topTierKey(target.type, target.model)! })
        return { deny: held }
      }
      await update($, usageReadings, prev => spendTopTier(prev, target.type, target.model))
    }
    await debugResume($, 'tool.call:SendMessage', e, { id, agentId: target?.agentId, description: target?.description })
    if (summary && id) await update($, agents, list => list.map(a => a.id === id ? { ...a, nextTitle: summary } : a))
    try {
      const result = await next(e)
      await debugResume($, 'tool.call:SendMessage:result', result, { id })
      const delivery = result.result as { success?: boolean } | undefined
      if (!result.deny && !result.isError && delivery?.success !== false) return result
      if (id) await update($, agents, list => list.map(a => a.id === id && a.nextTitle === summary ? { ...a, nextTitle: undefined } : a))
      return result
    } catch (error) {
      if (id) await update($, agents, list => list.map(a => a.id === id && a.nextTitle === summary ? { ...a, nextTitle: undefined } : a))
      throw error
    }
  })

  // Safety net: worker launches move the faint layer even if the orchestrator forgets to report.
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    // The budget gate comes first: a refused call neither starts a worker nor moves the bar.
    const subagent = String(e.subagent_type ?? '')
    const topRefusal = topTierGate(subagent, await read($, usageReadings), false, lang, e.model)
    if (topRefusal) {
      await noteRefusal($, { tier: topTierKey(subagent, e.model)! })
      return { deny: topRefusal }
    }
    if (isSavvy(subagent) && ['gemini', 'agy'].includes(GATED_TIERS[tierOf(subagent)] ?? '')) await rereadGemini($)
    const budgetRefusal = budgetGate(subagent, await read($, usageReadings), await read($, agents), await $.clock.now(), lang)
    if (budgetRefusal) {
      await noteRefusal($, { family: GATED_TIERS[tierOf(subagent)]! })
      return { deny: budgetRefusal }
    }
    const refusal = planGate(subagent, e.description, await read($, flow), lang)
    if (refusal) return { deny: refusal }
    const misfit = fitGate(subagent, e.description, e.prompt, lang)
    if (misfit) return { deny: misfit }
    await update($, usageReadings, prev => spendTopTier(prev, subagent, e.model))
    if (isSavvy(String(e.subagent_type ?? ''))) {
      // `running` is not counted here: agent.spawn and the reconcile derive it from the runs.
      await update($, flow, prev => {
        const base = prev && !prev.isFinished ? { ...blank(), ...prev } : blank()
        return { ...base, phase: base.phase === 'plan' ? 'delegate' : base.phase }
      })
      await syncRunning($)
    }
    const effort = oneOf(EFFORTS, e.effort)
    if (effort && e.tool_use_id) askedEffort.set(e.tool_use_id, effort)
    try {
      const answered = await next(e)
      await adoptAgentId($, e.tool_use_id, answered.result)
      return answered
    } finally {
      if (e.tool_use_id) askedEffort.delete(e.tool_use_id)
    }
  })

  on('agent.spawn', async ($, e, next) => {
    await refreshClaudeUsage($)
    await debugResume($, 'agent.spawn', e)
    const started = await next(e)
    await debugResume($, 'agent.spawn:result', started)
    if (started.deny !== undefined) return started

    const at = await $.clock.now()
    await rememberClaudeModels($, [started.model])
    // Until the first model request names the run's own, the effort its Agent call asked for.
    const effort = askedEffort.get(e.tool_use_id)
    await update($, agents, list => {
      const previous = e.resume && list.find(a => a.agentId === e.resume?.agentId)
      const description = previous?.nextTitle || e.description
      const existing = previous || list.find(a => started.agentId && a.agentId === started.agentId)
      const round = existing && norm(description) === norm(existing.description)
        ? existing.round + (previous ? 1 : 0) : 1
      const run: AgentRun = {
        id: started.agentId ?? e.tool_use_id,
        agentId: started.agentId,
        type: e.subagentType,
        description,
        ...(e.name ? { name: e.name } : previous?.name ? { name: previous.name } : {}),
        model: started.model,
        ...(effort ? { effort } : {}),
        status: 'running',
        startedAt: at,
        contextTokens: 0,
        contextMax: windowOf(started.model),
        tokens: 0,
        costUsd: 0,
        steps: 0,
        round,
        ...(e.workflow ? { isWorkflow: true } : {}),
      }
      return [...list.filter(a => a.id !== run.id && (!run.agentId || a.agentId !== run.agentId)), run].slice(-200)
    })
    await update($, now, () => at)
    await syncRunning($)
    if (isSavvy(e.subagentType)) {
      const f = await read($, flow)
      await autoOpen($, f && !f.isFinished ? f.title : 'savvy-flow')
    }
    return started
  })

  // Each model request of a subagent: live context, tokens and cost.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId) await refreshClaudeUsage($)
    if (e.agentId) {
      const row = (await read($, agents)).find(a => a.agentId === e.agentId)
      if (e.index === 0 || row?.nextTitle) await debugResume($, 'turn.step', e,
        { agentId: row?.agentId, description: row?.description, summary: row?.nextTitle, turnId: row?.turnId })
      await beginQueuedTask($, e.agentId, e.turnId, e.index)
    }
    const result = yield* next(e)
    const agentId = e.agentId
    const usage = result.usage
    // Every model step, the main session's too, is Claude spend: the window moves with all of it.
    const spent = usage ? costOf(usage.model || e.model, usage) : 0
    if (spent > 0) await update($, usageReadings, prev => ({ ...prev, spentUsd: { ...prev.spentUsd, claude: (prev.spentUsd?.claude ?? 0) + spent } }))
    if (!agentId || !usage) return result

    const model = usage.model || e.model
    await rememberClaudeModels($, [model])
    // A run that had ended (an idle teammate, a resumed agent) runs again.
    const isRevived = (await read($, agents)).some(a => a.agentId === agentId && a.status !== 'running')
    await update($, agents, list =>
      list.map(a =>
        a.agentId !== agentId
          ? a
          : {
              ...a,
              model,
              effort: typeof e.effort === 'string' ? e.effort : a.effort,
              status: 'running',
              isCleared: undefined,
              // Woken again after its report (a SendMessage, its background work ending):
              // a run that has not reported yet.
              ...(a.status !== 'running' ? { isHandedBack: undefined, leftBackground: undefined } : {}),
              // A model step is work again, not a wait on background work.
              waitingSince: undefined,
              ...(isRelayed(a) ? { relayStatus: 'running' as const, relayEndedAt: undefined } : {}),
              endedAt: undefined,
              contextTokens:
                (usage.input_tokens || 0) +
                (usage.cache_read_input_tokens || 0) +
                (usage.cache_creation_input_tokens || 0) +
                (usage.output_tokens || 0),
              contextMax: windowOf(model),
              // Cache reads are the same context read again on every step: summed,
              // they would count it once per step. They stay in the context and the cost.
              tokens:
                a.tokens +
                (usage.input_tokens || 0) +
                (usage.output_tokens || 0) +
                (usage.cache_creation_input_tokens || 0),
              costUsd: a.costUsd + costOf(model, usage),
              steps: a.steps + 1,
            },
      ),
    )
    if (isRevived) await syncRunning($)
    return result
  })

  // This event's background_tasks is session-wide; it is diagnostic evidence,
  // not proof that every stopping worker owns the listed background tasks.
  // A worker stopping with its own count still open is asked, once per task, to close it and give its report
  // again. Never when the host is already continuing it from a stop hook (stop_hook_active), so it cannot loop;
  // never after SubagentHandback, whose report is already delivered (the panel says the count was left open).
  on('classic.SubagentStop', async ($, e, next) => {
    await debugResume($, 'classic.SubagentStop', e)
    const result = await next(e)
    const agentId = e.agent_id
    if (!agentId || e.stop_hook_active || result.block !== undefined) return result
    // Set on every run of the updater, which may run again on a conflict.
    let asked: AgentRun | undefined
    await update($, agents, list => {
      asked = undefined
      return list.map(a => {
        if (a.agentId !== agentId || a.isCountNudged || a.isHandedBack || !isCountOpen(a)) return a
        asked = a
        return { ...a, isCountNudged: true }
      })
    })
    return asked ? { ...result, block: tr().closeCount(asked.stepDone ?? 0, asked.stepTotal ?? 0) } : result
  })

  // The main session read again after a compaction or a resume: the skill's routing rules may be gone from it, the open
  // plan is not.
  on('classic.SessionStart', async ($, e, next) => {
    const result = await next(e)
    if (e.agent_id || (e.source !== 'compact' && e.source !== 'resume')) return result
    const card = routingCard(await read($, flow))
    return card ? { ...result, additionalContext: [...(result.additionalContext ?? []), card] } : result
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId) {
      await debugResume($, 'turn.complete', e)
      const at = await $.clock.now()
      if (e.usage?.model) await rememberClaudeModels($, [e.usage.model])
      await update($, agents, list =>
        list.map(a => {
          if (a.agentId !== agentId) return a
          // A run whose steps went unseen still gets the turn's own sum.
          const fallback = a.steps === 0 && e.usage
          // An answer ends a model turn, while the worker can still own live
          // background work. Keep it live until the roster confirms a finish,
          // unless the worker handed back its report: then its run is over.
          const isAnswer = e.reason === 'answer'
          const isOver = !isAnswer || a.isHandedBack === true
          const status: AgentRun['status'] = !isAnswer ? 'failed' : isOver ? 'done' : 'running'
          return {
            ...a,
            status,
            pendingCompletion: isOver ? undefined : true,
            isWaiting: isOver ? undefined : a.isWaiting,
            endedAt: isOver ? at : undefined,
            activity: undefined,
            activityId: undefined,
            activityAt: undefined,
            ...(isRelayed(a) ? { relayStatus: status, relayEndedAt: isOver ? at : undefined } : {}),
            ...(fallback && e.usage
              ? {
                  model: e.usage.model || a.model,
                  tokens: e.usage.input_tokens + e.usage.output_tokens + e.usage.cache_creation_input_tokens,
                  costUsd: costOf(e.usage.model || a.model, e.usage),
                }
              : {}),
          }
        }),
      )
      await update($, now, () => at)
      await syncRelayRuns($)
    }
    const result = await next(e)
    if (agentId && e.reason === 'answer') {
      try { await reconcile($, agentId) } catch { /* Keep the answer pending; the next tick retries. */ }
      await showPanel($)
    }
    return result
  })

  // The theme picker taking the panel's focus holds the panel still; the focus
  // moving on lets it catch up.
  on('ui.focus', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const result = await next(e)
    if (result.deny) return result
    if ((e.element === 'theme' || e.element === 'language') && (e.plugin ?? 'savvy-progress') === 'savvy-progress') {
      const at = await $.clock.now()
      await update($, picking, () => at)
    } else if (await read($, picking)) {
      await update($, picking, () => 0)
      await showPanel($)
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = tr()
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    await applyTheme($)
    // The theme picker, on every surface that draws one.
    const Select = 'Select' in ui ? ui.Select : undefined
    const calendar = themeLabel(themeOn(await $.clock.now()))
    const themePicker = Select && (
      <Select
        key="theme"
        label={s.theme}
        value={await read($, picked)}
        options={[{ value: 'auto', label: `${s.auto}: ${calendar}` }, ...THEMES.map(t => ({ value: t, label: themeLabel(t) }))]}
        onSelect={value => {
          // The list is closed: the panel catches up and redraws in the new theme,
          // then holds still again, the focus staying on the picker. The hold is
          // renewed before the option is saved, which reloads the plugin.
          void (async () => {
            await showPanel($, true)
            await pickTheme($, value, false)
            const at = await $.clock.now()
            await update($, picking, () => at)
            await saveTheme($, value)
          })()
        }}
      />
    )
    // The language picker beside it: a pick speaks at once and is kept in the option.
    const languagePicker = Select && (
      <Select
        key="language"
        label={s.language}
        value={langOption}
        options={[{ value: 'auto', label: s.langAuto }, ...LANGS.map(l => ({ value: l, label: LANG_NAME[l] }))]}
        onSelect={value => {
          // As for a theme: the panel catches up in the new language, then holds
          // still again; the hold is renewed before the save, which reloads the plugin.
          void (async () => {
            await pickLanguage($, value)
            await showPanel($, true)
            const at = await $.clock.now()
            await update($, picking, () => at)
            await saveLanguage($, value)
          })()
        }}
      />
    )
    // The copy once there is one, so the live values' changes do not redraw it. Never a
    // copy that lacks a run the live list holds as running (one taken before the run
    // started and not refreshed since, or held by the picker): the live values then.
    const copy = await read($, shown)
    const isBehind = copy !== null && (await read($, runningIds)).some(id => !copy.agents.some(a => a.id === id && a.status === 'running'))
    const view = copy && !isBehind ? copy : { flow: await read($, flow), agents: await read($, agents), now: await $.clock.now(), models: await read($, models), usage: await read($, usageReadings) }
    const hints = view.models ?? EMPTY_MODELS
    const usage = view.usage ?? EMPTY_USAGE
    const list = view.agents
    const f = view.flow
    const p: Panel = await read($, panel)
    const at = Math.max(view.now, ...list.map(a => a.startedAt), 0)

    const running = list.filter(a => a.status === 'running').reverse()
    const finished = list.filter(a => a.status !== 'running' && isShown(a)).reverse()
    const planned = plannedOf(f, list)
    const t = totals(list, at, usage)
    // The pane's title says "Agents"; inside, only the flow's own name.
    const title = f && !f.isFinished ? f.title : ''

    const toggleCompact = (
      <Button
        key="compact"
        label={p.isCompact ? s.expand : s.collapse}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isCompact: !prev.isCompact }))}
      />
    )
    const toggleDone = (
      <Button
        key="done"
        label={`${p.isDoneCollapsed ? '▸' : '▾'} ${s.finished} · ${finished.length}`}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isDoneCollapsed: !prev.isDoneCollapsed }))}
      />
    )
    const clearDone = (
      <Button
        key="clear-done"
        label={s.clearFinished}
        plain
        onPress={async () => {
          await update($, agents, clearFinished)
          await showPanel($, true)
        }}
      />
    )
    const doneHeader = (
      <Box key="done-header" flexDirection="row" flexWrap="wrap" alignItems="center" gap={1}>
        {toggleDone}
        {clearDone}
      </Box>
    )
    const isEmpty = list.filter(isShown).length === 0 && planned.length === 0
    const controls = (
      <Box flexDirection="row" flexWrap="wrap" alignItems="center" gap={1}>
        {toggleCompact}
        {themePicker}
        {languagePicker}
      </Box>
    )
    const summary = `≈ ${familyCosts(t)}, ${familyTokens(t)} ${s.tokensWord}, ${fmtTime(t.time)}`

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      const section = (key: string, text: string) => (
        <Text key={key} dimColor>
          {text}
        </Text>
      )

      if (p.isCompact) {
        return (
          <Box flexDirection="column" gap={1}>
            <Svg source={compactSvg(W, list.filter(isShown), planned, t, usage, at)} alt={`${list.filter(isShown).length} ${s.agentsCount}, ${summary}`} width={W} height={compactHeight(usage)} />
            {controls}
          </Box>
        )
      }
      return (
        <Box flexDirection="column">
          <Svg source={headerSvg(W, title, t, at, usage)} alt={title ? `${title}: ${summary}` : summary} width={W} height={headerHeight(title, W, usage)} />
          {controls}
          {isEmpty && <Text dimColor>{s.empty}</Text>}
          {running.length > 0 && section('h-run', `${s.running} · ${running.length}`)}
          {running.map(a => (
            <Svg key={a.id} source={agentSvg(W, a, at, hints, usage)} alt={`${a.description}: ${runModel(a, false, hints)}, ${s.isRunning}`} width={W} height={66} />
          ))}
          {finished.length > 0 && doneHeader}
          {!p.isDoneCollapsed &&
            finished.map(a => (
              <Svg key={a.id} source={agentSvg(W, a, at, hints, usage)} alt={`${a.description}: ${runModel(a, false, hints)}, ${s.isFinished}`} width={W} height={66} />
            ))}
          {planned.length > 0 && section('h-plan', `${s.planned} · ${planned.length}`)}
          {planned.map(pl => (
            <Svg key={`plan-${pl.n}`} source={plannedSvg(W, pl, hints)} alt={`${pl.n}. ${pl.title}: ${s.isPlanned}`} width={W} height={46} />
          ))}
        </Box>
      )
    }

    // Terminal: the same content in text rows.
    const cols = Math.max(24, e.props.bodyColumns || 40)
    const barW = Math.max(6, Math.min(20, cols - 34))
    const row = (a: AgentRun) => {
      const tier = tierOf(a.type)
      const color = colorOf(tier)
      const ctx = ctxOf(a)
      const progress = progressOf(a)
      const model = runModel(a, true, hints)
      const note = stepLine(a, at)
      const steps = note ? `${note} · ` : ''
      return (
        <Box key={a.id} flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={color}>▣</Text>
            <Text bold wrap="truncate-end">
              {a.description || a.type}
            </Text>
            <Text color={a.status === 'failed' ? 'red' : a.status === 'done' ? 'green' : color}>{STATUS_GLYPH[a.status]}</Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            {'  '}
            {[tier === 'other' ? a.type : tier, model, a.round > 1 ? `${s.round} ${a.round}` : ''].filter(Boolean).join(' · ')}
          </Text>
          <Text wrap="truncate-end">
            {'  '}
            {progress === null ? <Text dimColor>{ctxBar(ctx, barW)}</Text>
              : isCountLeftOpen(a) ? <Text dimColor>{ctxBar(progress * 100, barW)}</Text>
              : <Text color={color}>{ctxBar(progress * 100, barW)}</Text>}
            <Text dimColor>
              {' '}
              {steps}{rowStats(a, usage, at)}
            </Text>
          </Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold wrap="truncate-end">
            {title}
          </Text>
          {toggleCompact}
        </Box>
        <Text dimColor>
          {summary}
        </Text>
        {themePicker}
        {languagePicker}
        {p.isCompact ? (
          <Text wrap="truncate-end">
            {[...running, ...finished].map(a => (
              <Text key={a.id} color={colorOf(tierOf(a.type))}>
                {STATUS_GLYPH[a.status]}{' '}
              </Text>
            ))}
            {planned.map(pl => (
              <Text key={`plan-${pl.n}`} dimColor>
                ◷{' '}
              </Text>
            ))}
          </Text>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {isEmpty && <Text dimColor>{s.empty}</Text>}
            {running.length > 0 && <Text dimColor>{s.running} · {running.length}</Text>}
            {running.map(row)}
            {finished.length > 0 && doneHeader}
            {!p.isDoneCollapsed && finished.map(row)}
            {planned.length > 0 && <Text dimColor>{s.planned} · {planned.length}</Text>}
            {planned.map(pl => {
              const waits = pl.after.length ? `${s.after} ${pl.after.join(', ')}` : ''
              return (
                <Box key={`plan-${pl.n}`} flexDirection="column" marginBottom={1}>
                  <Text dimColor wrap="truncate-end">
                    <Text color={colorOf(plannedTier(pl))}>▢</Text> {pl.n}. {pl.title} ◷
                  </Text>
                  <Text dimColor wrap="truncate-end">
                    {'  '}
                    {[plannedName(pl), plannedModel(pl, hints), waits].filter(Boolean).join(' · ')}
                  </Text>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, flow)
    if (f === null || e.props.hasSurvey) return next(e)
    await applyTheme($)

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    // The panel's rows: running, finished and planned.
    const crew = list.filter(isShown).length + plannedOf(f, list).length
    const active = runningOf(list)
    const crewButton = (
      <Button key="savvy-agents" label={`×${crew}`} plain onPress={() => void togglePane($)} />
    )
    const percent = `${Math.round(ratio(f, active) * 100)}%`
    const dismiss = (
      <Button
        key="savvy-dismiss"
        label="✕"
        plain
        role="dismiss"
        onPress={() => update($, flow, () => null)}
      />
    )

    if ('Svg' in ui) {
      const { Svg } = ui
      // About 8 CSS px per reported column: the width the row is drawn at. The
      // guess can run wider than the slot, so the Svg takes no size of its own:
      // its box shrinks to what the count and the dismiss leave, and the drawing
      // scales down to it by its viewBox.
      const width = Math.max(180, Math.min(1600, (e.props.bodyColumns || 100) * 8 - 96))
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Box flexGrow={1} flexShrink={1} minWidth={0}>
            <Svg source={rowSvg(f, width, active)} alt={`${f.title}: ${label(f, active)}, ${percent}`} />
          </Box>
          {crewButton}
          {dismiss}
        </Box>
      )
    }

    const cols = e.props.bodyColumns
    const titleW = Math.max(8, Math.min(30, f.title.length + 2, Math.floor(cols / 3)))
    const width = Math.max(6, Math.min(40, cols - titleW - 32))
    return (
      <Box flexDirection="row" gap={2}>
        <Box width={titleW} flexShrink={0}>
          <Text color={f.isFinished ? DONE : ACCENT}>● </Text>
          <Text wrap="truncate-end">{f.title}</Text>
        </Box>
        <Text color={f.isFinished ? DONE : ACCENT}>{barText(f, width, active)}</Text>
        <Text bold>{label(f, active)}</Text>
        <Text dimColor>{percent}</Text>
        {dressOf() ? <Text>{dressOf()?.glyph}</Text> : <Text color={CLAY}>▣</Text>}
        {crewButton}
        {dismiss}
      </Box>
    )
  })
}
