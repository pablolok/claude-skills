// The figures' themes: the holidays and seasons the crab dresses up for, all drawn on
// the sprite grid of `sprite.ts`. The crab stays the crab: each theme adds what it
// wears and holds, and a motion of its own; a running figure moves at full pace,
// any other one idles, so planned and finished rows move too. Every period divides
// one second: a running row is redrawn once a second and restarts them in phase.

import { INK, crabBody, mirror, pixels, stamp } from './sprite'
import type { Costume, Fill } from './sprite'

export const THEMES = [
  'classic',
  'halloween',
  'christmas',
  'befana',
  'carnival',
  'easter',
  'spring',
  'summer',
  'autumn',
  'winter',
] as const

export type Theme = (typeof THEMES)[number]

// ---------------------------------------------------------------------------
// Calendar: a holiday wins over the season it falls in.

const DAY = 86_400_000

// Easter Sunday of a Gregorian year (Meeus/Jones/Butcher): [month 1-12, day].
export const easter = (year: number): [number, number] => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = h + l - 7 * m + 114
  return [Math.floor(n / 31), (n % 31) + 1]
}

// The theme of a day, by the engine's local date:
// Christmas December 1 – January 2, Befana January 3–6, Carnival the twelve days
// up to Shrove Tuesday, Easter from Palm Sunday to Easter Monday, Halloween
// October 15 – November 7; otherwise the (northern) season, from the 21st of
// March, the 21st of June, the 23rd of September and the 21st of December.
export const themeOn = (ms: number): Theme => {
  const date = new Date(ms)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const md = month * 100 + day
  if (md >= 103 && md <= 106) return 'befana'
  if (md >= 1201 || md <= 102) return 'christmas'
  const [em, ed] = easter(year)
  const fromEaster = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, em - 1, ed)) / DAY)
  if (fromEaster >= -7 && fromEaster <= 1) return 'easter'
  if (fromEaster >= -58 && fromEaster <= -47) return 'carnival'
  if (md >= 1015 && md <= 1107) return 'halloween'
  if (md >= 321 && md <= 620) return 'spring'
  if (md >= 621 && md <= 922) return 'summer'
  if (md >= 923 && md <= 1220) return 'autumn'
  return 'winter'
}

// The `theme` option: a named theme pins it, anything else follows the calendar.
export const themeOf = (option: unknown, ms: number): Theme =>
  THEMES.find(t => t === option) ?? themeOn(ms)

// ---------------------------------------------------------------------------
// Palette: warm and flat, around the crab's clay. A color written `.name` is
// painted by a CSS class, so it can lighten in the dark, where ink would vanish.

const IVORY = '#F4F1EA'
const SHADE = '#D6D1C4'
const GOLD = '#E8B54A'
const BRICK = '#B8433A'
const PINE = '#4F7A57'
const OLIVE = '#788C5D'
const KRAFT = '#C9A06A'
const BROWN = '#8A5A3B'
const SKY = '#6A9BCC'
const FIG = '#C46686'
const PINK = '#EBA9B8'
const LILAC = '#B9B0DA'
const YOLK = '#F2C94C'
const RUST = '#C66A3D'
const FROST = '#9DB8CC'
const STRAW = '#E3C887'
const STRAW_SHADE = '#C9AB66'
const PUMPKIN = '#F28C28'
const BONE = '#EDE6D6'
const GLOW = '#FFD54A'
const BLOOD = '#D0453F'
const NIGHT = '.hn'
const SHAWL = '.bs'
const OTHER_GREY = '#888780'
const WATER = '#7FB3D5'
const SAND = '#E8CF9B'
const SAND_SHADE = '#C9AE73'
const GREEN = '#6E9B4A'
const SOIL = '#7A5236'
const METAL = '#A7ABB2'
const LINE = '#C9CCD2'
const BRASS = '#C9A050'
const TERRACOTTA = '#C46A4A'
const GRAPE = '#6B4C8F'
const MELON = '#E0525A'
const GLASS = 'rgba(169,214,245,.45)'

// The tier's color, or `fallback` for an agent with no tier (its grey would read as dull).
const tint = (t: string, fallback: string): string => (t === OTHER_GREY ? fallback : t)

// Three particles falling through the figure's box, a third of a second apart.
const fall = (f: Fill, rows: string[], colors: string[], xs: number[] = [3, 14, 25]): void =>
  xs.forEach((x, i) => stamp(f, x, -3, rows, { o: colors[i % colors.length] ?? '' }, `fx fx${i}`))

const FLAKE = ['.o.', 'ooo', '.o.']
const PETAL = ['oo']
const LEAF = ['.o', 'oo']
const CONFETTI = ['o', 'o']

const snow = (f: Fill): void => fall(f, FLAKE, [FROST])
const confetti = (f: Fill): void => fall(f, CONFETTI, [FIG, SKY, GOLD])

// A header ornament: a small pixel sprite in the top-right corner, drawn twice the
// figures' size; `cls` names its motion.
const ornament =
  (rows: string[], map: Record<string, string>, cls: string) =>
  (W: number): string => {
    const { f, groups } = pixels()
    stamp(f, 0, 0, rows, map)
    const width = Math.max(...rows.map(r => r.length))
    return `<g transform="translate(${W - 8 - width * 2},2) scale(2)" shape-rendering="crispEdges"><g class="orn ${cls}">${(groups.get('bd') ?? []).join('')}</g></g>`
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
}

// Every tier keeps its character: Fable floats, Light runs at double pace.
const tierMotion = (p: string): string =>
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
@media (prefers-reduced-motion: reduce){.run,.run g,.idle,.idle g,.spin,.orn{animation:none!important}}
</style>`

const style = (rules: string): string => `<style>${rules}</style>`

// --- Halloween -------------------------------------------------------------

const BAT_WING = ['w......', 'ww....w', 'www..ww', 'wwwwwww', 'wwwwwww', '.wwwwww', '..w.w.w']
const SHEET = '#F8F7F3'
const SHEET_EDGE = '#BDBAB2'

// A cobweb in the header's top-right corner, its spider bobbing on a thread.
const webSvg = (W: number): string => {
  const rays = [0, 30, 60, 90].map(a => (a * Math.PI) / 180)
  const pt = (r: number, a: number): string => `${(W - r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`
  const spokes = rays.map(a => `M${W},0L${pt(26, a)}`).join('')
  const rings = [8, 15, 22].map(r => 'M' + rays.map(a => pt(r, a)).join('L')).join('')
  const x = W - 40
  const legs = [-1, 0, 1, 2].map(i => `M-2,${i}L-7,${i * 2.2 - 3.5}M2,${i}L7,${i * 2.2 - 3.5}`).join('')
  return `<path class="web" d="${spokes}${rings}" fill="none" stroke-width="0.8"/>
<g class="spin"><line class="web" x1="${x}" y1="-12" x2="${x}" y2="9" stroke-width="0.8"/>
<g transform="translate(${x},12)"><path class="hns" d="${legs}" fill="none" stroke-width="1" stroke-linecap="round"/><circle class="hns" r="3.2"/><circle class="hns" cy="-3" r="1.8"/><circle cx="-0.8" cy="-3.3" r="0.5" fill="${BLOOD}"/><circle cx="0.8" cy="-3.3" r="0.5" fill="${BLOOD}"/></g></g>`
}

const halloween: Dress = {
  prefix: 'hw',
  accent: PUMPKIN,
  sparkle: ['#8f5cf4', '#8f5cf4'],
  glyph: '🎃',
  ornament: webSvg,
  costumes: {
    // Fable: vampire in a high-collared cape; floats, the red eyes glow, a bat flaps above.
    fable: (f, t) => {
      f(4, 9, 22, 15, NIGHT)
      ;[4, 11, 17, 23].forEach(x => f(x, 24, 3, 1, NIGHT))
      f(3, 5, 4, 6, '#8E1B2B'); f(23, 5, 4, 6, '#8E1B2B'); f(3, 3, 1, 2, '#8E1B2B'); f(26, 3, 1, 2, '#8E1B2B')
      crabBody(f, 0, undefined, { eyes: BLOOD, eyeCls: 'gl' })
      stamp(f, 7, 10, ['kkkkkkkkkkkkkkkk', 'kk.....kk.....kk', '.......kk.......'], { k: INK })
      f(11, 17, 8, 1, INK); f(12, 18, 1, 2, '#FFFFFF'); f(17, 18, 1, 2, '#FFFFFF')
      f(14, 20, 2, 2, t)
      stamp(f, 22, 0, ['k.....k', 'kk.k.kk', '.kkkkk.', '...k...'], { k: NIGHT }, 'bat')
    },
    // Heavy: a skeleton digging; it rattles, the eyes glow in the skull, the bone in its claw swings.
    heavy: f => {
      crabBody(f, -4, 'it', { body: NIGHT, claws: BONE, legs: BONE, eyes: BLOOD, eyeCls: 'gl' })
      f(8, 11, 4, 4, BONE); f(18, 11, 4, 4, BONE)
      f(14, 15, 2, 6, BONE); f(10, 16, 10, 1, BONE); f(11, 18, 8, 1, BONE); f(12, 20, 6, 1, BONE)
      stamp(f, 24, 4, ['b.b', '.b.', '.b.', '.b.', 'b.b'], { b: BONE }, 'it')
    },
    // Careful: a spider on its thread; it climbs and drops, eight legs scuttle.
    careful: f => {
      f(15, -16, 1, 25, '#C9CCD2', 'thr')
      crabBody(f, 0, undefined, { body: NIGHT, eyes: BLOOD, eyeCls: 'gl' })
      f(12, 11, 1, 1, BLOOD, 'gl'); f(17, 11, 1, 1, BLOOD, 'gl')
      stamp(f, 13, 15, ['rrrr', '.rr.', 'rrrr'], { r: BLOOD })
      f(3, 11, 4, 1, NIGHT, 'la'); f(2, 8, 1, 3, NIGHT, 'la'); f(23, 19, 5, 1, NIGHT, 'la'); f(28, 20, 1, 4, NIGHT, 'la')
      f(23, 11, 4, 1, NIGHT, 'lb'); f(27, 8, 1, 3, NIGHT, 'lb'); f(2, 19, 5, 1, NIGHT, 'lb'); f(1, 20, 1, 4, NIGHT, 'lb')
    },
    // Medium: a bat; the wings beat, yellow eyes and two fangs.
    medium: f => {
      const fur = '#6B4C8F'
      crabBody(f, 0, undefined, { body: fur, eyes: GLOW, eyeCls: 'gl' })
      f(8, 7, 2, 3, fur); f(8, 6, 1, 1, fur); f(20, 7, 2, 3, fur); f(21, 6, 1, 1, fur)
      f(12, 16, 1, 2, '#FFFFFF'); f(17, 16, 1, 2, '#FFFFFF')
      stamp(f, 0, 9, BAT_WING, { w: NIGHT }, 'wl')
      stamp(f, 23, 9, mirror(BAT_WING), { w: NIGHT }, 'wr')
    },
    // Light: a ghost under a sheet; it floats, the hem flutters, the claws peek out.
    light: f => {
      crabBody(f, 0, undefined, { legs: 'none' })
      stamp(f, 6, 3, ['.....oooooooo.....', '...oossssssssoo...', '..osssssssssssso..', '.osssssssssssssso.', ...Array<string>(16).fill('osssssssssssssssso')], { o: SHEET_EDGE, s: SHEET })
      stamp(f, 6, 23, ['ss..ss..ss..ss..ss'], { s: SHEET }, 'ha')
      stamp(f, 6, 23, ['..ss..ss..ss..ss..'], { s: SHEET }, 'hb')
      f(10, 10, 2, 3, INK); f(18, 10, 2, 3, INK)
      f(13, 15, 4, 1, INK); f(12, 16, 1, 2, INK); f(17, 16, 1, 2, INK); f(13, 18, 4, 1, INK)
      f(8, 14, 2, 1, PINK); f(20, 14, 2, 1, PINK)
    },
    // Explore: witch in a pointed hat; the broom sweeps, the hat wobbles.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 6, 1, ['..........kk......', '.........kkk......', '........kkkk......', '.......kkkkk......', '......kkkkkkk.....', '......ooooooo.....', '..kkkkkkkkkkkkkk..', 'kkkkkkkkkkkkkkkkkk'], { k: '#4B2A6B', o: PUMPKIN }, 'hat')
      f(25, 3, 1, 8, '#7A4A26', 'it'); f(24, 0, 3, 3, '#D9A441', 'it')
    },
    // Any other agent, and the bar: a jack-o'-lantern whose face flickers.
    other: f => {
      crabBody(f, 0, undefined, { body: PUMPKIN, eyes: 'none' })
      f(11, 10, 1, 12, '#C8641A'); f(18, 10, 1, 12, '#C8641A')
      f(14, 7, 2, 3, '#4E8F3A'); f(16, 7, 2, 1, '#6DB33F')
      stamp(f, 9, 12, ['.y.', 'yyy'], { y: GLOW }, 'gl')
      stamp(f, 18, 12, ['.y.', 'yyy'], { y: GLOW }, 'gl')
      stamp(f, 10, 16, ['y.yyyyyy.y', 'yyyyyyyyyy', '.yy.yy.yy.'], { y: GLOW }, 'gl')
    },
  },
  css: style(`
.c-hw-fable.run,.c-hw-light.run,.c-hw-light.idle{animation:float 1s ease-in-out infinite}
.c-hw-fable.run .la,.c-hw-fable.run .lb,.c-hw-fable.run .bd,.c-hw-light.run .bd,.c-hw-careful.run .bd{animation:none}
.c-hw-fable .bat{transform-origin:50% 0}.c-hw-fable.run .bat{animation:flap .25s steps(1) infinite}.c-hw-fable.idle .bat{animation:flap 1s steps(1) infinite}
.c-hw-heavy.run .bd{animation:rattle .25s steps(1) infinite}
.c-hw-heavy .it{transform-origin:50% 100%}.c-hw-heavy.run .it{animation:swing .5s ease-in-out infinite}.c-hw-heavy.idle .it{animation:swing 1s ease-in-out infinite}
.c-hw-careful.run,.c-hw-careful.idle{animation:drop 1s ease-in-out infinite}
.c-hw-medium .wl{transform-origin:100% 40%}.c-hw-medium .wr{transform-origin:0 40%}
.c-hw-medium.run .wl{animation:flapL .25s steps(1) infinite}.c-hw-medium.run .wr{animation:flapR .25s steps(1) infinite}
.c-hw-medium.idle .wl{animation:flapL 1s ease-in-out infinite}.c-hw-medium.idle .wr{animation:flapR 1s ease-in-out infinite}
.c-hw-light.run .ha{animation:hem .25s steps(1) infinite}.c-hw-light.run .hb{animation:hem .25s steps(1) infinite -.125s}
.c-hw-light.idle .ha{animation:hem 1s steps(1) infinite}.c-hw-light.idle .hb{animation:hem 1s steps(1) infinite -.5s}
.c-hw-other .gl{animation:flicker .5s steps(1) infinite}
.c-hw-explore .hat{transform-origin:50% 100%}.c-hw-explore.run .hat,.c-hw-explore.idle .hat{animation:wob 1s ease-in-out infinite}
.c-hw-explore.run .it{transform-origin:50% 100%;animation:fence .5s ease-in-out infinite}`),
}

// --- Christmas ---------------------------------------------------------------

const ANGEL_WING = ['....ew', '..eeww', '.ewwww', 'ewwwww', '.ewww.', '..ew..']

const christmas: Dress = {
  prefix: 'xm',
  accent: BRICK,
  sparkle: [PINE, GOLD],
  glyph: '🎄',
  ornament: ornament(
    ['...l...', '...l...', '..ggg..', '.rrrrr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..'],
    { l: '#B4B4B0', g: GOLD, r: BRICK, w: IVORY },
    'o-swing',
  ),
  costumes: {
    // Fable: an angel; the halo glows and the small wings beat.
    fable: f => {
      crabBody(f)
      stamp(f, 10, 5, ['..gggggg..', 'gg......gg', '..gggggg..'], { g: GOLD }, 'gl')
      stamp(f, 1, 7, ANGEL_WING, { w: IVORY, e: SHADE }, 'wl')
      stamp(f, 23, 7, mirror(ANGEL_WING), { w: IVORY, e: SHADE }, 'wr')
      snow(f)
    },
    // Heavy: Santa, checking his list twice; the pompom bounces.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 6, 2, ['.............rr...', '...........rrrr...', '.........rrrrrr...', '.......rrrrrrrr...', '.....rrrrrrrrrrr..', '...rrrrrrrrrrrrrr.', 'wwwwwwwwwwwwwwwwww', 'eeeeeeeeeeeeeeeeee'], { r: BRICK, w: IVORY, e: SHADE })
      stamp(f, 20, 0, ['ww', 'ee'], { w: IVORY, e: SHADE }, 'pom')
      stamp(f, 9, 15, ['.wwww..wwww.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', '.wwwwwwwwww.', '..wwwwwwww..', '....wwww....'], { w: IVORY })
      stamp(f, 23, 0, ['rrrr', '.ww.', '.kw.', '.ww.', '.kg.', '.ww.', '.kw.', '.ww.', '.kg.', '.ww.'], { r: KRAFT, w: IVORY, k: INK, g: PINE }, 'it')
      snow(f)
    },
    // Careful: an elf wrapping a gift; the bell on the hat swings.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 7, 2, ['.............gg.', '...........ggg..', '.........gggg...', '.......ggggg....', '.....gggggggg...', '...gggggggggggg.', 'tttttttttttttttt', 'tttttttttttttttt'], { g: PINE, t })
      stamp(f, 22, 0, ['yy', 'yy'], { y: GOLD }, 'bell')
      stamp(f, 23, 3, ['.y.y.', '..y..', 'rryrr', 'yyyyy', 'rryrr', 'rryrr'], { y: GOLD, r: BRICK }, 'it')
      snow(f)
    },
    // Medium: the baker, holly on the toque, a gingerbread man in the claw.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 9, 0, ['...wwwwww...', '.wwwwwwwwww.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', '.wwwwwwwwww.', '..wwwwwwww..', '..wwwwwwww..', '..wwwwwwww..', '..eeeeeeee..', '..wwwwwwww..'], { w: IVORY, e: SHADE })
      stamp(f, 16, 5, ['g.g', '.r.', 'grg'], { g: PINE, r: BRICK })
      stamp(f, 23, 3, ['.bbb.', '.bbb.', 'bbbbb', '.bwb.', '.bbb.', 'bb.bb'], { b: '#B9784A', w: IVORY }, 'it')
      snow(f)
    },
    // Light: a reindeer; the red nose glows, the collar bell rings, it runs at double pace.
    light: (f, t) => {
      crabBody(f)
      for (const flip of [false, true]) {
        const x = (n: number): number => (flip ? 29 - n : n)
        f(x(10), 6, 1, 4, BROWN); f(flip ? x(9) : 8, 5, 2, 1, BROWN); f(x(8), 3, 1, 2, BROWN); f(x(11), 3, 1, 3, BROWN)
      }
      f(14, 15, 2, 2, '#D9483B', 'gl')
      f(7, 20, 16, 1, t); f(14, 20, 2, 2, GOLD)
      snow(f)
    },
    // Explore: follows the star through a telescope, a green beanie on.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 7, 7, ['...gggggggggg...', '..gggggggggggg..', 'wwwwwwwwwwwwwwww'], { g: PINE, w: IVORY })
      stamp(f, 22, 5, ['....bb', '...bb.', '..bb..', '.bb...', 'bb....'], { b: BRASS }, 'it')
      stamp(f, 27, 0, ['.y.', 'yyy', '.y.'], { y: GOLD }, 'gl')
      snow(f)
    },
    // Any other agent, and the bar: holly on the head, a string of lights that blink.
    other: f => {
      crabBody(f)
      stamp(f, 13, 7, ['g.g', '.r.', 'grg'], { g: PINE, r: BRICK })
      f(7, 17, 16, 1, '#3D3D3A')
      ;[BRICK, GOLD, PINE, SKY].forEach((c, i) => f(8 + i * 4, 18, 2, 2, c, i % 2 ? 'b2' : 'b1'))
      snow(f)
    },
  },
  css: style(`${tierMotion('xm')}
.c-xm-fable .wl{transform-origin:100% 50%}.c-xm-fable .wr{transform-origin:0 50%}
.c-xm-fable.run .wl{animation:flapL .5s ease-in-out infinite}.c-xm-fable.run .wr{animation:flapR .5s ease-in-out infinite}
.c-xm-fable.idle .wl{animation:flapL 1s ease-in-out infinite}.c-xm-fable.idle .wr{animation:flapR 1s ease-in-out infinite}
.run .pom{animation:hop .5s steps(1) infinite}.idle .pom{animation:hop 1s steps(1) infinite}
.c-xm-careful .bell{transform-origin:50% 0;animation:sway .5s ease-in-out infinite}
.c-xm-careful.run .it,.c-xm-heavy.run .it{animation:scan 1s steps(1) infinite}
.c-xm-medium.run .it{animation:hop .5s steps(1) infinite}
.c-xm-other .b1{animation:blink 1s steps(1) infinite}.c-xm-other .b2{animation:blink 1s steps(1) infinite -.5s}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Befana ----------------------------------------------------------------

// The Befana's patched kerchief, knotted over the head; the patches in the tier's color.
const kerchief = (f: Fill, t: string): void => {
  stamp(f, 6, 5, ['......kkkkkk......', '....kkkkkkkkkk....', '...kkkkpkkkkkkk...', '..kkkkkkkkkkpkkk..', '.kkkkkkkkkkkkkkkk.', 'kkkkkkkkkkkkkkkkkk', 'kk..............kk'], { k: SHAWL, p: tint(t, GOLD) })
  f(1, 3, 1, 1, GOLD, 'gl'); f(27, 6, 1, 1, GOLD, 'gl'); f(4, 1, 1, 1, GOLD, 'gl')
}

// A broom held in the left claw, the bristles on the floor.
const broom = (f: Fill): void => {
  f(1, 8, 1, 13, BROWN, 'it')
  stamp(f, 0, 21, ['sss', 'sss', 's.s'], { s: STRAW }, 'it')
}

const STOCKING = ['..p.y', '.wwww', '.rrrr', '.rrrr', '.rrrr', 'rrrrr', 'rrrr.', 'rr...']

const befana: Dress = {
  prefix: 'bf',
  accent: '#7A6A96',
  sparkle: [GOLD, GOLD],
  glyph: '🧹',
  ornament: ornament(STOCKING, { p: PINK, y: YOLK, w: IVORY, r: BRICK }, 'o-swing'),
  costumes: {
    // Fable: flies on her broom.
    fable: (f, t) => {
      crabBody(f)
      kerchief(f, t)
      f(0, 22, 25, 1, BROWN)
      stamp(f, 24, 20, ['..sss', 'sssss', 'sssss', '..sss'], { s: STRAW }, 'br')
    },
    // Heavy: the sack of coal for whoever was naughty.
    heavy: (f, t) => {
      crabBody(f, -4, 'it')
      kerchief(f, t)
      stamp(f, 24, 3, ['.k.k.', 'kkkkk', 'sssss', 'sssss', '.sss.'], { k: NIGHT, s: KRAFT }, 'it')
    },
    // Careful: fills the stocking with sweets.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      kerchief(f, t)
      stamp(f, 23, 1, STOCKING, { p: PINK, y: YOLK, w: IVORY, r: BRICK }, 'it')
    },
    // Medium: tosses a wrapped sweet.
    medium: (f, t) => {
      crabBody(f, -4, 'it')
      kerchief(f, t)
      stamp(f, 23, 5, ['w.tt.w', 'wwttww', 'w.tt.w'], { w: GOLD, t: tint(t, FIG) }, 'it')
    },
    // Light: sweeps at double pace.
    light: (f, t) => {
      crabBody(f)
      kerchief(f, t)
      broom(f)
    },
    // Explore: looks for the chimneys by lantern light.
    explore: (f, t) => {
      crabBody(f, -4, 'it')
      kerchief(f, t)
      stamp(f, 24, 6, ['.k.', 'kyk', 'kyk', 'kkk'], { k: NIGHT, y: GLOW }, 'it')
      f(25, 7, 1, 2, GLOW, 'gl')
    },
    // Any other agent, and the bar: kerchief and broom.
    other: (f, t) => {
      crabBody(f)
      kerchief(f, t)
      broom(f)
    },
  },
  css: style(`${tierMotion('bf')}
.c-bf-fable .br{transform-origin:0 50%;animation:flutter .5s steps(1) infinite}
.c-bf-heavy.run .it,.c-bf-careful.run .it{animation:scan 1s steps(1) infinite}
.c-bf-medium.run .it{animation:hop .5s steps(1) infinite}
.c-bf-light .it,.c-bf-other .it{transform-origin:50% 0}
.c-bf-light.run .it{animation:sway .25s ease-in-out infinite}.c-bf-other.run .it,.c-bf-light.idle .it,.c-bf-other.idle .it{animation:sway 1s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Carnival ----------------------------------------------------------------

// A black half mask with the eyes showing through (the eyes are drawn ivory beneath it).
const halfMask = (f: Fill): void => stamp(f, 8, 11, ['kkkkkkkkkkkkkk', 'k..kkkkkkkk..k', 'k..kkkkkkkk..k'], { k: INK })

const carnival: Dress = {
  prefix: 'cv',
  accent: FIG,
  sparkle: [GOLD, SKY],
  glyph: '🎭',
  ornament: ornament(
    ['.fffffff.', 'ff.fff.ff', '.fff.fff.', '....g....', '....g....', '....g....', '....g....'],
    { f: FIG, g: GOLD },
    'o-swing',
  ),
  costumes: {
    // Fable: a golden Venetian mask with a plume that sways.
    fable: f => {
      crabBody(f)
      stamp(f, 7, 11, ['.gggggggggggggg.', 'gg..gggggggg..gg', 'gg..gggggggg..gg', '.ggg..gggg..ggg.'], { g: GOLD })
      f(14, 11, 2, 1, FIG)
      stamp(f, 20, 3, ['...f', '..ff', '..ff', '.ff.', '.ff.', 'ff..', 'f...'], { f: FIG }, 'plume')
      confetti(f)
    },
    // Heavy: Balanzone, the learned doctor: wide black hat, ruff collar, a book to quote from.
    heavy: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 6, 4, ['......kkkkkk......', '.....kkkkkkkk.....', '.....kkkkkkkk.....', '.....kkkkkkkk.....', 'kkkkkkkkkkkkkkkkkk', '.kkkkkkkkkkkkkkkk.'], { k: NIGHT })
      stamp(f, 7, 19, ['wwwwwwwwwwwwwwww', 'w.w.w.w.w.w.w.w.'], { w: IVORY })
      stamp(f, 24, 4, ['tttt', 'twwt', 'twwt', 'twwt', 'tttt'], { t, w: IVORY }, 'it')
      confetti(f)
    },
    // Careful: Arlecchino, juggling three balls without dropping one.
    careful: f => {
      crabBody(f, -4, 'it', { eyes: IVORY })
      halfMask(f)
      ;[BRICK, OLIVE, SKY, GOLD].forEach((c, i) => stamp(f, 8 + i * 4, 16, ['.x.', 'xxx', '.x.'], { x: c }))
      stamp(f, 7, 5, ['..kk........kk..', '.kkkk......kkkk.', '.kkkkkkkkkkkkkk.', 'kkkkkkkkkkkkkkkk'], { k: NIGHT })
      f(24, 4, 2, 2, BRICK, 'j1'); f(27, 2, 2, 2, SKY, 'j2'); f(23, 1, 2, 2, GOLD, 'j3')
      confetti(f)
    },
    // Medium: Pulcinella, white cone hat and black mask, with a slice of pizza.
    medium: f => {
      crabBody(f, -4, 'it', { eyes: IVORY })
      stamp(f, 10, 0, ['....ww....', '....ww....', '...ewww...', '...ewww...', '..ewwwww..', '..ewwwww..', '.ewwwwwww.', '.ewwwwwww.', 'ewwwwwwwww', 'ewwwwwwwww'], { w: IVORY, e: SHADE })
      halfMask(f)
      stamp(f, 23, 3, ['ccccc', 'yrryy', '.yyr.', '.yry.', '..y..'], { c: KRAFT, y: YOLK, r: BRICK }, 'it')
      confetti(f)
    },
    // Light: party hat and a party horn it blows as it runs.
    light: (f, t) => {
      crabBody(f)
      stamp(f, 11, 1, ['...yy...', '...tt...', '...tt...', '..yyyy..', '..tttt..', '.tttttt.', '.yyyyyy.', 'tttttttt', 'tttttttt'], { y: GOLD, t })
      stamp(f, 0, 15, ['ppp', 'ppp'], { p: FIG }, 'horn')
      confetti(f)
    },
    // Explore: Capitan Spaventa, the swaggering captain: plumed hat, curled moustache, sword raised.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 5, 5, ['.....kkkkkkkkkk.....', '.....kkkkkkkkkk.....', '.....kkkkkkkkkk.....', 'kkkkkkkkkkkkkkkkkkkk'], { k: NIGHT })
      stamp(f, 18, 0, ['.....f', '....ff', '...ff.', '..ff..', '.ff...'], { f: FIG }, 'plume')
      f(11, 16, 8, 1, INK); f(10, 15, 1, 1, INK); f(19, 15, 1, 1, INK)
      f(27, 1, 1, 9, LINE, 'it'); f(26, 9, 3, 1, GOLD, 'it')
      confetti(f)
    },
    // Any other agent, and the bar: a domino mask and confetti.
    other: f => {
      crabBody(f, 0, undefined, { eyes: IVORY })
      stamp(f, 7, 11, ['.ffffffffffffff.', 'ff..ffffffff..ff', '.fff........fff.'], { f: FIG })
      f(7, 11, 1, 1, GOLD); f(22, 11, 1, 1, GOLD)
      confetti(f)
    },
  },
  css: style(`${tierMotion('cv')}
.c-cv-fable .plume{transform-origin:0 100%;animation:sway 1s ease-in-out infinite}
.c-cv-heavy .it,.c-cv-careful .it{transform-origin:50% 100%}
.c-cv-heavy.run .it{animation:swing .5s ease-in-out infinite}.c-cv-heavy.idle .it{animation:swing 1s ease-in-out infinite}
.c-cv-careful .j1,.c-cv-careful .j2,.c-cv-careful .j3{animation:juggle .5s ease-in-out infinite}.c-cv-careful .j2{animation-delay:-.17s}.c-cv-careful .j3{animation-delay:-.33s}
.c-cv-careful.idle .j1,.c-cv-careful.idle .j2,.c-cv-careful.idle .j3{animation-duration:1s}
.c-cv-explore .plume{transform-origin:0 100%;animation:sway 1s ease-in-out infinite}
.c-cv-explore .it{transform-origin:50% 100%}.c-cv-explore.run .it{animation:fence .5s ease-in-out infinite}
.c-cv-medium.run .it{animation:hop .5s steps(1) infinite}
.c-cv-light .horn{transform-origin:100% 50%}.c-cv-light.run .horn{animation:toot .5s steps(1) infinite}.c-cv-light.idle .horn{animation:toot 1s steps(1) infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Easter ------------------------------------------------------------------

const EAR = ['.ew.', 'eppw', 'eppw', 'eppw', 'eppw', 'eppw', '.ew.', '.ew.', '.ew.']

const easterDress: Dress = {
  prefix: 'ea',
  accent: '#9C8CC8',
  sparkle: [YOLK, PINK],
  glyph: '🐣',
  ornament: ornament(
    ['..ll..', '.llll.', 'yyyyyy', 'llllll', 'pppppp', 'llllll', '.llll.', '..ll..'],
    { l: LILAC, y: YOLK, p: PINK },
    'o-wobble',
  ),
  costumes: {
    // Fable: bunny ears, one of them twitching; floats.
    fable: f => {
      crabBody(f)
      stamp(f, 9, 1, EAR, { e: SHADE, w: IVORY, p: PINK })
      stamp(f, 17, 1, EAR, { e: SHADE, w: IVORY, p: PINK }, 'ear')
    },
    // Heavy: hunting eggs, the basket swinging from the claw.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 3, ['.hhhhh.', 'h.....h', 'hpplyyh', 'kkkkkkk', 'kkkkkkk', '.kkkkk.'], { h: BROWN, p: PINK, l: LILAC, y: YOLK, k: KRAFT }, 'it')
    },
    // Careful: paints an egg, the brush in the tier's color.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 12, ['.ll.', 'lwwl', 'llll', 'lwwl', '.ll.'], { l: LILAC, w: IVORY })
      f(25, 3, 1, 7, BROWN, 'it'); f(25, 1, 1, 2, tint(t, FIG), 'it')
    },
    // Medium: a big chocolate egg in foil of the tier's color, tied with a gold bow; it wobbles.
    medium: (f, t) => {
      crabBody(f)
      stamp(f, 23, 10, ['..yy..', '.y..y.', '..tt..', '.tttt.', 'tttttt', 'twtttt', 'tttttt', 'tttttt', 'tttttt', '.tttt.', '..tt..'], { y: GOLD, t: tint(t, FIG), w: IVORY }, 'egg')
    },
    // Light: a chick hatched on its head, hopping in the shell.
    light: f => {
      crabBody(f)
      stamp(f, 12, 3, ['.yyy.', 'yykyo', 'yyyyy', '.yyy.'], { y: YOLK, k: INK, o: '#E8913A' }, 'chick')
      stamp(f, 10, 7, ['w.ww.ww.w', 'wwwwwwwww', 'ewwwwwwwe'], { w: IVORY, e: SHADE })
    },
    // Explore: on the lookout for the bunny, pith helmet and binoculars.
    explore: f => {
      crabBody(f)
      stamp(f, 8, 5, ['....hhhhhh....', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', 'eeeeeeeeeeeeee'], { h: KRAFT, e: '#A9824F' })
      f(8, 11, 4, 3, NIGHT); f(18, 11, 4, 3, NIGHT); f(12, 12, 6, 1, NIGHT)
      f(9, 12, 1, 1, '#A9D6F5', 'gl'); f(19, 12, 1, 1, '#A9D6F5', 'gl')
    },
    // Any other agent, and the bar: half an eggshell for a hat.
    other: f => {
      crabBody(f)
      stamp(f, 8, 6, ['w..w..w..w..w.', 'ww.ww.ww.ww.ww', 'wwwwwwwwwwwwww', 'ewwwwwwwwwwwwe'], { w: IVORY, e: SHADE })
    },
  },
  css: style(`${tierMotion('ea')}
.c-ea-fable .ear{transform-origin:50% 100%;animation:wob .5s steps(1) infinite}
.c-ea-heavy .it{transform-origin:50% 100%}.c-ea-heavy.run .it{animation:swing .5s ease-in-out infinite}.c-ea-heavy.idle .it{animation:swing 1s ease-in-out infinite}
.c-ea-careful.run .it{transform-origin:50% 100%;animation:twist .5s ease-in-out infinite}
.c-ea-medium .egg{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}
.c-ea-light.run .chick{animation:hop .25s steps(1) infinite}.c-ea-light.idle .chick{animation:hop 1s steps(1) infinite}
.o-wobble{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}`),
}

// --- Seasons: every tier in its own costume, at its own job ----------------------
// Fable, the rare one, floats or glides; Heavy digs, dives and looks under the surface;
// Careful does the delicate work; Medium the everyday work; Light runs; Explore scouts.
// Any other agent (and the bar) wears the season's plain outfit.

// Sunglasses, a glint on each lens.
const shades = (f: Fill): void => {
  f(8, 11, 4, 3, INK); f(18, 11, 4, 3, INK); f(12, 12, 6, 1, INK)
  f(9, 11, 1, 1, '#FFFFFF', 'gl'); f(19, 11, 1, 1, '#FFFFFF', 'gl')
}

// A soft hat over the head, in `c`.
const softHat = (f: Fill, c: string): void => stamp(f, 7, 7, ['....hhhhhhhh....', '...hhhhhhhhhh...', 'hhhhhhhhhhhhhhhh'], { h: c })

const BUTTERFLY_WING = ['.ff....', 'ffff...', 'ffgff..', 'ffffff.', '.ffffff', '..fffff', '.ppfff.', 'pppff..', '.pp....']

const leaves = (f: Fill): void => fall(f, LEAF, [RUST, GOLD, OLIVE])

const spring: Dress = {
  prefix: 'sp',
  accent: OLIVE,
  sparkle: [PINK, GOLD],
  glyph: '🌸',
  ornament: ornament(['.p.p.', 'ppppp', '.pcp.', 'ppppp', '.p.p.', '..g..', '.gg..', '..gg.', '..g..'], { p: PINK, c: GOLD, g: OLIVE }, 'o-wobble'),
  costumes: {
    // Fable: a butterfly, wings beating as it floats among the petals.
    fable: (f, t) => {
      crabBody(f)
      f(11, 7, 1, 3, INK); f(10, 6, 1, 1, INK); f(18, 7, 1, 3, INK); f(19, 6, 1, 1, INK)
      stamp(f, 0, 6, BUTTERFLY_WING, { f: tint(t, FIG), g: GOLD, p: PINK }, 'wl')
      stamp(f, 23, 6, mirror(BUTTERFLY_WING), { f: tint(t, FIG), g: GOLD, p: PINK }, 'wr')
      fall(f, PETAL, [PINK])
    },
    // Heavy: digs the bed with a spade and turns up a worm.
    heavy: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 7, 7, ['...tttttttttt...', '.tttttttttttttt.', 'tttttttttttttttttt'], { t })
      f(27, 5, 1, 15, BROWN, 'it'); f(26, 5, 3, 1, BROWN, 'it')
      stamp(f, 26, 20, ['mmm', 'mmm', '.m.'], { m: METAL }, 'it')
      stamp(f, 23, 23, ['...ss..', '.sssss.', 'sssssss'], { s: SOIL })
      f(24, 22, 2, 1, PINK, 'worm')
    },
    // Careful: waters a seedling drop by drop, gardening gloves on.
    careful: (f, t) => {
      crabBody(f, -4, 'it', { claws: tint(t, OLIVE) })
      stamp(f, 22, 5, ['..hhh...', '.h...h..', 'cccccc..', 'ccccccs.', 'cccccc.s'], { h: METAL, c: METAL, s: METAL }, 'it')
      stamp(f, 29, 11, ['w', '.', 'w'], { w: WATER }, 'drip')
      stamp(f, 26, 20, ['g.g', 'ggg', '.g.', '.g.', '.g.'], { g: GREEN })
    },
    // Medium: pots a tulip in the tier's color, apron on.
    medium: (f, t) => {
      crabBody(f, -4, 'it')
      f(9, 15, 12, 7, KRAFT); f(12, 17, 6, 3, '#B08955')
      stamp(f, 22, 3, ['..t.t.', '..ttt.', '...g..', '..gg..', 'pppppp', '.pppp.', '.pppp.'], { t: tint(t, FIG), g: GREEN, p: TERRACOTTA }, 'it')
    },
    // Light: runs with a kite dancing on its string.
    light: (f, t) => {
      crabBody(f)
      f(7, 10, 16, 1, t)
      f(27, 5, 1, 9, LINE)
      stamp(f, 22, 0, ['...p..t..', '..p..ttt.', '.p..ttwtt', '.....ttt.', '......t..'], { t: tint(t, FIG), w: IVORY, p: PINK }, 'kite')
    },
    // Explore: scouts the meadow with a butterfly net.
    explore: f => {
      crabBody(f, -4, 'it')
      softHat(f, '#6E7F4E')
      f(25, 4, 1, 6, BROWN, 'it')
      stamp(f, 23, 0, ['.nnn.', 'n...n', 'n...n', '.nnn.'], { n: LINE }, 'it')
      stamp(f, 1, 3, ['f.f', '.k.', 'f.f'], { f: FIG, k: INK }, 'bfly')
    },
    // Any other agent, and the bar: a crown of flowers, a butterfly, petals in the air.
    other: (f, t) => {
      crabBody(f)
      f(7, 9, 16, 1, OLIVE)
      ;[7, 11, 15, 19].forEach(x => stamp(f, x, 7, ['.p.', 'pcp', '.p.'], { p: tint(t, FIG), c: GOLD }))
      stamp(f, 23, 1, ['ff.ff', 'ffkff', '.pkp.'], { f: FIG, p: PINK, k: INK }, 'bfly')
      fall(f, PETAL, [PINK])
    },
  },
  css: style(`${tierMotion('sp')}
.c-sp-fable .wl{transform-origin:100% 50%}.c-sp-fable .wr{transform-origin:0 50%}
.c-sp-fable .wl,.c-sp-fable .wr{animation:flutter .5s steps(1) infinite}.c-sp-fable.run .wl,.c-sp-fable.run .wr{animation-duration:.25s}
.c-sp-heavy .it{transform-origin:50% 0}.c-sp-heavy.run .it{animation:dig .5s ease-in-out infinite}
.run .worm,.idle .worm{animation:hop .5s steps(1) infinite}
.run .drip{animation:drip .5s linear infinite}.idle .drip{animation:drip 1s linear infinite}
.c-sp-medium.run .it{animation:hop .5s steps(1) infinite}
.kite{transform-origin:70% 100%}.run .kite{animation:sway .5s ease-in-out infinite}.idle .kite{animation:sway 1s ease-in-out infinite}
.c-sp-explore .it{transform-origin:50% 100%}.c-sp-explore.run .it{animation:fence .5s ease-in-out infinite}
.bfly{transform-origin:50% 50%}.run .bfly{animation:flutter .25s steps(1) infinite}.idle .bfly{animation:flutter .5s steps(1) infinite}
.o-wobble{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}`),
}

const summer: Dress = {
  prefix: 'su',
  accent: SKY,
  sparkle: [YOLK, YOLK],
  glyph: '🌞',
  ornament: ornament(['....y....', '.y.....y.', '...ooo...', '..ooooo..', 'y.ooooo.y', '..ooooo..', '...ooo...', '.y.....y.', '....y....'], { o: GOLD, y: YOLK }, 'o-sun'),
  costumes: {
    // Fable: floats on a swim ring in the tier's color, sunglasses on, the sea lapping.
    fable: (f, t) => {
      crabBody(f, 0, undefined, { legs: 'none' })
      shades(f)
      stamp(f, 4, 18, ['..tttwwttttttttwwttt..', '.ttttwwttttttttwwtttt.', '.ttttwwttttttttwwtttt.', '..tttwwttttttttwwttt..'], { t: tint(t, SKY), w: IVORY })
      stamp(f, 0, 22, ['..ww....ww....ww....ww....ww..', 'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww'], { w: WATER }, 'sea')
    },
    // Heavy: dives to the bottom — mask, snorkel and fins in the tier's color, bubbles rising.
    heavy: (f, t) => {
      crabBody(f, 0, undefined, { legs: tint(t, SKY) })
      f(8, 11, 14, 1, INK); f(8, 14, 14, 1, INK); f(8, 12, 1, 2, INK); f(21, 12, 1, 2, INK)
      f(9, 12, 12, 2, GLASS)
      f(22, 4, 1, 8, tint(t, SKY)); f(22, 4, 2, 1, tint(t, SKY))
      stamp(f, 24, 0, ['.o', 'o.', '.o'], { o: WATER }, 'bub')
    },
    // Careful: builds a sandcastle and plants its flag, a bucket hat against the sun.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 7, 7, ['...tttttttttt...', '..tttttttttttt..', 'tttttttttttttttt'], { t })
      stamp(f, 24, 17, ['s.ss.s', 'ssssss', 'ssddss', 'ssssss', 'ssssss', 'sseess', 'sseess', 'ssssss'], { s: SAND, d: SAND_SHADE, e: SAND_SHADE })
      f(27, 11, 1, 6, BROWN)
      f(28, 11, 2, 2, t, 'flag')
      stamp(f, 0, 20, ['h..h', 'bbbb', 'bbbb', '.bb.'], { h: INK, b: tint(t, SKY) })
    },
    // Medium: a slice of watermelon, a bandana in the tier's color.
    medium: (f, t) => {
      crabBody(f, -4, 'it')
      f(7, 10, 16, 2, tint(t, SKY)); f(4, 10, 3, 1, tint(t, SKY)); f(5, 11, 2, 1, tint(t, SKY))
      stamp(f, 22, 4, ['gggggggg', 'wwwwwwww', 'rrkrrkrr', '.rrrrrr.', '..rkrr..', '...rr...'], { g: GREEN, w: IVORY, r: MELON, k: INK }, 'it')
    },
    // Light: surfs the wave at full speed.
    light: (f, t) => {
      crabBody(f)
      f(7, 10, 16, 1, t)
      stamp(f, 1, 26, ['.tttttttttttttttttttttttt.', '..wwwwwwwwwwwwwwwwwwwwww..'], { t: tint(t, SKY), w: IVORY })
      stamp(f, 0, 9, ['.ww', 'w..', 'w..', 'w..', 'ww.', '.ww'], { w: WATER }, 'sea')
    },
    // Explore: scans the shore with a spyglass, visor on.
    explore: f => {
      crabBody(f, -4, 'it')
      f(8, 9, 14, 1, OLIVE); f(20, 9, 5, 1, OLIVE)
      stamp(f, 22, 8, ['ggbbbbbb', 'ggbbbbbb'], { g: '#8A6A3A', b: BRASS }, 'it')
      f(29, 8, 1, 1, '#FFFFFF', 'gl')
    },
    // Any other agent, and the bar: a straw hat with a band in the tier's color, sunglasses, a gelato.
    other: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 6, 4, ['......hhhhhh......', '.....hhhhhhhh.....', '.....tttttttt.....', '.....hhhhhhhh.....', 'hhhhhhhhhhhhhhhhhh', '.eeeeeeeeeeeeeeee.'], { h: STRAW, t: tint(t, SKY), e: STRAW_SHADE })
      shades(f)
      stamp(f, 24, 1, ['.pp.', 'pppp', 'tttt', 'tttt', 'cccc', '.cc.', '.cc.', '..c.'], { p: PINK, t: tint(t, '#A8C98A'), c: KRAFT }, 'it')
    },
  },
  css: style(`${tierMotion('su')}
.run .sea,.idle .sea{animation:slide 1s steps(2) infinite}
.run .bub,.idle .bub{animation:rise 1s linear infinite}
.flag{transform-origin:0 50%;animation:wave .5s steps(1) infinite}
.c-su-medium.run .it,.c-su-other.run .it{animation:hop .5s steps(1) infinite}
.c-su-light{transform-box:fill-box;transform-origin:50% 100%}.c-su-light.run{animation:sway .5s ease-in-out infinite}
.c-su-explore.run .it{animation:scan 1s steps(1) infinite}
.o-sun{transform-origin:50% 50%;animation:spin45 1s linear infinite}`),
}

const autumn: Dress = {
  prefix: 'au',
  accent: RUST,
  sparkle: [GOLD, OLIVE],
  glyph: '🍂',
  ornament: ornament(['...r...', '..rrr..', '.rrrrr.', 'rrrrrrr', '.rrbrr.', '..rbr..', '...b...', '...b...'], { r: RUST, b: BROWN }, 'o-swing'),
  costumes: {
    // Fable: the wise owl — ear tufts, round spectacles, an open book; floats.
    fable: (f, t) => {
      crabBody(f)
      f(7, 8, 2, 2, BROWN); f(7, 7, 1, 1, BROWN); f(21, 8, 2, 2, BROWN); f(22, 7, 1, 1, BROWN)
      stamp(f, 8, 11, ['.kk.', 'k..k', 'k..k', '.kk.'], { k: GOLD }); stamp(f, 18, 11, ['.kk.', 'k..k', 'k..k', '.kk.'], { k: GOLD }); f(12, 12, 6, 1, GOLD)
      f(9, 17, 12, 4, tint(t, RUST)); f(10, 17, 4, 3, IVORY); f(14, 17, 2, 4, INK)
      f(16, 17, 4, 3, IVORY, 'pg')
      leaves(f)
    },
    // Heavy: hunts mushrooms, magnifier in one claw, the basket filling up in the other.
    heavy: (f, t) => {
      crabBody(f, -4, 'it')
      softHat(f, tint(t, RUST))
      stamp(f, 23, 1, ['.kkk.', 'k...k', 'k...k', 'k...k', '.kkk.'], { k: '#3A3A3C' }, 'it')
      f(24, 2, 3, 3, 'rgba(169,214,245,.7)', 'it'); f(25, 6, 1, 4, BROWN, 'it')
      stamp(f, 0, 17, ['.rr.rr.', '.ww.ww.', 'kkkkkkk', 'kkkkkkk', '.kkkkk.'], { r: BRICK, w: IVORY, k: KRAFT })
      leaves(f)
    },
    // Careful: roasts chestnuts over the flame, oven mitts on, steam rising.
    careful: (f, t) => {
      crabBody(f, 0, undefined, { claws: tint(t, RUST) })
      ;[10, 13, 16, 19].forEach(x => f(x, 18, 2, 1, '#7A4A2A'))
      f(8, 19, 14, 1, NIGHT); f(9, 20, 12, 1, NIGHT); f(22, 18, 4, 1, NIGHT)
      stamp(f, 13, 22, ['o..o', 'oyyo'], { o: '#E8913A', y: YOLK }, 'flame')
      stamp(f, 11, 14, ['s', '.', 's'], { s: LINE }, 'steam')
      stamp(f, 17, 13, ['s', '.', 's'], { s: LINE }, 'steam')
      leaves(f)
    },
    // Medium: the grape harvest — a bunch in the claw, the basket full, an apron in the tier's color.
    medium: (f, t) => {
      crabBody(f, -4, 'it')
      f(9, 15, 12, 7, tint(t, OLIVE))
      stamp(f, 23, 4, ['..l.', '.ll.', 'ggg.', 'gggg', '.ggg', '..g.'], { l: GREEN, g: GRAPE }, 'it')
      stamp(f, 0, 18, ['.g.gg..', 'kkkkkkk', 'kkkkkkk', '.kkkkk.'], { g: GRAPE, k: KRAFT })
      leaves(f)
    },
    // Light: rakes the leaves into a pile, at double pace.
    light: (f, t) => {
      crabBody(f)
      f(7, 10, 16, 1, t)
      f(1, 6, 1, 15, BROWN, 'it')
      stamp(f, 0, 21, ['mmm', 'm.m'], { m: METAL }, 'it')
      stamp(f, 24, 22, ['...r..', '.rgo..', 'rgorgr', 'ogrgor'], { r: RUST, g: GOLD, o: OLIVE })
      leaves(f)
    },
    // Explore: hikes the woods — backpack, walking stick, a hat.
    explore: f => {
      crabBody(f, -4, 'it')
      softHat(f, '#6E7F4E')
      stamp(f, 2, 9, ['.ttt', 'tttt', 'tkkt', 'tttt', 'tttt'], { t: RUST, k: INK })
      f(27, 3, 1, 22, BROWN, 'it'); f(26, 3, 3, 1, BROWN, 'it')
      leaves(f)
    },
    // Any other agent, and the bar: a beret, a scarf in the tier's color whose end sways, falling leaves.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 8, 6, ['........bb.....', '...bbbbbbbbbb..', '.bbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbb'], { b: '#9A4A35' })
      f(7, 18, 16, 2, tint(t, OLIVE))
      stamp(f, 19, 20, ['tt', 'tt', 'tt', 'w.'], { t: tint(t, OLIVE), w: IVORY }, 'tail')
      leaves(f)
    },
  },
  css: style(`${tierMotion('au')}
.run .fx,.idle .fx{animation-name:drift}
.c-au-fable .pg{transform-origin:0 50%;animation:flutter 1s steps(1) infinite}
.c-au-heavy.run .it{animation:scan 1s steps(1) infinite}
.run .flame,.idle .flame{animation:flicker .5s steps(1) infinite}
.run .steam,.idle .steam{animation:rise 1s linear infinite}
.c-au-medium.run .it{animation:hop .5s steps(1) infinite}
.c-au-light .it{transform-origin:50% 0}.c-au-light.run .it{animation:sway .25s ease-in-out infinite}.c-au-light.idle .it{animation:sway 1s ease-in-out infinite}
.c-au-explore .it{transform-origin:50% 100%}.c-au-explore.run .it{animation:sway .5s ease-in-out infinite}
.tail{transform-origin:50% 0}.run .tail{animation:sway .5s ease-in-out infinite}.idle .tail{animation:sway 1s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

const winter: Dress = {
  prefix: 'wi',
  accent: '#5F87A8',
  sparkle: [FROST, FROST],
  glyph: '⛄',
  ornament: ornament(['...s...', '.s.s.s.', '..sss..', 'sssssss', '..sss..', '.s.s.s.', '...s...'], { s: FROST }, 'o-flake'),
  costumes: {
    // Fable: figure-skates, drawing figures on the ice; earmuffs and a scarf in the tier's color.
    fable: (f, t) => {
      crabBody(f, 0, undefined, { legs: IVORY })
      f(8, 8, 14, 1, NIGHT); f(5, 10, 2, 4, t); f(23, 10, 2, 4, t)
      f(7, 18, 16, 2, t)
      stamp(f, 2, 17, ['tttt', '.ttt'], { t }, 'tail')
      ;[7, 11, 17, 21].forEach(x => f(x - 1, 26, 4, 1, LINE))
      f(0, 27, 30, 1, FROST)
      f(1, 25, 1, 1, '#FFFFFF', 'gl'); f(28, 24, 1, 1, '#FFFFFF', 'gl')
    },
    // Heavy: ice-fishes, looking under the surface; a fur hat with ear flaps.
    heavy: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 7, 5, ['..tttttttttttt..', '.tttttttttttttt.', 'wwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwww'], { t, w: '#E9E2D2' })
      f(6, 9, 2, 5, t); f(22, 9, 1, 5, t)
      f(26, 9, 1, 1, BROWN, 'it'); f(27, 8, 1, 1, BROWN, 'it'); f(28, 7, 1, 1, BROWN, 'it'); f(29, 6, 1, 1, BROWN, 'it')
      f(29, 7, 1, 15, LINE)
      f(24, 24, 6, 2, '#2F5F80'); f(22, 26, 8, 1, FROST)
      f(29, 21, 1, 2, BRICK, 'bob')
      snow(f)
    },
    // Careful: knits a scarf stitch by stitch, the yarn ball unrolling.
    careful: (f, t) => {
      crabBody(f)
      stamp(f, 10, 17, ['tetetetete', 'etetetetet', 'tetetetete'], { t, e: IVORY })
      f(8, 15, 1, 1, METAL, 'n1'); f(9, 16, 1, 1, METAL, 'n1'); f(10, 17, 1, 1, METAL, 'n1')
      f(21, 15, 1, 1, METAL, 'n2'); f(20, 16, 1, 1, METAL, 'n2'); f(19, 17, 1, 1, METAL, 'n2')
      f(20, 20, 5, 1, t)
      stamp(f, 25, 21, ['.tt.', 'tttt', 'tttt', '.tt.'], { t }, 'ball')
      snow(f)
    },
    // Medium: a mug of hot cocoa, steam curling up; earmuffs.
    medium: (f, t) => {
      crabBody(f, -4, 'it')
      f(8, 8, 14, 1, NIGHT); f(6, 9, 2, 4, t); f(22, 9, 1, 4, t)
      f(23, 6, 4, 4, t, 'it'); f(23, 6, 4, 1, '#6B3E26', 'it'); f(27, 7, 1, 2, t, 'it'); f(24, 5, 1, 1, IVORY, 'it')
      stamp(f, 24, 1, ['.s', 's.', '.s'], { s: LINE }, 'steam')
      snow(f)
    },
    // Light: sleds downhill at full speed, scarf streaming.
    light: (f, t) => {
      crabBody(f)
      f(3, 26, 23, 1, BRICK); f(2, 27, 25, 1, LINE); f(27, 25, 1, 2, LINE)
      f(7, 18, 16, 2, t)
      stamp(f, 1, 16, ['tttttt', '..tttt'], { t }, 'tail')
      f(0, 21, 3, 1, FROST, 'spd'); f(0, 24, 2, 1, FROST, 'spd')
      snow(f)
    },
    // Explore: a polar explorer in a fur-trimmed hood, lantern raised.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 6, 5, ['....hhhhhhhhhh....', '..hhhhhhhhhhhhhh..', '.hhhhhhhhhhhhhhhh.', 'hhffffffffffffffhh'], { h: BRICK, f: '#E9E2D2' })
      f(6, 9, 1, 5, BRICK)
      stamp(f, 24, 6, ['.k.', 'kyk', 'kyk', 'kkk'], { k: NIGHT, y: GLOW }, 'it')
      f(25, 7, 1, 2, GLOW, 'gl')
      snow(f)
    },
    // Any other agent, and the bar: a knitted beanie in the tier's color with a bouncing pompom, and snow.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 7, 5, ['....tttttttt....', '..tttttttttttt..', '.tttttttttttttt.', 'etetetetetetetet', 'tetetetetetetete'], { t: tint(t, SKY), e: SHADE })
      stamp(f, 13, 2, ['.ww.', 'wwww', '.ee.'], { w: IVORY, e: SHADE }, 'pom')
      snow(f)
    },
  },
  css: style(`${tierMotion('wi')}
.c-wi-fable.run,.c-wi-fable.idle{animation:glide 1s ease-in-out infinite}
.tail{transform-origin:100% 50%}.run .tail{animation:wave .25s steps(1) infinite}.idle .tail{animation:wave 1s steps(1) infinite}
.run .bob,.idle .bob{animation:hop .5s steps(1) infinite}
.c-wi-careful .n1,.c-wi-careful .n2{animation:click .5s steps(1) infinite}.c-wi-careful .n2{animation-delay:-.25s}.c-wi-careful.run .n1,.c-wi-careful.run .n2{animation-duration:.25s}
.c-wi-careful .ball{transform-origin:50% 50%;animation:wob 1s steps(1) infinite}
.run .steam,.idle .steam{animation:rise 1s linear infinite}
.c-wi-light.run{animation:zoom .25s steps(1) infinite}.run .spd{animation:slide .25s steps(1) infinite}
.c-wi-explore .it{transform-origin:50% 0}.c-wi-explore.run .it{animation:sway .5s ease-in-out infinite}
.run .pom{animation:hop .5s steps(1) infinite}.idle .pom{animation:hop 1s steps(1) infinite}
.o-flake{transform-origin:50% 50%;animation:spin90 1s linear infinite}`),
}

export const DRESSES: Record<Exclude<Theme, 'classic'>, Dress> = {
  halloween,
  christmas,
  befana,
  carnival,
  easter: easterDress,
  spring,
  summer,
  autumn,
  winter,
}

// The figure a theme draws: its own costume, or the theme's `other`.
export const costumeIn = (dress: Dress, figure: string): Costume | undefined => dress.costumes[figure] ?? dress.costumes.other

