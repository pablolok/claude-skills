// Summer's holidays and periods: Republic Day, the summer holidays, the summer
// sales, Ferragosto and the return to school. Summer itself is in `themes.ts`.

import { INK, crabBody, stamp } from './sprite'
import type { Fill } from './sprite'
import {
  BRASS, BRICK, BROWN, FIG, FROST, FLAG_GREEN, FLAG_RED, GLASS, GLOW, GOLD, GREEN, INK_SOFT, IVORY, KRAFT, LINE, METAL, MIMOSA,
  OLIVE, PAPER, PINK, SAND, SHADE, SILVER, SKY, SMALL_CLOTH, STRAW, STRAW_SHADE, TERRACOTTA, WATER, YOLK, bag, coins, fall,
  ornament, style, tierMotion, tint, wavingFlag,
} from './wardrobe'
import type { Dress } from './wardrobe'

// --- Republic Day: every figure waves the tricolour --------------------------------

const tricolour = (f: Fill): void => fall(f, ['o', 'o'], [FLAG_GREEN, SILVER, FLAG_RED])

export const republicDay: Dress = {
  prefix: 'rd',
  accent: FLAG_GREEN,
  sparkle: [FLAG_GREEN, FLAG_RED],
  glyph: '🇮🇹',
  ornament: ornament(
    ['pggkkrr', 'pggwwrr', 'pggwwrr', 'pggkkrr', 'p......', 'p......', 'p......'],
    { p: BRASS, g: FLAG_GREEN, w: PAPER, k: SHADE, r: FLAG_RED },
    'o-wave',
  ),
  costumes: {
    // Fable: the Frecce Tricolori fly past, trailing green, white and red, and it waves them on.
    fable: f => {
      crabBody(f)
      wavingFlag(f, 23, 3, 11)
      stamp(f, 0, 1, ['gggg.', 'wwwwk', 'rrrr.'], { g: FLAG_GREEN, w: SHADE, r: FLAG_RED, k: SKY }, 'trl')
      tricolour(f)
    },
    // Heavy: the bersagliere, black plumes on the hat, the flag held high.
    heavy: f => {
      crabBody(f)
      stamp(f, 8, 7, ['..kkkkkkkkkk..', 'kkkkkkkkkkkkkk'], { k: INK_SOFT })
      stamp(f, 4, 3, ['kk....', 'kkkk..', '.kkkkk', '...kkk'], { k: INK }, 'plm')
      wavingFlag(f, 24, 2, 12)
      tricolour(f)
    },
    // Careful: hoists the flag up the mast, hand over hand.
    careful: f => {
      crabBody(f)
      f(28, 0, 1, 26, METAL)
      f(27, 6, 1, 8, LINE)
      stamp(f, 22, 1, ['rrkkgg', 'rrwwgg', 'rrwwgg', 'rrkkgg'], { g: FLAG_GREEN, w: PAPER, k: SHADE, r: FLAG_RED }, 'hst')
      tricolour(f)
    },
    // Medium: a tricolour gelato, pistachio, fiordilatte and strawberry, a flag stuck in the top.
    medium: f => {
      crabBody(f, -4)
      wavingFlag(f, 24, 0, 5, SMALL_CLOTH)
      stamp(f, 22, 4, ['.ggww.', 'ggwwrr', '.wwrr.', 'kkkkkk', '.kkkk.', '..kk..'], { g: '#8DB86B', w: IVORY, r: '#E8707A', k: KRAFT })
      tricolour(f)
    },
    // Light: marches in the parade with the drum, the flag on its back.
    light: f => {
      crabBody(f)
      wavingFlag(f, 3, 2, 12)
      stamp(f, 11, 17, ['kkkkkkkk', 'rwrwrwrw', 'rwrwrwrw', 'kkkkkkkk'], { k: INK_SOFT, r: FLAG_RED, w: PAPER })
      stamp(f, 21, 13, ['k.', '.k', '..k'], { k: BROWN }, 'stk')
      tricolour(f)
    },
    // Explore: photographs the parade, a small flag in the other claw.
    explore: f => {
      crabBody(f, -4, 'it')
      wavingFlag(f, 4, 8, 6, SMALL_CLOTH)
      stamp(f, 21, 4, ['..kk...', 'kkkkkkk', 'kkwwkkk', 'kwggwkk', 'kkwwkkk'], { k: INK_SOFT, w: SILVER, g: SKY }, 'it')
      tricolour(f)
    },
    // Any other agent, and the bar: a little tricolour on its head.
    other: f => {
      crabBody(f)
      wavingFlag(f, 14, 3, 7, SMALL_CLOTH)
      tricolour(f)
    },
  },
  css: style(`${tierMotion('rd')}
.run .flg,.idle .flg{transform-origin:0 50%;animation:wave .5s steps(1) infinite}.c-rd-light.run .flg{animation-duration:.25s}
@keyframes hoist{0%{transform:translateY(6px)}25%{transform:translateY(4px) skewY(12deg) scaleX(.85)}50%{transform:translateY(2px)}75%{transform:translateY(0) skewY(12deg) scaleX(.85)}}
.c-rd-careful .hst{transform-origin:100% 50%;animation:hoist 1s steps(1) infinite}
.c-rd-fable .trl{animation:slide .5s steps(1) infinite}
.c-rd-heavy .plm{transform-origin:100% 100%;animation:sway 1s ease-in-out infinite}
.c-rd-light .stk{animation:click .5s steps(1) infinite}.c-rd-light.run .stk{animation-duration:.25s}
.c-rd-explore.run .it{animation:scan 1s steps(1) infinite}
.o-wave{transform-origin:0 50%;animation:wave 1s steps(1) infinite}`),
}

// --- Summer holidays: off on the trip -----------------------------------------

const SUNLIGHT = ['o.o', '.o.', 'o.o']
const sunlight = (f: Fill): void => fall(f, SUNLIGHT, [YOLK, WATER])
const WHEEL = ['.kkk.', 'k...k', 'kkkkk', 'k...k', '.kkk.']

export const summerHolidays: Dress = {
  prefix: 'sh',
  accent: '#2E86AB',
  sparkle: [WATER, YOLK],
  glyph: '🏖️',
  ornament: ornament(['...k...', '.rrwrr.', 'rrwwwrr', '...k...', '...k...', '...k...', 'sssssss'], { k: BROWN, r: BRICK, w: PAPER, s: SAND }, 'o-swing'),
  costumes: {
    // Fable: rises in a hot-air balloon, the stripes in the tier's color.
    fable: (f, t) => {
      crabBody(f)
      stamp(f, 17, 0, ['..tttt..', '.twwtwt.', 'twwttwwt', 'ttwwttww', '.tttttt.', '..t..t..', '..l..l..', '..l..l..'], { t: tint(t, BRICK), w: PAPER, l: LINE }, 'bal')
      sunlight(f)
    },
    // Heavy: pitches the tent, the mallet coming down on the peg.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 15, ['...g...', '..ggg..', '.gg.gg.', 'gg...gg', 'gggggg.', 'k.....k'], { g: OLIVE, k: BROWN })
      stamp(f, 22, 3, ['bbbb', 'bbbb', '.k..', '.k..', '.k..', '.k..', '.k..'], { b: BROWN, k: KRAFT }, 'it')
      sunlight(f)
    },
    // Careful: spreads the sunscreen, every inch covered.
    careful: f => {
      crabBody(f, -4, 'it')
      f(8, 15, 2, 1, IVORY); f(20, 15, 2, 1, IVORY); f(14, 11, 2, 1, IVORY)
      stamp(f, 23, 3, ['.kk.', 'wwww', 'wyyw', 'wyyw', 'wwww', 'wwww'], { k: INK_SOFT, w: PAPER, y: YOLK }, 'it')
      sunlight(f)
    },
    // Medium: pasta on the camping stove, the pot steaming.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 4, ['.yy.y..', 'mmmmmmm', 'mmmmmmm', '.mmmmm.', '..rrr..'], { y: STRAW, m: METAL, r: '#E8913A' }, 'it')
      stamp(f, 22, 1, ['.s', 's.'], { s: LINE }, 'steam')
      sunlight(f)
    },
    // Light: off on the scooter, the wheels spinning.
    light: (f, t) => {
      crabBody(f, 0, undefined, { legs: 'none' })
      stamp(f, 6, 21, ['tttttttttttttttttt', '.tttttttttttttttt.'], { t: tint(t, WATER) })
      f(24, 15, 1, 6, METAL); f(23, 15, 3, 1, INK_SOFT)
      stamp(f, 4, 22, WHEEL, { k: INK_SOFT }, 'whl')
      stamp(f, 20, 22, WHEEL, { k: INK_SOFT }, 'whl')
      sunlight(f)
    },
    // Explore: down the cave, the headlamp lit and the rope coiled.
    explore: f => {
      crabBody(f, -4, 'it')
      f(7, 9, 16, 1, INK_SOFT)
      stamp(f, 13, 7, ['yyyy', 'yyyy'], { y: GLOW }, 'gl')
      stamp(f, 22, 3, ['.rrrr.', 'r....r', 'r.rr.r', 'r....r', '.rrrr.'], { r: '#E8913A' }, 'it')
      sunlight(f)
    },
    // Any other agent, and the bar: sunglasses in the tier's color and a flower lei.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 8, 11, ['tttt..tttt', 'tttttttttt', 'tttt..tttt'], { t: tint(t, INK_SOFT) })
      stamp(f, 8, 17, ['pyrpyrpyrpyrpy'], { p: PINK, y: MIMOSA, r: FIG })
      sunlight(f)
    },
  },
  css: style(`${tierMotion('sh')}
.c-sh-fable .bal{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}
.c-sh-heavy .it{transform-origin:50% 100%}.c-sh-heavy.run .it{animation:swing .5s ease-in-out infinite}.c-sh-heavy.idle .it{animation:swing 1s ease-in-out infinite}
.c-sh-careful.run .it{animation:click .25s steps(1) infinite}.c-sh-careful.idle .it{animation:click 1s steps(1) infinite}
.run .steam,.idle .steam{animation:rise 1s linear infinite}
.c-sh-medium.run .it{animation:hop .5s steps(1) infinite}
.whl{transform-origin:50% 50%}.run .whl{animation:spin45 .25s linear infinite}.idle .whl{animation:spin45 1s linear infinite}
.c-sh-explore.run .it{animation:scan 1s steps(1) infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Summer sales: the heat, the bags and the tags -------------------------------

const TAG = ['ttt', 'tkt', 'ttt']

export const summerSales: Dress = {
  prefix: 'ss',
  accent: '#D9822B',
  sparkle: [GOLD, BRICK],
  glyph: '🛍️',
  ornament: ornament(['..kk...', '.k..k..', 'rrrrrr.', 'rwrrwr.', 'rrwwrr.', 'rrrrrr.'], { k: INK_SOFT, r: BRICK, w: PAPER }, 'o-swing'),
  costumes: {
    // Fable: floats along, fanning itself.
    fable: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 2, ['t.t.t.t', 'ttttttt', '.ttttt.', '..ttt..', '...k...', '...k...'], { t: tint(t, FIG), k: BROWN }, 'it')
      coins(f)
    },
    // Heavy: under a straw hat, carries every bag at once.
    heavy: f => {
      crabBody(f)
      stamp(f, 6, 6, ['....hhhhhhhh....', '..hhhhhhhhhhhh..', 'hhhhhhhhhhhhhhhhhh'], { h: STRAW })
      bag(f, 0, 12, BRICK, 'it'); bag(f, 23, 12, SKY, 'bg'); bag(f, 26, 15, YOLK, 'bg')
      coins(f)
    },
    // Careful: looks the sandal over, the price tag hanging.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 4, ['....bb.', 'bbbbbb.', 'sssssss', '.....tt', '.....tk'], { b: BROWN, s: KRAFT, t: GOLD, k: INK }, 'it')
      coins(f)
    },
    // Medium: tries the sunglasses on in the mirror.
    medium: f => {
      crabBody(f)
      f(8, 11, 4, 3, INK); f(18, 11, 4, 3, INK); f(12, 12, 6, 1, INK)
      stamp(f, 0, 9, ['.mmm.', 'mgggm', 'mgggm', 'mgggm', '.mmm.', '..m..', '..m..'], { m: METAL, g: GLASS }, 'mr')
      coins(f)
    },
    // Light: runs for the last pair, its sun hat flying off.
    light: f => {
      crabBody(f)
      stamp(f, 16, 2, ['..hhhh..', '.hhhhhh.', 'hhhhhhhh'], { h: STRAW_SHADE }, 'hat')
      coins(f)
    },
    // Explore: checks the price online, the phone held up.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 2, ['kkkk', 'kssk', 'kgsk', 'kssk', 'ksgk', 'kkkk'], { k: INK_SOFT, s: SKY, g: GOLD }, 'it')
      coins(f)
    },
    // Any other agent, and the bar: a straw hat with a tag in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 6, 6, ['....hhhhhhhh....', '..hhhhhhhhhhhh..', 'hhhhhhhhhhhhhhhhhh'], { h: STRAW })
      stamp(f, 20, 3, TAG, { t: tint(t, GOLD), k: INK })
      coins(f)
    },
  },
  css: style(`${tierMotion('ss')}
.c-ss-fable .it{transform-origin:50% 100%}.c-ss-fable.run .it{animation:sway .5s ease-in-out infinite}.c-ss-fable.idle .it{animation:sway 1s ease-in-out infinite}
.c-ss-heavy .it,.c-ss-heavy .bg{transform-origin:50% 0;animation:sway 1s ease-in-out infinite}
.c-ss-careful .it{transform-origin:50% 100%}.c-ss-careful.run .it{animation:twist .5s ease-in-out infinite}.c-ss-careful.idle .it{animation:twist 1s ease-in-out infinite}
.c-ss-medium .mr{transform-origin:50% 100%;animation:wob 1s ease-in-out infinite}
.c-ss-light .hat{animation:juggle 1s ease-in-out infinite}.c-ss-light.run .hat{animation-duration:.5s}
.c-ss-explore.run .it{animation:scan 1s steps(1) infinite}.c-ss-explore.idle .it{animation:click 1s steps(1) infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Ferragosto: the beach, the grill and the fireworks ----------------------------

const sparks = (f: Fill): void => fall(f, SUNLIGHT, [GOLD, FIG, SKY])

export const ferragosto: Dress = {
  prefix: 'fg',
  accent: '#E0525A',
  sparkle: [GOLD, FIG],
  glyph: '🎆',
  ornament: ornament(['y..y..y', '.y.y.y.', '..yyy..', 'yyy.yyy', '..yyy..', '.y.y.y.', 'y..y..y'], { y: GOLD }, 'o-burst'),
  costumes: {
    // Fable: floats on the inflatable flamingo.
    fable: f => {
      crabBody(f, 0, undefined, { legs: 'none' })
      stamp(f, 23, 3, ['.pp.', 'pppk', 'pp..', 'pp..', 'pp..', 'pp..', 'pp..', 'pp..', 'pp..', 'pp..', 'pp..'], { p: PINK, k: INK })
      stamp(f, 3, 21, ['pppppppppppppppppppppppp', '.pppppppppppppppppppppp.'], { p: FIG })
      sparks(f)
    },
    // Heavy: digs the beach umbrella into the sand.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 13, 0, ['.....rrwwrr....', '..rrwwrrwwrrww.', 'rwwrrwwrrwwrrww', '.......k.......'], { r: BRICK, w: PAPER, k: BROWN }, 'it')
      f(20, 4, 1, 6, BROWN, 'it')
      f(0, 25, 30, 1, SAND)
      sparks(f)
    },
    // Careful: turns the skewers on the grill, the smoke rising.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 16, ['mmmmmm', 'm.m.mm', 'kkkkkk', '.k..k.', '.k..k.', '.k..k.'], { m: METAL, k: INK_SOFT })
      stamp(f, 1, 13, ['.s', 's.'], { s: LINE }, 'steam')
      stamp(f, 20, 6, ['mrbrbrby'], { m: METAL, r: BRICK, b: BROWN, y: GREEN }, 'it')
      sparks(f)
    },
    // Medium: carries the baking dish of pasta al forno, bubbling.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 20, 5, ['.ryryry.', 'kyyyyyyk', 'kkkkkkkk'], { r: BRICK, y: YOLK, k: TERRACOTTA }, 'it')
      stamp(f, 22, 2, ['.s', 's.'], { s: LINE }, 'steam')
      sparks(f)
    },
    // Light: runs the beach ball into the sea.
    light: f => {
      crabBody(f)
      stamp(f, 22, 5, ['.rww.', 'rrwwy', 'bbbyy', 'bbsyy', '.bss.'], { r: BRICK, w: PAPER, y: YOLK, b: SKY, s: GREEN }, 'ball')
      f(0, 25, 30, 1, WATER)
      sparks(f)
    },
    // Explore: points at the fireworks over the sea.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 0, ['g...g...g', '.g..g..g.', '..g.g.g..', 'ggggyggggg', '..g.g.g..', '.g..g..g.'], { g: FIG, y: GOLD }, 'gl')
      sparks(f)
    },
    // Any other agent, and the bar: sunglasses and a beach towel in the tier's color.
    other: (f, t) => {
      crabBody(f)
      f(8, 11, 4, 3, INK); f(18, 11, 4, 3, INK); f(12, 12, 6, 1, INK)
      stamp(f, 7, 16, ['twtwtwtwtwtwtwtw', 'twtwtwtwtwtwtwtw'], { t: tint(t, SKY), w: PAPER })
      sparks(f)
    },
  },
  css: style(`${tierMotion('fg')}
@keyframes burst{0%{transform:scale(.5);opacity:.4}50%{transform:scale(1);opacity:1}100%{transform:scale(1.1);opacity:0}}
.c-fg-heavy.run .it{animation:dig .5s steps(1) infinite}.c-fg-heavy.idle .it{animation:dig 1s steps(1) infinite}
.run .steam,.idle .steam{animation:rise 1s linear infinite}
.c-fg-careful .it{transform-origin:50% 50%}.c-fg-careful.run .it{animation:rattle .5s steps(1) infinite}.c-fg-careful.idle .it{animation:rattle 1s steps(1) infinite}
.c-fg-medium.run .it{animation:hop .5s steps(1) infinite}
.c-fg-light .ball{animation:juggle 1s ease-in-out infinite}.c-fg-light.run .ball{animation-duration:.5s}
.c-fg-explore .gl{transform-origin:50% 50%;animation:burst 1s ease-out infinite}
.o-burst{transform-origin:50% 50%;animation:burst 1s ease-out infinite}`),
}

// --- Back to school ----------------------------------------------------------

const crayons = (f: Fill): void => fall(f, ['o', 'o', 'o'], [BRICK, SKY, YOLK])

export const backToSchool: Dress = {
  prefix: 'sc',
  accent: '#3E6E9E',
  sparkle: [BRICK, SKY],
  glyph: '🎒',
  ornament: ornament(['.yyyyyy', 'kyyyyyy', '.yyyyyy', '..pppp.', '...pp..', '....p..'], { y: YOLK, k: PINK, p: STRAW }, 'o-swing'),
  costumes: {
    // Fable: the mortarboard on, the tassel swinging.
    fable: f => {
      crabBody(f)
      stamp(f, 6, 5, ['..kkkkkkkkkkkkkk..', 'kkkkkkkkkkkkkkkkkk', '....kkkkkkkkkk....'], { k: INK_SOFT })
      stamp(f, 22, 6, ['y', 'y', 'y', 'yy'], { y: GOLD }, 'tsl')
      crayons(f)
    },
    // Heavy: hauls the heaviest backpack, every book inside.
    heavy: (f, t) => {
      crabBody(f)
      stamp(f, 0, 7, ['.ttttt.', 'ttttttt', 'tkkkkkt', 'ttttttt', 'tt.k.tt', 'ttttttt', 'ttttttt', '.ttttt.'], { t: tint(t, BRICK), k: INK_SOFT }, 'it')
      crayons(f)
    },
    // Careful: sharpens the pencil to a fine point.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 20, 4, ['kyyyyyyp', 'kyyyyyyp'], { k: INK, y: YOLK, p: PINK }, 'it')
      stamp(f, 0, 17, ['mmmm', 'mmkm', 'mmmm'], { m: METAL, k: INK_SOFT })
      fall(f, ['o'], [KRAFT], [2, 5])
      crayons(f)
    },
    // Medium: the apple for the teacher, the lunchbox packed.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 3, ['..g.', '.rr.', 'rrrr', 'rrrr', '.rr.'], { g: GREEN, r: BRICK }, 'it')
      stamp(f, 0, 15, ['.kk.', 'bbbb', 'bwbb', 'bbbb'], { k: INK_SOFT, b: SKY, w: PAPER })
      crayons(f)
    },
    // Light: runs after its paper plane, the satchel bouncing.
    light: f => {
      crabBody(f)
      stamp(f, 21, 3, ['www...', '.wwww.', '..wwww', '.ww...'], { w: FROST }, 'pln')
      stamp(f, 8, 17, ['bbbbbb', 'bbkbbb', 'bbbbbb'], { b: BROWN, k: GOLD }, 'it')
      crayons(f)
    },
    // Explore: spins the globe, the continents going round.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 1, ['..bbb..', '.bgbbg.', 'bggbbbg', 'bbbggbb', '.bbggb.', '..bbb..'], { b: SKY, g: GREEN }, 'glb')
      stamp(f, 23, 7, ['m...m', '.mmm.', '..m..'], { m: BRASS })
      crayons(f)
    },
    // Any other agent, and the bar: the backpack straps in the tier's color, a pencil behind the eye.
    other: (f, t) => {
      crabBody(f)
      f(9, 10, 2, 12, tint(t, SKY)); f(19, 10, 2, 12, tint(t, SKY))
      stamp(f, 17, 6, ['kyyyyyp'], { k: INK, y: YOLK, p: PINK })
      crayons(f)
    },
  },
  css: style(`${tierMotion('sc')}
.c-sc-fable .tsl{transform-origin:50% 0;animation:sway 1s ease-in-out infinite}
.c-sc-heavy.run .it{animation:hop .5s steps(1) infinite}.c-sc-heavy.idle .it{animation:hop 1s steps(1) infinite}
.c-sc-careful .it{transform-origin:0 50%}.c-sc-careful.run .it{animation:rattle .25s steps(1) infinite}.c-sc-careful.idle .it{animation:rattle 1s steps(1) infinite}
.c-sc-medium.run .it{animation:hop .5s steps(1) infinite}
.c-sc-light .pln{animation:glide 1s ease-in-out infinite}.c-sc-light.run .it{animation:hop .25s steps(1) infinite}
.c-sc-explore .glb{transform-origin:50% 50%;animation:flutter 1s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}
