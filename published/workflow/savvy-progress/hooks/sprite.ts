// Pixel Clawd from DockCrab (Clawdy): a 24×18 crab on a 30×28 grid, one costume per tier.
// The body keeps the brand clay; the tier's color lives in the costume's accent.
export const CLAY = '#D97757'
export const INK = '#1F1E1D'

// `cls` puts a pixel in a named group: `bd` (the default) is the body and its
// costume, `la`/`lb` the leg pairs, anything else a prop with its own motion.
// A color written `.name` is painted by that CSS class instead, so it can change
// with the color scheme.
export type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

// One costume: draws the crab and what it wears; `t` is the tier's color.
export type Costume = (f: Fill, t: string) => void

export const stamp = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => map[ch] && f(x + dx, y + dy, 1, 1, map[ch] ?? '', cls)))

export const mirror = (rows: string[]): string[] => rows.map(r => [...r].reverse().join(''))

// How a costume recolors the crab itself: `none` leaves the part out, `eyeCls`
// puts the eyes in a group of their own (drawn over the costume).
export type Look = { body?: string; claws?: string; legs?: string; eyes?: string; eyeCls?: string }

// A body: the crab, or the Codex figure drawn in its place; `armCls` lets a raised
// claw travel with the prop it holds.
export type Body = (f: Fill, armFront?: number, armCls?: string, look?: Look) => void

const drawCrab: Body = (f, armFront = 0, armCls, look = {}) => {
  const body = look.body ?? CLAY
  const claws = look.claws ?? body
  const legs = look.legs ?? body
  const eyes = look.eyes ?? INK
  f(7, 10, 16, 12, body)
  f(3, 14, 4, 4, claws)
  f(23, 14 + armFront, 4, 4, claws, armCls)
  if (eyes !== 'none') {
    f(9, 12, 2, 2, eyes, look.eyeCls)
    f(19, 12, 2, 2, eyes, look.eyeCls)
  }
  if (legs === 'none') return
  f(7, 22, 2, 4, legs, 'la')
  f(17, 22, 2, 4, legs, 'la')
  f(11, 22, 2, 4, legs, 'lb')
  f(21, 22, 2, 4, legs, 'lb')
}

// The body every costume draws on: the crab, unless `withBody` swaps it.
let current: Body = drawCrab

export const crabBody: Body = (f, armFront, armCls, look) => current(f, armFront, armCls, look)

// Runs `draw` with `body` in the crab's place, so any costume fits it unchanged.
export const withBody = <T>(body: Body, draw: () => T): T => {
  const previous = current
  current = body
  try {
    return draw()
  } finally {
    current = previous
  }
}

// The Codex figure: a pixel homage to its mark, a rounded cloud with a terminal
// prompt `>_` for a face, on the crab's footprint (body 7..22 x 10..21, hands at the
// claws, feet at the legs). Light, edged in ink, so it reads on either pane.
export const CODEX_BODY = '#ECECF1'

const CLOUD = [
  '....kkkkkkkk....',
  '.kkkwwwwwwwwkkk.',
  'kwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwk',
  '.kwwwwwwwwwwwwk.',
  '..kkkkkkkkkkkk..',
]
// Mittens edged in ink on their outer side only, so their light shows on a dark pane too.
const HAND = ['.kww', 'kwww', 'kwww', '.kww']

// `stamp`, with each row's runs of one color drawn as one rect: fewer rects to redraw.
const stampRuns = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; ) {
      const ch = row[dx] ?? '.'
      let w = 1
      while (row[dx + w] === ch) w++
      const c = map[ch]
      if (c) f(x + dx, y + dy, w, 1, c, cls)
      dx += w
    }
  })
const PROMPT = ['kk.', '.kk', 'kk.']

export const codexBody: Body = (f, armFront = 0, armCls, look = {}) => {
  const body = look.body ?? CODEX_BODY
  const claws = look.claws ?? body
  const legs = look.legs ?? body
  const eyes = look.eyes ?? INK
  if (body !== 'none') stampRuns(f, 7, 10, CLOUD, { k: INK, w: body })
  if (claws !== 'none') {
    stampRuns(f, 3, 14, HAND, { k: INK, w: claws })
    stampRuns(f, 23, 14 + armFront, mirror(HAND), { k: INK, w: claws }, armCls)
  }
  if (eyes !== 'none') {
    stamp(f, 11, 12, PROMPT, { k: eyes }, look.eyeCls)
    f(14, 14, 5, 1, eyes, look.eyeCls)
  }
  if (legs === 'none') return
  const foot = (x: number, cls: string) => {
    f(x, 22, 2, 2, legs, cls)
    f(x, 24, 2, 1, INK, cls)
  }
  foot(7, 'la')
  foot(17, 'la')
  foot(11, 'lb')
  foot(21, 'lb')
}

// The badge of a Codex intensity, drawn over its costume in the tier's color on
// the body's lower right (17..21 x 16..20): a moon, a globe, a sun, a star.
export const CODEX_BADGES: Record<string, string[]> = {
  luna: ['.oo..', 'oo...', 'oo...', 'oo...', '.oo..'],
  terra: ['.ooo.', 'o...o', 'ooooo', 'o...o', '.ooo.'],
  sol: ['o...o', '.ooo.', '.ooo.', '.ooo.', 'o...o'],
  astra: ['..o..', '.ooo.', 'ooooo', '.ooo.', '..o..'],
}

export const codexBadge = (f: Fill, intensity: string, c: string): void =>
  stamp(f, 17, 16, CODEX_BADGES[intensity] ?? [], { o: c }, 'badge')

// The rects of a drawing, grouped by class: what `crab` and the header ornaments nest.
export const pixels = (): { f: Fill; groups: Map<string, string[]> } => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (x, y, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    const paint = c.startsWith('.') ? `class="${c.slice(1)}"` : `fill="${c}"`
    groups.get(cls)?.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${paint}/>`)
  }
  return { f, groups }
}
