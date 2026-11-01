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

// `armCls` lets a raised claw travel with the prop it holds.
export const crabBody = (f: Fill, armFront = 0, armCls?: string, look: Look = {}): void => {
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
