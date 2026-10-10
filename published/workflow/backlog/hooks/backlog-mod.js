// The backlog mod: `/backlog-dashboard` opens the register's dashboard in a Claude Code pane.
//
// The board is not computed here: a hooks module has no Node APIs, so the mod runs the skill's own
// `scripts/dashboard.mjs --json` (the same board the web page draws) and draws the snapshot it prints. Documents are
// read with `$.fs.read`. Nothing is stored: every open and every refresh asks the register and git again.
//
// Keys while the pane has focus: 1-6 switch view, r refreshes, b goes back, Tab/arrows move between rows, Enter
// opens the focused row, Esc closes.

const PANE = 'backlog-dashboard'
const COMMAND = 'backlog-dashboard'
/** How long the snapshot script may take: git log and every open entry's docs on a large register. */
const LOAD_TIMEOUT_MS = 60000
/** How often an open pane asks the register again. */
const REFRESH_MS = 60000
/** How many rows a list draws before it says how many more there are. */
const LIST_LIMIT = { overview: 5, docs: 60, activity: 40, links: 30 }
/** Phase states in drawing order, with the theme colour and the glyph of each. */
const PHASES = [
  { state: 'done', color: 'success', glyph: '█' },
  { state: 'active', color: 'warning', glyph: '█' },
  { state: 'planned', color: 'inactive', glyph: '░' },
  { state: 'dropped', color: 'subtle', glyph: '·' },
]
const PRIORITY_COLOR = { high: 'error', medium: 'warning', low: 'subtle' }
const STATUS_COLOR = { 'in-progress': 'warning', blocked: 'error', open: 'subtle' }

const WORDS = {
  en: {
    tabs: ['Overview', 'In progress', 'Next', 'To verify', 'Documents', 'Activity'],
    refresh: 'Refresh', back: 'Back', loading: 'Reading the register…', updated: 'updated',
    closed: 'Entries closed', phases: 'Phases done', of: (a, b) => `${a} of ${b}`,
    counts: (t) => `${t.inProgress} in progress · ${t.notStarted} not started · ${t.blocked} blocked · ${t.pending} to verify`,
    now: 'Working on now', inProgress: 'In progress', next: 'Next up', pending: 'To verify', activity: 'Recent commits', recentClosed: 'Recently closed',
    nextHint: 'What blocked entries wait on first, then the written priority, then the oldest. A hint: the move is the backlog review\'s call.',
    phasesOf: (d, n) => `${d}/${n} phases`, unblocks: (n) => `unblocks ${n}`, citedBy: (n) => `cited by ${n}`,
    noCommit: 'no commit names it yet', more: (n) => `… ${n} more`, nothing: 'Nothing here.',
    filter: 'Filter', filterHint: 'part of a path, Enter', docsOf: 'Documents', waitsOn: 'Waits on', unblocksL: 'Unblocks',
    cites: 'Cites', citedByL: 'Cited by', usedBy: 'Entries linking it', linksIn: 'Links in this document',
    notFound: 'Not found', failed: 'The dashboard could not read the register:',
    groups: { register: 'Register', work: 'Work docs', architecture: 'Architecture', archive: 'Archive', other: 'Other' },
    states: { done: 'done', active: 'in progress', planned: 'not started', dropped: 'dropped' },
    statuses: { 'in-progress': 'in progress', open: 'open', blocked: 'blocked' },
    priorities: { high: 'high', medium: 'medium', low: 'low' },
    command: 'Open the backlog dashboard: progress, work in progress, next, documents',
  },
  it: {
    tabs: ['Panoramica', 'In corso', 'Prossimi', 'Da verificare', 'Documenti', 'Attività'],
    refresh: 'Aggiorna', back: 'Indietro', loading: 'Leggo il registro…', updated: 'aggiornato',
    closed: 'Voci chiuse', phases: 'Fasi completate', of: (a, b) => `${a} su ${b}`,
    counts: (t) => `${t.inProgress} in corso · ${t.notStarted} da iniziare · ${t.blocked} bloccate · ${t.pending} da verificare`,
    now: 'Ci si sta lavorando', inProgress: 'In corso', next: 'Prossimi', pending: 'Da verificare', activity: 'Commit recenti', recentClosed: 'Chiuse di recente',
    nextHint: 'Prima ciò che le voci bloccate aspettano, poi la priorità scritta, poi la più vecchia. È un suggerimento: la mossa la decide la revisione del backlog.',
    phasesOf: (d, n) => `${d}/${n} fasi`, unblocks: (n) => `sblocca ${n}`, citedBy: (n) => `citata da ${n}`,
    noCommit: 'nessun commit la nomina ancora', more: (n) => `… altre ${n}`, nothing: 'Niente qui.',
    filter: 'Filtro', filterHint: 'parte di un percorso, Invio', docsOf: 'Documenti', waitsOn: 'Aspetta', unblocksL: 'Sblocca',
    cites: 'Cita', citedByL: 'Citata da', usedBy: 'Voci che lo collegano', linksIn: 'Link nel documento',
    notFound: 'Non trovato', failed: 'La dashboard non è riuscita a leggere il registro:',
    groups: { register: 'Registro', work: 'Documenti di lavoro', architecture: 'Architettura', archive: 'Archivio', other: 'Altri' },
    states: { done: 'fatta', active: 'in corso', planned: 'da iniziare', dropped: 'scartata' },
    statuses: { 'in-progress': 'in corso', open: 'aperta', blocked: 'bloccata' },
    priorities: { high: 'alta', medium: 'media', low: 'bassa' },
    command: 'Apri la dashboard del backlog: avanzamento, lavori in corso, prossimi, documenti',
  },
}

/** The language of the machine's locale, among those the mod has words for. */
function language() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase()
    return locale.startsWith('it') ? 'it' : 'en'
  } catch {
    return 'en'
  }
}
const LANG = language()
const T = WORDS[LANG]

// ─── what the pane shows ─────────────────────────────────────────────────────────────────────────────────────────
let snapshot = null // { root, board, tree } from dashboard.mjs --json
let failure = ''
let loading = false
let loadedAt = 0
let isOpen = false
let view = { name: 'overview' } // overview | progress | next | pending | docs | activity | entry {id} | doc {path, text}
let trail = [] // the views Back returns to
let docFilter = ''

const TAB_VIEWS = ['overview', 'progress', 'next', 'pending', 'docs', 'activity']

// ─── pure helpers ────────────────────────────────────────────────────────────────────────────────────────────────
const clip = (text, width) => {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  return width > 1 && s.length > width ? s.slice(0, width - 1) + '…' : s
}
/** Markdown reduced to its words, for a one-line label. */
const plain = (text) =>
  String(text ?? '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`]/g, '')
/** The note a Status carries after its word (`in-progress — step 2` → `step 2`). */
const statusNote = (text) => {
  const m = /^[^—–]*?[—–]\s*([\s\S]*)$/.exec(text ?? '')
  return m ? m[1] : ''
}
const phaseTotal = (c) => PHASES.reduce((n, p) => n + (c[p.state] ?? 0), 0)
const percent = (a, b) => (b ? Math.round((100 * a) / b) : 0)

const STEPS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
function ago(iso, nowMs) {
  if (!iso) return ''
  const seconds = (new Date(iso).getTime() - nowMs) / 1000
  try {
    const rtf = new Intl.RelativeTimeFormat(LANG, { numeric: 'auto' })
    for (const [unit, size] of STEPS) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
    return rtf.format(0, 'minute')
  } catch {
    return String(iso).slice(0, 10)
  }
}

/** A root-relative path joined from a document's folder and a link in it. */
function resolvePath(baseDir, link) {
  let raw = link
  try {
    raw = decodeURIComponent(link)
  } catch {
    // a link with a stray % stays as written
  }
  const parts = (raw.startsWith('/') ? raw.slice(1) : (baseDir ? baseDir + '/' : '') + raw).split('/')
  const out = []
  for (const p of parts) {
    if (p === '' || p === '.') continue
    if (p === '..') out.pop()
    else out.push(p)
  }
  return out.join('/')
}
const dirOf = (p) => p.split('/').slice(0, -1).join('/')
const fileUrl = (root, rel) => 'file:///' + encodeURI((root.replace(/\\/g, '/') + '/' + rel).replace(/^\/+/, ''))

/**
 * A document's markdown with its links made pressable: a relative link becomes a `file:` URL (the only local scheme
 * Markdown draws as a link), an entry id a link to the register at that entry. Returns the text and the targets.
 */
function prepareMarkdown(text, baseDir, snap) {
  const registerUrl = fileUrl(snap.root, snap.board.project.backlog)
  const targets = []
  const linked = String(text).replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, bang, label, href) => {
    if (/^([a-z]+:|#)/i.test(href)) return whole
    const [file, anchor] = href.split('#')
    const rel = resolvePath(baseDir, file)
    const url = fileUrl(snap.root, rel) + (anchor ? '#' + anchor : '')
    if (/\.md$/i.test(rel)) targets.push({ kind: 'doc', path: rel, label: label || rel, href: url })
    return `${bang}[${label}](${url})`
  }).replace(/\[\[(BKLG-\d+)\]\]/g, (whole, id) => {
    const url = `${registerUrl}#${id}`
    targets.push({ kind: 'entry', id, label: id, href: url })
    return `[${id}](${url})`
  })
  return { text: linked, targets }
}

/** What a pressed link in the pane means: an entry, a document of the project, or nothing of ours. */
function linkTarget(href, snap) {
  const entry = /#(BKLG-\d+)$/.exec(href)
  if (entry) return { kind: 'entry', id: entry[1] }
  const prefix = fileUrl(snap.root, '')
  if (!href.startsWith(prefix)) return null
  let rel = href.slice(prefix.length).split('#')[0]
  try {
    rel = decodeURI(rel)
  } catch {
    // keep it encoded
  }
  return /\.md$/i.test(rel) ? { kind: 'doc', path: rel } : null
}

// ─── reading the register ────────────────────────────────────────────────────────────────────────────────────────
/** Ask the skill's script for a fresh snapshot of the register; the pane redraws when it lands. */
async function load($) {
  if (loading) return
  loading = true
  $.ui.invalidate('ui.render')
  try {
    const root = await $.session.cwd()
    const run = await $.process.run(['node', $.plugin.root + '/scripts/dashboard.mjs', '--json', '--root', root], {
      timeoutMs: LOAD_TIMEOUT_MS,
    })
    if (run.exitCode !== 0) throw new Error((run.stderr || run.stdout || `exit ${run.exitCode}`).trim())
    snapshot = JSON.parse(run.stdout)
    loadedAt = await $.clock.now()
    failure = ''
  } catch (error) {
    failure = String(error?.message ?? error)
  } finally {
    loading = false
    $.ui.invalidate('ui.render')
  }
}

/** Move to a view, remembering where Back returns. */
function go($, next) {
  trail = [...trail, view].slice(-30)
  view = next
  $.ui.invalidate('ui.render')
}

function goBack($) {
  view = trail.length ? trail[trail.length - 1] : { name: 'overview' }
  trail = trail.slice(0, -1)
  $.ui.invalidate('ui.render')
}

/** Open a document of the project in the pane. */
async function openDoc($, path) {
  let text
  try {
    text = await $.fs.read(snapshot.root + '/' + path)
  } catch (error) {
    text = `**${T.notFound}**: \`${path}\` — ${String(error?.message ?? error)}`
  }
  go($, { name: 'doc', path, text })
}

// ─── vector drawing ──────────────────────────────────────────────────────────────────────────────────────────────
// Surfaces that draw `Svg` (the desktop app) get rings, rounded bars and tiles instead of runs of block characters. The
// drawing is an image: rows that must be pressed stay `Button`s around it, and the colours follow the system's light or
// dark scheme through the stylesheet inside the image.
/** Fills of the phase states and of the status tiles. */
const INK = { green: '#3fb950', amber: '#d29922', grey: '#6e7681', red: '#f85149', blue: '#58a6ff', dropped: '#484f58' }
const STATE_INK = { done: INK.green, active: INK.amber, planned: INK.grey, dropped: INK.dropped }
/** Width of every drawing, in CSS pixels; the surface shrinks it to the pane. */
const SVG_WIDTH = 540

const hasSvg = (el) => typeof el.Svg === 'function'
const xml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** One SVG document: the shared stylesheet (text, muted text, card and track colours, light and dark) and a body. */
function svgDocument(height, body) {
  const style =
    '.t{fill:#e6edf3}.m{fill:#8b949e}.c{fill:rgba(255,255,255,.05);stroke:rgba(255,255,255,.12)}.k{stroke:rgba(255,255,255,.14)}' +
    '@media (prefers-color-scheme: light){.t{fill:#1f2328}.m{fill:#656d76}.c{fill:rgba(0,0,0,.03);stroke:rgba(0,0,0,.12)}.k{stroke:rgba(0,0,0,.14)}}'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${height}" width="${SVG_WIDTH}" height="${height}" ` +
    `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"><style>${style}</style>${body}</svg>`
  )
}

/** A rounded bar split into one segment per phase state; an empty track when there is nothing to count. */
function segmentedBar(x, y, width, height, counts, clipId) {
  const total = phaseTotal(counts)
  const track = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="none" class="k"/>`
  if (!total) return track
  let at = 0
  const segments = PHASES.map((p) => {
    const n = counts[p.state] ?? 0
    if (!n) return ''
    const w = (n / total) * width
    const rect = `<rect x="${(x + at).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${height}" fill="${STATE_INK[p.state]}"/>`
    at += w
    return rect
  }).join('')
  return (
    `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}"/></clipPath>` +
    `<g clip-path="url(#${clipId})">${segments}</g>${track}`
  )
}

/** A progress ring with its percentage in the middle and a caption under it. */
function progressRing(cx, cy, radius, pct, color, caption, detail) {
  const circle = 2 * Math.PI * radius
  const arc = (circle * Math.max(0, Math.min(100, pct))) / 100
  return (
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" class="k" stroke-width="9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" ` +
    `stroke-dasharray="${arc.toFixed(1)} ${circle.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` +
    `<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="21" font-weight="700" class="t">${pct}%</text>` +
    `<text x="${cx}" y="${cy + radius + 24}" text-anchor="middle" font-size="13" font-weight="600" class="t">${xml(caption)}</text>` +
    `<text x="${cx}" y="${cy + radius + 41}" text-anchor="middle" font-size="12" class="m">${xml(detail)}</text>`
  )
}

/** A big number with its label under it. */
const statTile = (x, y, value, label, color) =>
  `<text x="${x}" y="${y}" font-size="28" font-weight="700" fill="${color}">${value}</text>` +
  `<text x="${x}" y="${y + 19}" font-size="12" class="m">${xml(label)}</text>`

/** The overview's header card: two rings and the four counts. */
function overviewCard(t) {
  const all = t.open + t.closed
  const counted = phaseTotal(t.phases) - (t.phases.dropped ?? 0)
  const body =
    `<rect x="0.5" y="0.5" width="${SVG_WIDTH - 1}" height="177" rx="14" class="c"/>` +
    progressRing(78, 66, 40, percent(t.closed, all), INK.green, T.closed, T.of(t.closed, all)) +
    progressRing(222, 66, 40, percent(t.phases.done, counted), INK.amber, T.phases, T.of(t.phases.done, counted)) +
    `<line x1="302" y1="24" x2="302" y2="154" class="k"/>` +
    statTile(330, 56, t.inProgress, T.statuses['in-progress'], INK.amber) +
    statTile(440, 56, t.notStarted, T.states.planned, '#8b949e') +
    statTile(330, 124, t.blocked, T.statuses.blocked, t.blocked ? INK.red : '#8b949e') +
    statTile(440, 124, t.pending, T.pending, INK.blue)
  return svgDocument(178, body)
}

/** The strip under an entry's title: its phase bar, the facts, the priority at the right edge. */
function entryStrip(e, facts) {
  const priority = e.priority ? T.priorities[e.priority] ?? e.priority : ''
  const body =
    segmentedBar(2, 9, 150, 8, e.phaseCounts, 'strip') +
    `<text x="168" y="17" font-size="12" class="m">${xml(clip(facts, 52))}</text>` +
    (priority
      ? `<text x="${SVG_WIDTH - 4}" y="17" font-size="12" font-weight="600" text-anchor="end" fill="${{ high: INK.red, medium: INK.amber, low: INK.grey }[e.priority] ?? INK.grey}">${xml(priority)}</text>`
      : '')
  return svgDocument(26, body)
}

/**
 * The entry worked on last: the newest commit that names an entry of the register, whatever the entry's status says
 * (work is often committed under an entry still marked open).
 */
function currentWork() {
  const b = snapshot.board
  for (const commit of b.activity) {
    const entry = commit.ids.map((id) => b.entries.find((x) => x.id === id)).find(Boolean)
    if (entry) return { entry, commit }
  }
  return null
}

/** The current entry's phases as one rounded block each, named under it, with the live phase and the last commit. */
function phaseTrack(e, commit, now) {
  const phases = e.phases
  const gap = 4
  const inner = SVG_WIDTH - 8
  const w = phases.length ? (inner - gap * (phases.length - 1)) / phases.length : inner
  const done = e.phaseCounts.done ?? 0
  const counted = phaseTotal(e.phaseCounts) - (e.phaseCounts.dropped ?? 0)
  const blocks = phases
    .map((p, i) => {
      const x = 4 + i * (w + gap)
      const fill = STATE_INK[p.state] ?? INK.grey
      const bold = p.state === 'active' ? ' font-weight="700" class="t"' : ' class="m"'
      return (
        `<rect x="${x.toFixed(1)}" y="26" width="${w.toFixed(1)}" height="10" rx="5" fill="${fill}" opacity="${p.state === 'planned' ? 0.45 : 1}"/>` +
        `<text x="${(x + w / 2).toFixed(1)}" y="52" font-size="10.5" text-anchor="middle"${bold}>${xml(clip(p.name, Math.max(2, Math.floor(w / 6))))}</text>`
      )
    })
    .join('')
  const active = phases.find((p) => p.state === 'active')
  const live = active ? `${active.name} · ${plain(active.label)}` : ''
  const body =
    `<text x="4" y="16" font-size="12" font-weight="600" class="t">${xml(T.phasesOf(done, counted))}</text>` +
    blocks +
    (live ? `<text x="4" y="74" font-size="12.5" font-weight="600" fill="${INK.amber}">${xml(clip(live, 78))}</text>` : '') +
    `<text x="4" y="94" font-size="12" class="m">${xml(clip(`${ago(commit.date, now)} · ${commit.subject}`, 82))}</text>`
  return svgDocument(104, body)
}

/** "Now": the entry worked on last, as a card on the surfaces that draw one and a short text elsewhere. */
function nowCard($, el, width, now) {
  const current = currentWork()
  if (!current) return []
  const { entry: e, commit } = current
  const title = el.Button({ key: 'now-' + e.id, label: clip(`${e.id}  ${plain(e.title)}`, width - 2), plain: true, onPress: () => go($, { name: 'entry', id: e.id }) })
  if (hasSvg(el) && e.phases.length) {
    return [heading(el, T.now), card(el, [title, el.Svg({ source: phaseTrack(e, commit, now), alt: `${e.id}: ${commit.subject}` })]), blank(el)]
  }
  const marks = e.phases.map((p) => (p.state === 'done' ? '●' : p.state === 'active' ? '◐' : '○')).join('')
  return [heading(el, T.now), title, dim(el, clip(`${marks}  ${ago(commit.date, now)} · ${commit.subject}`, width)), blank(el)]
}

/** The pane's title bar: the project, the register's path, and when the board was read. */
function titleBar(name, register, when) {
  const body =
    `<text x="4" y="22" font-size="18" font-weight="700" class="t">${xml(name)}</text>` +
    `<text x="4" y="40" font-size="12" class="m">${xml(register)}</text>` +
    `<text x="${SVG_WIDTH - 4}" y="22" font-size="12" text-anchor="end" class="m">${xml(when)}</text>`
  return svgDocument(48, body)
}

/** An entry's phase bar with its count, on the entry's own page. */
function phaseSummary(counts, label) {
  const body = segmentedBar(2, 9, 300, 8, counts, 'phases') + `<text x="318" y="17" font-size="12" class="m">${xml(label)}</text>`
  return svgDocument(26, body)
}

/** A bordered card around an entry's rows, on the surfaces that draw a border as a box. */
const card = (el, children) =>
  el.Box({ flexDirection: 'column', borderStyle: 'round', borderColor: 'inactive', paddingX: 1, children })

// ─── drawing ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** A progress bar: one coloured run of cells per state. */
function bar(el, counts, width) {
  const total = phaseTotal(counts)
  if (!total || width < 4) return el.Text({ children: [''] })
  let used = 0
  const runs = PHASES.map((p, i) => {
    const n = counts[p.state] ?? 0
    const cells = i === PHASES.length - 1 ? width - used : Math.round((n / total) * width)
    used += cells
    return el.Text({ color: p.color, children: [p.glyph.repeat(Math.max(0, cells))] })
  })
  return el.Box({ flexDirection: 'row', children: runs })
}

const heading = (el, text) => el.Text({ bold: true, children: [text] })
const dim = (el, text) => el.Text({ dimColor: true, children: [text] })
const blank = (el) => el.Text({ children: [' '] })

function chips(el, e) {
  const parts = []
  if (e.status) parts.push(el.Text({ color: STATUS_COLOR[e.status] ?? 'subtle', children: [T.statuses[e.status] ?? e.status] }))
  if (e.priority) parts.push(el.Text({ color: PRIORITY_COLOR[e.priority] ?? 'subtle', children: [T.priorities[e.priority] ?? e.priority] }))
  return el.Box({ flexDirection: 'row', columnGap: 2, children: parts })
}

/** One entry as a pressable row, with its phases and last commit under it. */
function entryRow($, el, e, width, now) {
  const total = phaseTotal(e.phaseCounts)
  const active = e.phases.find((p) => p.state === 'active')
  const facts = [
    total ? T.phasesOf(e.phaseCounts.done, total - (e.phaseCounts.dropped ?? 0)) : '',
    active ? `${active.name} ${plain(active.label)}` : '',
    e.last ? ago(e.last.date, now) : T.noCommit,
  ].filter(Boolean).join(' · ')
  const title = el.Button({ key: 'entry-' + e.id, label: clip(`${e.id}  ${plain(e.title)}`, width - 2), plain: true, onPress: () => go($, { name: 'entry', id: e.id }) })
  if (hasSvg(el)) return card(el, [title, el.Svg({ source: entryStrip(e, facts), alt: `${e.id}: ${facts}` })])
  return el.Box({
    flexDirection: 'column',
    children: [
      title,
      el.Box({
        flexDirection: 'row',
        columnGap: 1,
        children: [el.Text({ children: ['   '] }), ...(total ? [bar(el, e.phaseCounts, 12)] : []), dim(el, clip(facts, width - 18))],
      }),
    ],
  })
}

const entryOf = (id) => snapshot.board.entries.find((e) => e.id === id)

function overview($, el, width, now) {
  const b = snapshot.board
  const t = b.totals
  const all = t.open + t.closed
  const counted = phaseTotal(t.phases) - (t.phases.dropped ?? 0)
  const barWidth = Math.max(10, Math.min(48, width - 30))
  const inProgress = b.inProgress.map(entryOf)
  const summary = hasSvg(el)
    ? [el.Svg({ source: overviewCard(t), alt: `${T.closed} ${percent(t.closed, all)}%, ${T.phases} ${percent(t.phases.done, counted)}%, ${T.counts(t)}` })]
    : [
        el.Box({ flexDirection: 'row', columnGap: 2, children: [heading(el, `${T.closed} ${percent(t.closed, all)}%`), dim(el, T.of(t.closed, all))] }),
        bar(el, { done: t.closed, active: t.inProgress, planned: t.notStarted, dropped: t.blocked }, barWidth),
        el.Box({ flexDirection: 'row', columnGap: 2, children: [heading(el, `${T.phases} ${percent(t.phases.done, counted)}%`), dim(el, T.of(t.phases.done, counted))] }),
        bar(el, t.phases, barWidth),
        dim(el, T.counts(t)),
      ]
  return [
    ...summary,
    blank(el),
    ...nowCard($, el, width, now),
    heading(el, `${T.inProgress} · ${inProgress.length}`),
    ...inProgress.slice(0, LIST_LIMIT.overview).map((e) => entryRow($, el, e, width, now)),
    ...(inProgress.length > LIST_LIMIT.overview ? [dim(el, T.more(inProgress.length - LIST_LIMIT.overview))] : []),
    blank(el),
    heading(el, `${T.next} · ${b.next.length}`),
    ...b.next.slice(0, LIST_LIMIT.overview).map((n) => nextRow($, el, n, width)),
  ]
}

function nextRow($, el, n, width) {
  const e = entryOf(n.id)
  const why = [n.unblocks ? T.unblocks(n.unblocks) : '', n.citedBy ? T.citedBy(n.citedBy) : '', n.added ?? ''].filter(Boolean).join(' · ')
  const rows = [
    el.Box({
      flexDirection: 'row',
      columnGap: 2,
      children: [
        el.Button({ key: 'next-' + n.id, label: clip(`${n.id}  ${plain(e.title)}`, width - 10), plain: true, onPress: () => go($, { name: 'entry', id: n.id }) }),
        el.Text({ color: PRIORITY_COLOR[n.priority] ?? 'subtle', bold: true, children: [T.priorities[n.priority] ?? ''] }),
      ],
    }),
    dim(el, why),
  ]
  return hasSvg(el) ? card(el, rows) : el.Box({ flexDirection: 'column', children: [rows[0], dim(el, '   ' + why)] })
}

function progressView($, el, width, now) {
  const list = snapshot.board.inProgress.map(entryOf)
  return list.length ? list.map((e) => entryRow($, el, e, width, now)) : [dim(el, T.nothing)]
}

function nextView($, el, width) {
  return [dim(el, T.nextHint), blank(el), ...snapshot.board.next.map((n) => nextRow($, el, n, width))]
}

function pendingView($, el, width) {
  const rows = []
  for (const ledger of snapshot.board.pending) {
    rows.push(heading(el, ledger.kind))
    ledger.items.forEach((item, i) => {
      const label = clip(`${item.label ? '[' + item.label + '] ' : ''}${plain(item.text)}`, width - 2)
      rows.push(item.ids.length
        ? el.Button({ key: `pending-${ledger.kind}-${i}`, label, plain: true, onPress: () => go($, { name: 'entry', id: item.ids[0] }) })
        : el.Text({ children: [label] }))
    })
    rows.push(blank(el))
  }
  return rows.length ? rows : [dim(el, T.nothing)]
}

function activityView($, el, width, now) {
  const b = snapshot.board
  const commits = b.activity.slice(0, LIST_LIMIT.activity).map((c, i) =>
    c.ids.length
      ? el.Button({ key: 'commit-' + i, label: clip(`${c.sha.slice(0, 7)}  ${c.subject}`, width - 2), plain: true, onPress: () => go($, { name: 'entry', id: c.ids[0] }) })
      : dim(el, clip(`${c.sha.slice(0, 7)}  ${c.subject}`, width - 2)))
  const closed = b.closed.slice(0, LIST_LIMIT.overview * 2).map((c) =>
    el.Box({ flexDirection: 'row', columnGap: 2, children: [dim(el, c.day ?? '          '), el.Text({ children: [clip(`${c.id}${c.phase ? ' ' + c.phase : ''}  ${plain(c.title)}`, width - 14)] })] }))
  return [heading(el, T.activity), ...commits, blank(el), heading(el, T.recentClosed), ...closed]
}

function docsView($, el, width) {
  const f = docFilter.trim().toLowerCase()
  const rows = [
    el.Input({
      key: 'doc-filter',
      label: T.filter,
      placeholder: T.filterHint,
      value: docFilter,
      submitLabel: T.filter.toLowerCase(),
      onSubmit: (value) => {
        docFilter = value
        $.ui.invalidate('ui.render')
      },
    }),
    blank(el),
  ]
  let shown = 0
  for (const { group, docs } of snapshot.tree) {
    const matching = docs.filter((d) => !f || d.toLowerCase().includes(f))
    if (!matching.length) continue
    rows.push(el.Box({ flexDirection: 'row', columnGap: 1, children: [heading(el, T.groups[group] ?? group), dim(el, String(matching.length))] }))
    for (const d of matching) {
      if (shown >= LIST_LIMIT.docs) break
      shown += 1
      rows.push(el.Button({ key: 'doc-' + d, label: clip(d, width - 2), plain: true, onPress: () => openDoc($, d) }))
    }
  }
  const total = snapshot.tree.reduce((n, g) => n + g.docs.filter((d) => !f || d.toLowerCase().includes(f)).length, 0)
  if (total > shown) rows.push(dim(el, T.more(total - shown)))
  return rows
}

/** Buttons for a list of entries (links of an entry: waits on, cites…). */
function entryButtons($, el, label, ids, prefix) {
  if (!ids.length) return []
  return [
    el.Box({
      flexDirection: 'row',
      columnGap: 2,
      flexWrap: 'wrap',
      children: [dim(el, label + ':'), ...ids.map((id) => el.Button({ key: `${prefix}-${id}`, label: id, plain: true, onPress: () => go($, { name: 'entry', id }) }))],
    }),
  ]
}

function markdown($, el, key, text, baseDir) {
  const prepared = prepareMarkdown(text, baseDir, snapshot)
  return {
    element: el.Markdown({
      key,
      text: prepared.text,
      pressableLinks: prepared.targets.map((t) => t.href).slice(0, 256),
      onLinkPress: (link) => {
        const target = linkTarget(link.href, snapshot)
        if (target?.kind === 'entry') go($, { name: 'entry', id: target.id })
        else if (target?.kind === 'doc') openDoc($, target.path)
      },
    }),
    targets: prepared.targets,
  }
}

function entryView($, el, width, now) {
  const e = entryOf(view.id)
  if (!e) {
    const c = snapshot.board.closed.find((x) => x.id === view.id && !x.phase)
    if (!c) return [el.Text({ color: 'error', children: [`${T.notFound}: ${view.id}`] })]
    return [heading(el, `${c.id}  ${plain(c.title)}`), markdown($, el, 'closed-md', c.text, snapshot.board.project.docsDir).element]
  }
  const body = e.block.split(/\r?\n/).slice(1).join('\n')
  const total = phaseTotal(e.phaseCounts)
  const rows = [
    heading(el, clip(`${e.id}  ${plain(e.title)}`, width)),
    el.Box({ flexDirection: 'row', columnGap: 2, children: [chips(el, e), dim(el, e.last ? `${ago(e.last.date, now)} · ${clip(e.last.subject, width - 30)}` : T.noCommit)] }),
    blank(el),
  ]
  if (total) {
    const phasesOf = T.phasesOf(e.phaseCounts.done, total - (e.phaseCounts.dropped ?? 0))
    rows.push(hasSvg(el)
      ? el.Svg({ source: phaseSummary(e.phaseCounts, `${T.phases} · ${phasesOf}`), alt: `${T.phases}: ${phasesOf}` })
      : el.Box({ flexDirection: 'row', columnGap: 2, children: [heading(el, T.phases), bar(el, e.phaseCounts, 24), dim(el, phasesOf)] }))
    for (const p of e.phases) {
      const color = PHASES.find((x) => x.state === p.state)?.color ?? 'subtle'
      rows.push(el.Box({
        flexDirection: 'row',
        columnGap: 1,
        children: [el.Text({ color, children: ['●'] }), el.Text({ bold: true, children: [p.name] }), el.Text({ children: [clip(plain(p.label), width - p.name.length - 6)] })],
      }))
    }
    rows.push(blank(el))
  }
  if (e.docs.length) {
    rows.push(el.Box({
      flexDirection: 'row',
      columnGap: 2,
      flexWrap: 'wrap',
      children: [dim(el, T.docsOf + ':'), ...e.docs.map((d) => el.Button({ key: 'edoc-' + d.path, label: d.label, plain: true, onPress: () => openDoc($, d.path) }))],
    }))
  }
  rows.push(
    ...entryButtons($, el, T.waitsOn, e.waitsOn, 'wait'),
    ...entryButtons($, el, T.unblocksL, e.unblocks, 'unblock'),
    ...entryButtons($, el, T.cites, e.cites, 'cite'),
    ...entryButtons($, el, T.citedByL, e.citedBy, 'citedby'),
    blank(el),
    markdown($, el, 'entry-md', body, snapshot.board.project.docsDir).element,
  )
  return rows
}

function docView($, el, width) {
  const usedBy = snapshot.board.entries.filter((e) => e.docs.some((d) => d.path === view.path)).map((e) => e.id)
  const md = markdown($, el, 'doc-md', view.text, dirOf(view.path))
  const docTargets = [...new Map(md.targets.filter((t) => t.kind === 'doc').map((t) => [t.path, t])).values()].slice(0, LIST_LIMIT.links)
  return [
    dim(el, clip(view.path, width)),
    ...entryButtons($, el, T.usedBy, usedBy, 'usedby'),
    blank(el),
    md.element,
    ...(docTargets.length
      ? [blank(el), heading(el, T.linksIn), ...docTargets.map((t) => el.Button({ key: 'link-' + t.path, label: clip(t.path, width - 2), plain: true, onPress: () => openDoc($, t.path) }))]
      : []),
  ]
}

/** The row of tabs and the pane's own keys. */
function header($, el, width, now) {
  const active = view.name === 'entry' || view.name === 'doc' ? null : view.name
  const tabs = TAB_VIEWS.map((name, i) =>
    el.Button({
      key: 'tab-' + name,
      label: T.tabs[i],
      hotkey: String(i + 1),
      plain: true,
      dimColor: active !== name,
      onPress: () => {
        trail = []
        view = { name }
        $.ui.invalidate('ui.render')
      },
    }))
  const actions = [el.Button({ key: 'refresh', label: T.refresh, hotkey: 'r', plain: true, onPress: () => load($) })]
  if (!active) actions.unshift(el.Button({ key: 'back', label: T.back, hotkey: 'b', plain: true, onPress: () => goBack($) }))
  const project = snapshot ? `${snapshot.board.project.name} · ${snapshot.board.project.backlog}` : ''
  const when = loading ? T.loading : loadedAt ? `${T.updated} ${ago(new Date(loadedAt).toISOString(), now)}` : ''
  const title = hasSvg(el) && snapshot
    ? el.Svg({ source: titleBar(snapshot.board.project.name, snapshot.board.project.backlog, when), alt: `${project} ${when}` })
    : el.Box({ flexDirection: 'row', columnGap: 2, children: [heading(el, clip(project, width - 24)), dim(el, when)] })
  return [
    title,
    el.Box({ flexDirection: 'row', columnGap: 2, flexWrap: 'wrap', children: [...tabs, ...actions] }),
    blank(el),
  ]
}

/** The body of the current view. A switch, not a table: the mods API is passed only by name to a top-level function. */
function viewBody($, el, width, now) {
  switch (view.name) {
    case 'progress': return progressView($, el, width, now)
    case 'next': return nextView($, el, width)
    case 'pending': return pendingView($, el, width)
    case 'docs': return docsView($, el, width)
    case 'activity': return activityView($, el, width, now)
    case 'entry': return entryView($, el, width, now)
    case 'doc': return docView($, el, width)
    default: return overview($, el, width, now)
  }
}

// ─── hooks ───────────────────────────────────────────────────────────────────────────────────────────────────────
export function register(on) {
  on('session.start', async ($, e, next) => {
    $.clock.every(REFRESH_MS, () => {
      if (isOpen) load($)
    })
    try {
      await $.command.register({ name: COMMAND, description: T.command, immediate: true })
    } catch (error) {
      $.ui.log(`/${COMMAND} not registered: ${String(error?.message ?? error)}`)
    }
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($) => {
    isOpen = true
    await $.ui.open({ id: PANE, title: 'Backlog', focus: true, closeOnEscape: true })
    // The pane draws "reading the register" until the snapshot lands; the hook's own time excludes the wait.
    await load($)
    return {}
  }).catch(($, e, next) => {
    // The pane could not open: say so in the transcript rather than leave the command silent.
    return { text: `/${COMMAND}: ${next.error?.message ?? 'failed'}` }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) isOpen = false
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const el = $.ui.resolve(e)
    const width = Math.max(30, e.props.bodyColumns ?? 80)
    const now = await $.clock.now()
    const head = header($, el, width, now)
    let body
    if (failure && !snapshot) body = [el.Text({ color: 'error', children: [T.failed] }), dim(el, failure)]
    else if (!snapshot) body = [dim(el, T.loading)]
    else body = viewBody($, el, width, now)
    if (failure && snapshot) body = [el.Text({ color: 'error', children: [clip(`${T.failed} ${failure}`, width)] }), ...body]
    return el.Box({ flexDirection: 'column', children: [...head, ...body] })
  })
}
