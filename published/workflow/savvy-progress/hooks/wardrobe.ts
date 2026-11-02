// The wardrobe every theme draws from: the palette, falling particles, header
// ornaments and weather, the motion shared by every theme, and the `Dress` type.

import { pixels, stamp } from './sprite'
import type { Costume, Fill } from './sprite'

// ---------------------------------------------------------------------------
// Palette: warm and flat, around the crab's clay. A color written `.name` is
// painted by a CSS class, so it can lighten in the dark, where ink would vanish.

export const IVORY = '#F4F1EA'
export const SHADE = '#D6D1C4'
export const GOLD = '#E8B54A'
export const BRICK = '#B8433A'
export const PINE = '#4F7A57'
export const OLIVE = '#788C5D'
export const KRAFT = '#C9A06A'
export const BROWN = '#8A5A3B'
export const SKY = '#6A9BCC'
export const FIG = '#C46686'
export const PINK = '#EBA9B8'
export const LILAC = '#B9B0DA'
export const YOLK = '#F2C94C'
export const RUST = '#C66A3D'
export const FROST = '#9DB8CC'
export const STRAW = '#E3C887'
export const STRAW_SHADE = '#C9AB66'
export const PUMPKIN = '#F28C28'
export const BONE = '#EDE6D6'
export const GLOW = '#FFD54A'
export const BLOOD = '#D0453F'
export const NIGHT = '.hn'
export const SHAWL = '.bs'
export const OTHER_GREY = '#888780'
export const WATER = '#7FB3D5'
export const SAND = '#E8CF9B'
export const SAND_SHADE = '#C9AE73'
export const GREEN = '#6E9B4A'
export const SOIL = '#7A5236'
export const METAL = '#A7ABB2'
export const LINE = '#C9CCD2'
export const BRASS = '#C9A050'
export const TERRACOTTA = '#C46A4A'
export const GRAPE = '#6B4C8F'
export const MELON = '#E0525A'
export const GLASS = 'rgba(169,214,245,.45)'
export const INK_SOFT = '#3D3D3A'

// The tier's color, or `fallback` for an agent with no tier (its grey would read as dull).
export const tint = (t: string, fallback: string): string => (t === OTHER_GREY ? fallback : t)

// Three particles falling through the figure's box, a third of a second apart.
export const fall = (f: Fill, rows: string[], colors: string[], xs: number[] = [3, 14, 25]): void =>
  xs.forEach((x, i) => stamp(f, x, -3, rows, { o: colors[i % colors.length] ?? '' }, `fx fx${i}`))

export const FLAKE = ['.o.', 'ooo', '.o.']
export const PETAL = ['oo']
export const LEAF = ['.o', 'oo']
export const CONFETTI = ['o', 'o']

export const snow = (f: Fill): void => fall(f, FLAKE, [FROST])
export const confetti = (f: Fill): void => fall(f, CONFETTI, [FIG, SKY, GOLD])

// More colors for the holidays' props.
export const FLAG_GREEN = '#2E8B57'
export const FLAG_RED = '#CE2B37'
export const MIMOSA = '#F5D33B'
export const ROSE = '#D94A64'
export const CHOCOLATE = '#6B3E26'
export const SILVER = '#C0C4CC'
export const CANDLE = '#F3EBD8'
export const PAPER = '#FBF8F1'
// Candle wax, a shade darker than paper so it reads on the light tile.
export const WAX = '#E6D9B8'

export const HEART = ['.o.o.', 'ooooo', 'ooooo', '.ooo.', '..o..']
export const SMALL_HEART = ['o.o', 'ooo', '.o.']
export const hearts = (f: Fill, colors: string[] = [ROSE, PINK]): void => fall(f, SMALL_HEART, colors)
export const coins = (f: Fill): void => fall(f, ['.o.', 'ooo', '.o.'], [GOLD, YOLK])

// Props more than one theme hands its figures. `cls` puts them in a moving group.

// A shopping bag with its handles, `c` the paper's color, `x`,`y` its top-left corner (4 x 6).
export const bag = (f: Fill, x: number, y: number, c: string, cls?: string): void =>
  stamp(f, x, y, ['.kk.', 'k..k', 'cccc', 'cccc', 'cccc', 'cccc'], { k: INK_SOFT, c }, cls)

// A shopping cart, pushed from the left (7 x 5).
export const cart = (f: Fill, x: number, y: number, cls?: string): void =>
  stamp(f, x, y, ['m......', 'mmmmmmm', '.m.m.m.', '.mmmmm.', '.k...k.'], { m: METAL, k: INK_SOFT }, cls)

// The Italian flag on its pole: green, white and red bands, the white edged in grey
// so it shows on the light tile (7 x 9).
export const flag = (f: Fill, x: number, y: number, cls?: string): void =>
  stamp(f, x, y, ['pggkkrr', 'pggwwrr', 'pggwwrr', 'pggkkrr', 'p......', 'p......', 'p......', 'p......', 'p......'], { p: BRASS, g: FLAG_GREEN, w: PAPER, k: SHADE, r: FLAG_RED }, cls)

// The Italian flag waving: the pole (`pole` tall) stays, the cloth (`flg`) waves from it.
export const FLAG_CLOTH = ['ggkkrr', 'ggwwrr', 'ggwwrr', 'ggkkrr']
export const SMALL_CLOTH = ['gkr', 'gwr', 'gkr']
export const wavingFlag = (f: Fill, x: number, y: number, pole = 9, cloth = FLAG_CLOTH): void => {
  f(x, y, 1, pole, BRASS)
  stamp(f, x + 1, y, cloth, { g: FLAG_GREEN, w: PAPER, k: SHADE, r: FLAG_RED }, 'flg')
}

// The tricolour cockade: green outside, then white, red at the heart (5 x 5).
export const cockade = (f: Fill, x: number, y: number, cls?: string): void =>
  stamp(f, x, y, ['.ggg.', 'gwwwg', 'gwrwg', 'gwwwg', '.ggg.'], { g: FLAG_GREEN, w: PAPER, r: FLAG_RED }, cls)

// A gift box in `c`, tied with a `ribbon` bow (6 x 6).
export const gift = (f: Fill, x: number, y: number, c: string, ribbon: string, cls?: string): void =>
  stamp(f, x, y, ['.r..r.', '..rr..', 'ccrrcc', 'ccrrcc', 'ccrrcc', 'ccrrcc'], { c, r: ribbon }, cls)

// A lit candle: the flame flickers on its own (`flame`) (3 x 6).
export const candle = (f: Fill, x: number, y: number, cls?: string): void => {
  stamp(f, x, y + 2, ['ccc', 'ccc', 'ccc', 'ccc'], { c: WAX }, cls)
  stamp(f, x + 1, y, ['y', 'o'], { y: GLOW, o: '#E8913A' }, 'flame')
}

// A header ornament: a small pixel sprite in the top-right corner, drawn twice the
// figures' size; `cls` names its motion.
export const ornament =
  (rows: string[], map: Record<string, string>, cls: string) =>
  (W: number): string => {
    const { f, groups } = pixels()
    stamp(f, 0, 0, rows, map)
    const width = Math.max(...rows.map(r => r.length))
    return `<g transform="translate(${W - 8 - width * 2},2) scale(2)" shape-rendering="crispEdges"><g class="orn ${cls}">${(groups.get('bd') ?? []).join('')}</g></g>`
  }

// Weather over the header: now and then, for a few seconds, flakes drift down the
// band left free by the title and the ornament (x from `from` to `to`) and settle
// on the tiles. The layer is drawn first, so text, tiles and bars paint over it.
// Its cycle is far longer than a second, so the phase rides in the drawing: a
// header redrawn at `at` goes on where the last one was instead of restarting.
export const FLURRY_MS = 30_000
// Each flake's start within the cycle, in ms: each falls for three seconds (`flurry`
// in winter's CSS), so the flurry lasts about five; unseen the rest of the cycle and
// with reduced motion.
export const FLURRY_STARTS = [0, 1400, 600, 2000, 300, 1700, 900, 2300, 1100, 2600]
export const FLURRY_GAP = 28

// Three sizes in turn: a large flake, a speck, a small flake (pixels at that scale).
export const FLURRY_SIZES: [string[], number][] = [[FLAKE, 2], [['o'], 2], [FLAKE, 1]]

export const flurry = (from: number, to: number, at: number): string => {
  const n = Math.min(FLURRY_STARTS.length, Math.floor((to - from) / FLURRY_GAP))
  if (n < 1) return ''
  const step = (to - from) / n
  const phase = ((at % FLURRY_MS) + FLURRY_MS) % FLURRY_MS
  const flakes = FLURRY_STARTS.slice(0, n).map((start, i) => {
    const [rows, scale] = FLURRY_SIZES[i % FLURRY_SIZES.length] ?? [FLAKE, 1]
    const { f, groups } = pixels()
    stamp(f, 0, 0, rows, { o: FROST })
    const x = Math.round(from + step * i + ((i * 7) % 11))
    // Two classes outrank `.fl`, whose `animation` shorthand would reset the delay.
    return {
      css: `.fl.fl${i}{animation-delay:${start - phase}ms}`,
      svg: `<g class="fl fl${i}"><g transform="translate(${x},-6) scale(${scale})">${(groups.get('bd') ?? []).join('')}</g></g>`,
    }
  })
  return `<style>${flakes.map(k => k.css).join('')}</style><g shape-rendering="crispEdges">${flakes.map(k => k.svg).join('')}</g>`
}

// ---------------------------------------------------------------------------
// The themes. `costumes` is keyed by figure (a tier, `explore`, `other`); a figure
// with no costume of its own wears `other`. `prefix` names the theme's classes.

export type Dress = {
  prefix: string
  costumes: Record<string, Costume>
  css: string
  accent: string
  sparkle: [string, string]
  glyph: string
  ornament: (W: number) => string
  // The header's weather, in the free band from `from` to `to` at the time `at`.
  weather?: (from: number, to: number, at: number) => string
}

// Every tier keeps its character: Fable floats, Light runs at double pace.
export const tierMotion = (p: string): string =>
  `.c-${p}-fable.run,.c-${p}-fable.idle{animation:float 1s ease-in-out infinite}` +
  `.c-${p}-fable.run .la,.c-${p}-fable.run .lb,.c-${p}-fable.run .bd{animation:none}` +
  `.c-${p}-light.run .la{animation-duration:.25s}.c-${p}-light.run .lb{animation-duration:.25s;animation-delay:-.125s}`

// Shared by every theme, on top of the classic crab's CSS.
export const THEME_CSS = `<style>
.hn{fill:#2A2530}.hns{fill:#2A2530;stroke:#2A2530}.web{stroke:#b4b4b0}.bs{fill:#5E5470}
@media (prefers-color-scheme: dark){.hn{fill:#6E6380}.hns{fill:#8A7F9A;stroke:#8A7F9A}.web{stroke:#5a5a5a}.bs{fill:#857A99}}
.idle g{transform-box:fill-box}
@keyframes glow{50%{opacity:.35}}@keyframes drop{50%{transform:translateY(3px)}}@keyframes hem{50%{opacity:0}}
@keyframes flap{50%{transform:scaleY(.35)}}@keyframes flapL{50%{transform:rotate(28deg)}}@keyframes flapR{50%{transform:rotate(-28deg)}}
@keyframes flicker{25%{opacity:.5}50%{opacity:1}75%{opacity:.7}}@keyframes swing{50%{transform:rotate(-20deg)}}@keyframes wob{50%{transform:rotate(-8deg)}}
@keyframes rattle{25%{transform:translate(-1px,0)}50%{transform:translate(0,1px)}75%{transform:translate(1px,0)}}
@keyframes hop{50%{transform:translateY(-2px)}}@keyframes flutter{50%{transform:scaleX(.3)}}@keyframes toot{50%{transform:scaleX(1.8)}}
@keyframes sway{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
@keyframes spin45{to{transform:rotate(45deg)}}@keyframes spin90{to{transform:rotate(90deg)}}
@keyframes fall{0%{transform:translateY(0);opacity:0}15%,80%{opacity:1}100%{transform:translateY(27px);opacity:0}}
@keyframes dig{50%{transform:translateY(2px)}}@keyframes drip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(8px);opacity:0}}
@keyframes rise{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-6px);opacity:0}}@keyframes glide{0%,100%{transform:translateX(-2px)}50%{transform:translateX(2px)}}
@keyframes juggle{50%{transform:translateY(-4px)}}@keyframes slide{50%{transform:translateX(-2px)}}@keyframes click{50%{transform:translate(1px,-1px)}}@keyframes zoom{25%{transform:translateX(-1px)}75%{transform:translateX(1px)}}
@keyframes drift{0%{transform:translate(0,0);opacity:0}15%{opacity:1}50%{transform:translate(2px,13px)}80%{opacity:1}100%{transform:translate(-1px,27px);opacity:0}}
.run .gl,.idle .gl{animation:glow 1s ease-in-out infinite}
.run .fx,.idle .fx{animation:fall 1s linear infinite}.run .fx1,.idle .fx1{animation-delay:-.33s}.run .fx2,.idle .fx2{animation-delay:-.66s}
.orn{transform-box:fill-box;transform-origin:50% 0;animation:sway 1s ease-in-out infinite}
.spin{animation:drop 1s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.run,.run g,.idle,.idle g,.spin,.orn,.fl{animation:none!important}}
</style>`

export const style = (rules: string): string => `<style>${rules}</style>`
