// Autumn's holidays and periods: All Saints' Day, All Souls' Day and Black Friday.
// Autumn itself, Halloween and the return to school are elsewhere.

import { crabBody, stamp } from './sprite'
import type { Fill } from './sprite'
import {
  BRASS, BROWN, GLASS, GLOW, GOLD, GREEN, INK_SOFT, IVORY, KRAFT, LILAC, METAL, ROSE, SHADE, SKY, WAX, YOLK,
  bag, candle, cart, coins, fall, ornament, style, tierMotion, tint,
} from './wardrobe'
import type { Dress } from './wardrobe'

const FLAME = '.run .flame,.idle .flame{animation:flicker .5s steps(1) infinite}'

// --- All Saints' Day: halos and light -----------------------------------------

const motes = (f: Fill): void => fall(f, ['o'], [GOLD, YOLK])

export const allSaints: Dress = {
  prefix: 'as',
  accent: '#B08A3E',
  sparkle: [GOLD, IVORY],
  glyph: '😇',
  ornament: ornament(['.yyyyy.', 'y.....y', '.yyyyy.'], { y: GOLD }, 'o-glow'),
  costumes: {
    // Fable: a halo and a golden robe; the halo shines.
    fable: f => {
      crabBody(f)
      stamp(f, 9, 5, ['..yyyyyyyy..', '.y........y.', '..yyyyyyyy..'], { y: GOLD }, 'gl')
      f(7, 18, 16, 4, GOLD); f(7, 18, 16, 1, YOLK)
      motes(f)
    },
    // Heavy: carries the tall procession candle.
    heavy: f => {
      crabBody(f)
      f(24, 4, 2, 10, WAX); f(24, 13, 2, 1, BRASS)
      stamp(f, 24, 1, ['yy', '.o', 'oo'], { y: GLOW, o: '#E8913A' }, 'flame')
      motes(f)
    },
    // Careful: sets the stained glass, piece by piece.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 0, ['..kkk..', '.krkbk.', 'kbkykrk', 'kykgkyk', 'krkbkgk', 'kkkkkkk'], { k: INK_SOFT, r: ROSE, b: SKY, y: YOLK, g: GREEN }, 'it')
      f(22, 1, 5, 4, GLASS, 'gl')
      motes(f)
    },
    // Medium: a plate of the season's biscuits, almonds on top.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 20, 5, ['.bb.bb.', 'bkbbkbb', 'mmmmmmmm'], { b: KRAFT, k: BROWN, m: SHADE }, 'it')
      motes(f)
    },
    // Light: rings the bell as it runs.
    light: f => {
      crabBody(f)
      f(25, 3, 1, 11, BROWN)
      stamp(f, 22, 4, ['.yyy.', 'yyyyy', 'yyyyy', 'yyyyy', '..k..'], { y: GOLD, k: INK_SOFT }, 'bel')
      motes(f)
    },
    // Explore: the pilgrim, staff in claw and the scallop shell on the hat.
    explore: f => {
      crabBody(f)
      stamp(f, 6, 5, ['......hhhhhh......', '.....hhhhhhhh.....', 'hhhhhhhhhhhhhhhhhh'], { h: BROWN })
      stamp(f, 13, 3, ['.ss.', 'ssss'], { s: IVORY })
      f(27, 4, 1, 22, KRAFT, 'stk'); f(26, 3, 3, 2, GOLD, 'stk')
      motes(f)
    },
    // Any other agent, and the bar: a small halo in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 11, 6, ['.tttttt.', 't......t', '.tttttt.'], { t: tint(t, GOLD) }, 'gl')
      motes(f)
    },
  },
  css: style(`${tierMotion('as')}
${FLAME}
.c-as-heavy.run .bd,.c-as-explore.run .bd{animation-duration:1s}
.c-as-careful.run .it{animation:click .5s steps(1) infinite}
.c-as-medium.run .it{animation:hop .5s steps(1) infinite}
.c-as-light .bel{transform-origin:50% 0;animation:swing 1s ease-in-out infinite}.c-as-light.run .bel{animation-duration:.5s}
.c-as-explore .stk{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}
.o-glow{animation:glow 1s ease-in-out infinite}`),
}

// --- All Souls' Day: sober, muted and slow ---------------------------------------
// No particles, no double pace: a gentle breath and the candles' light.

const MUM = '#C9A35B'
const MUM_WHITE = '#E6E1D6'
const MUTED_GREEN = '#6F7F63'
const STONE = '#8E8A82'

export const allSouls: Dress = {
  prefix: 'so',
  accent: '#7D7468',
  sparkle: [SHADE, LILAC],
  glyph: '🕯️',
  ornament: ornament(['.y.', '.o.', 'ccc', 'ccc', 'ccc', 'ccc'], { y: GLOW, o: '#E8913A', c: WAX }, 'o-calm'),
  costumes: {
    // Fable: carries a lantern, its light steady.
    fable: f => {
      crabBody(f)
      f(25, 4, 1, 3, STONE)
      stamp(f, 23, 7, ['.sss.', 's...s', 's.y.s', 's.y.s', 'sssss'], { s: STONE, y: GLOW }, 'flame')
      f(24, 8, 3, 3, GLASS)
    },
    // Heavy: brings the pot of chrysanthemums.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 1, ['.m.m.m.', 'mmmmmmm', '.mmmmm.', '..ggg..', 'ttttttt', '.ttttt.', '.ttttt.'], { m: MUM, g: MUTED_GREEN, t: '#9A6A4F' }, 'it')
    },
    // Careful: lights the votive candle, sheltering the flame.
    careful: f => {
      crabBody(f)
      stamp(f, 0, 15, ['.rrr.', 'r...r', 'rcccr', 'rcccr', 'rrrrr'], { r: '#8E3B3B', c: WAX })
      stamp(f, 2, 13, ['y', 'o'], { y: GLOW, o: '#E8913A' }, 'flame')
    },
    // Medium: a bunch of white flowers.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 0, ['w.w.w', 'wwwww', '.www.', 'g.g.g', '.ggg.', '..g..', '..g..', '..g..', '..g..', '..g..'], { w: MUM_WHITE, g: MUTED_GREEN }, 'it')
    },
    // Light: waters the flowers, unhurried.
    light: f => {
      crabBody(f)
      stamp(f, 22, 9, ['....mm', 'mmmm.m', 'mmmmm.', 'mmmm..'], { m: METAL }, 'it')
      fall(f, ['o'], [SKY], [28])
    },
    // Explore: walks with a lit candle.
    explore: f => {
      crabBody(f, -4)
      candle(f, 24, 4)
    },
    // Any other agent, and the bar: a chrysanthemum on its head.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 13, 5, ['.m.m.', 'mmmmm', '.mmm.', '..g..'], { m: tint(t, MUM), g: MUTED_GREEN }, 'it')
    },
  },
  css: style(`@keyframes calm{50%{transform:translateY(-1px)}}
${FLAME.replace('.5s', '1s')}
.c-so-fable.run,.c-so-fable.idle{animation:calm 1s ease-in-out infinite}.c-so-fable.run .la,.c-so-fable.run .lb,.c-so-fable.run .bd{animation:none}
.c-so-heavy .it,.c-so-medium .it{transform-origin:50% 100%;animation:wob 1s ease-in-out infinite}
.c-so-other .it{transform-origin:50% 100%;animation:wob 1s ease-in-out infinite}
.c-so-light .it{transform-origin:0 100%;animation:wob 1s ease-in-out infinite}
.o-calm{animation:glow 1s ease-in-out infinite}`),
}

// --- Black Friday: black and gold, the carts laden --------------------------------

const BLACK = '#2B2A28'

export const blackFriday: Dress = {
  prefix: 'bk',
  accent: '#B8892E',
  sparkle: [GOLD, '#5A5853'],
  glyph: '🏷️',
  ornament: ornament(['..yy...', '.y..y..', 'kkkkkk.', 'kykkyk.', 'kkyykk.', 'kkkkkk.'], { k: BLACK, y: GOLD }, 'o-swing'),
  costumes: {
    // Fable: a gold coin flipped high, a top hat on.
    fable: f => {
      crabBody(f)
      stamp(f, 9, 3, ['..kkkkkkkk..', '..kkkkkkkk..', '..kyyyyyyk..', 'kkkkkkkkkkkk'], { k: BLACK, y: GOLD })
      stamp(f, 23, 6, ['.yy.', 'yooy', 'yooy', '.yy.'], { y: GOLD, o: YOLK }, 'cn')
      coins(f)
    },
    // Heavy: carries the giant box home.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 19, 0, ['kkkkkkkkkk', 'kkkkyykkkk', 'kkkkyykkkk', 'yyyyyyyyyy', 'kkkkyykkkk', 'kkkkyykkkk', 'kkkkyykkkk', 'kkkkkkkkkk'], { k: KRAFT, y: BROWN }, 'it')
      coins(f)
    },
    // Careful: pays with the card at the till, the receipt checked.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 5, ['yyyyyy', 'kkkkkk', 'yyyyyy', 'yykyyy'], { y: GOLD, k: BLACK }, 'it')
      stamp(f, 0, 14, ['mmmmm', 'mgggm', 'mmmmm', 'mmmmm', 'm...m'], { m: METAL, g: '#7FC27F' })
      coins(f)
    },
    // Medium: black and gold bags in both claws.
    medium: f => {
      crabBody(f)
      bag(f, 0, 12, BLACK, 'bg'); bag(f, 24, 12, GOLD, 'bg')
      coins(f)
    },
    // Light: sprints down the aisle with the laden cart.
    light: f => {
      crabBody(f)
      stamp(f, 23, 11, ['.yb.', 'kkyy'], { y: GOLD, b: BLACK, k: KRAFT }, 'whl')
      cart(f, 23, 13, 'whl')
      coins(f)
    },
    // Explore: hunts the deals on the laptop.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 20, 3, ['kkkkkkkk', 'ksssssyk', 'ksyssssk', 'ksssssyk', 'kkkkkkkk', '.mmmmmm.'], { k: BLACK, s: SKY, y: GOLD, m: METAL }, 'it')
      coins(f)
    },
    // Any other agent, and the bar: a black cap with a gold % in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 7, 4, ['....kkkkkkkk....', '...kkkykkykkk...', '..kkkkkykkkkkk..', '..kkkykkykkkkk..', 'kkkkkkkkkkkkkkkkkk'], { k: BLACK, y: tint(t, GOLD) })
      coins(f)
    },
  },
  css: style(`${tierMotion('bk')}
.c-bk-fable .cn{animation:juggle 1s ease-in-out infinite}
.c-bk-heavy.run .it{animation:hop .5s steps(1) infinite}.c-bk-heavy.idle .it{animation:hop 1s steps(1) infinite}
.c-bk-careful.run .it{animation:slide .5s steps(1) infinite}.c-bk-careful.idle .it{animation:slide 1s steps(1) infinite}
.c-bk-medium .bg{transform-origin:50% 0;animation:sway 1s ease-in-out infinite}
.c-bk-light.run .whl{animation:zoom .25s steps(1) infinite}.c-bk-light.idle .whl{animation:zoom 1s steps(1) infinite}
.c-bk-explore.run .it{animation:scan 1s steps(1) infinite}.c-bk-explore.idle .it{animation:click 1s steps(1) infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}
