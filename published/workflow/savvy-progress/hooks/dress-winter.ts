// Winter's holidays and periods: New Year's Day, the winter sales, the Immaculate
// Conception, Christmas Eve, Christmas Day, St Stephen's Day and New Year's Eve.
// The Christmas season itself and the Befana are in `themes.ts`.

import { INK, crabBody, stamp } from './sprite'
import type { Fill } from './sprite'
import {
  BRICK, BROWN, CANDLE, FIG, FROST, GLASS, GLOW, GOLD, INK_SOFT, IVORY, KRAFT, LILAC, LINE, METAL, NIGHT, PAPER, PINE,
  SHADE, SILVER, SKY, TERRACOTTA, WATER, bag, cart, confetti, fall, gift, ornament, snow, style, tierMotion, tint,
} from './wardrobe'
import type { Dress } from './wardrobe'

const BRASS_DARK = '#8C6A2E'

const goldConfetti = (f: Fill): void => fall(f, ['o', 'o'], [GOLD, SILVER, SKY])

// --- New Year's Day ----------------------------------------------------------

export const newYear: Dress = {
  prefix: 'ny',
  accent: '#B08A3E',
  sparkle: [GOLD, SILVER],
  glyph: '🍀',
  ornament: ornament(
    ['.k...k.', 'rrrrrrr', 'wwwkwww', 'wwkkwww', 'wwwkwww', 'wwwkwww', 'wwkkkww', 'wwwwwww'],
    { k: INK, r: BRICK, w: PAPER },
    'o-swing',
  ),
  costumes: {
    // Fable: makes a wish on a shooting star.
    fable: f => {
      crabBody(f)
      stamp(f, 17, 1, ['ss.....', '.ss..y.', '..s.yyy', '.....y.'], { s: '#F7E7A6', y: GOLD }, 'gl')
      goldConfetti(f)
    },
    // Heavy: reads the new calendar through its glasses.
    heavy: f => {
      crabBody(f, -4, 'it')
      f(8, 11, 4, 1, INK); f(8, 14, 4, 1, INK); f(18, 11, 4, 1, INK); f(18, 14, 4, 1, INK); f(12, 12, 6, 1, INK)
      stamp(f, 22, 2, ['.k..k.', 'rrrrrr', 'wwkwww', 'wkkwww', 'wwkwww', 'wwkwww', 'wkkkww', 'wwwwww'], { k: INK, r: BRICK, w: PAPER }, 'it')
      goldConfetti(f)
    },
    // Careful: writes the year's resolutions with a quill.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 14, ['pppppp', 'pkkkpp', 'pppppp', 'pkkpkp', 'pppppp', 'pkkkkp', 'pppppp'], { p: PAPER, k: '#9A9A96' })
      stamp(f, 24, 1, ['...w', '..ww', '.ww.', 'ww..', 'k...', 'k...'], { w: IVORY, k: INK }, 'it')
      goldConfetti(f)
    },
    // Medium: a bowl of lentils, for a year of plenty; it steams.
    medium: (f, t) => {
      crabBody(f)
      stamp(f, 23, 12, ['.llll.', 'cccccc', '.cccc.', '..cc..'], { l: '#8A6A3B', c: tint(t, TERRACOTTA) })
      stamp(f, 24, 8, ['.s.s', 's.s.'], { s: LINE }, 'steam')
      goldConfetti(f)
    },
    // Light: the New Year's dip, swim cap on, into the sea at a run.
    light: (f, t) => {
      crabBody(f)
      stamp(f, 7, 6, ['....tttttttt....', '..tttttttttttt..', '.tttwttttttwttt.', 'tttttttttttttttt'], { t: tint(t, SKY), w: IVORY })
      stamp(f, 0, 24, ['w.ww.ww.ww.ww.ww.ww.ww.ww.ww.', '.wwwwwwwwwwwwwwwwwwwwwwwwwwww'], { w: WATER }, 'spl')
      goldConfetti(f)
    },
    // Explore: a compass, pointing the way into the year.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 3, ['.kkk.', 'k.r.k', 'kkwkk', 'k.m.k', '.kkk.'], { k: BRASS_DARK, r: BRICK, w: IVORY, m: METAL }, 'it')
      goldConfetti(f)
    },
    // Any other agent, and the bar: a paper crown in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 7, 5, ['t....t....t....t', 'tt..ttt..ttt..tt', 'tttttttttttttttt', 'tyttttyttttyttty'], { t: tint(t, GOLD), y: IVORY })
      goldConfetti(f)
    },
  },
  css: style(`${tierMotion('ny')}
.c-ny-heavy.run .it{animation:scan 1s steps(1) infinite}
.c-ny-careful .it{transform-origin:0 100%}.c-ny-careful.run .it{animation:click .25s steps(1) infinite}.c-ny-careful.idle .it{animation:click 1s steps(1) infinite}
.run .steam,.idle .steam{animation:rise 1s linear infinite}
.run .spl{animation:hem .25s steps(1) infinite}.idle .spl{animation:hem 1s steps(1) infinite}
.c-ny-explore .it{transform-origin:50% 0}.c-ny-explore.run .it{animation:sway .5s ease-in-out infinite}.c-ny-explore.idle .it{animation:sway 1s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Winter sales ------------------------------------------------------------

const TAG = ['rrrr', 'rwwr', 'rrrr']

export const winterSales: Dress = {
  prefix: 'ws',
  accent: BRICK,
  sparkle: [BRICK, GOLD],
  glyph: '🏷️',
  ornament: ornament(
    ['..rrrrrr', '.rrrwrrw', 'rr.rrrwr', 'rrrrrwrr', '.rrrwrrr', '..rwrrwr'],
    { r: BRICK, w: PAPER },
    'o-swing',
  ),
  costumes: {
    // Fable: floats under a balloon marked with the discount.
    fable: f => {
      crabBody(f)
      f(25, 7, 1, 7, LINE)
      stamp(f, 22, 0, ['.rrrrr.', 'rrwrrwr', 'rrrrwrr', 'rrrwrrr', 'rrwrrwr', '.rrrrr.', '...r...'], { r: BRICK, w: PAPER }, 'bal')
      snow(f)
    },
    // Heavy: digs through the bargain bin and pulls out a jumper.
    heavy: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 19, ['.s.b.t.', 'kkkkkkk', 'kmmmmmk', 'kmmmmmk', 'kmmmmmk', 'kkkkkkk'], { s: SKY, b: BRICK, t: tint(t, GOLD), k: INK_SOFT, m: METAL })
      stamp(f, 22, 4, ['tt.tt', 'ttttt', '.ttt.', '.ttt.', '.ttt.'], { t: tint(t, SKY) }, 'it')
      snow(f)
    },
    // Careful: relabels with the price gun, a tag already on its chest.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 13, 17, TAG, { r: BRICK, w: PAPER })
      stamp(f, 22, 5, ['kkkkkk', 'kgggrk', 'kkkkkk', '...kk.', '...kk.'], { k: INK_SOFT, g: '#9BD39B', r: BRICK }, 'it')
      snow(f)
    },
    // Medium: carries the shopping home in two bags, a scarf on.
    medium: (f, t) => {
      crabBody(f)
      f(7, 18, 16, 2, t)
      bag(f, 0, 15, KRAFT, 'sw')
      bag(f, 25, 15, BRICK, 'sw')
      snow(f)
    },
    // Light: first through the doors with a cart.
    light: f => {
      crabBody(f)
      cart(f, 23, 18)
      f(0, 21, 3, 1, FROST, 'spd'); f(0, 24, 2, 1, FROST, 'spd')
      snow(f)
    },
    // Explore: checks the price tag through a magnifying glass.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 1, ['.kkk.', 'k...k', 'k...k', 'k...k', '.kkk.', '....k', '.....k'], { k: INK_SOFT }, 'it')
      f(23, 2, 3, 3, GLASS, 'it')
      stamp(f, 0, 12, ['..rrr', '.rrwr', 'rrrrr', '.rrrr'], { r: BRICK, w: PAPER })
      snow(f)
    },
    // Any other agent, and the bar: earmuffs in the tier's color and a sale tag.
    other: (f, t) => {
      crabBody(f)
      f(8, 8, 14, 1, NIGHT); f(5, 10, 2, 4, tint(t, BRICK)); f(23, 10, 2, 4, tint(t, BRICK))
      stamp(f, 13, 16, TAG, { r: BRICK, w: PAPER })
      snow(f)
    },
  },
  css: style(`${tierMotion('ws')}
.c-ws-fable .bal{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}
.c-ws-heavy.run .it{animation:scan 1s steps(1) infinite}.c-ws-heavy.idle .it{animation:hop 1s steps(1) infinite}
.c-ws-careful.run .it{animation:click .25s steps(1) infinite}.c-ws-careful.idle .it{animation:click 1s steps(1) infinite}
.sw{transform-origin:50% 0}.run .sw{animation:sway .5s ease-in-out infinite}.idle .sw{animation:sway 1s ease-in-out infinite}
.c-ws-light.run{animation:zoom .25s steps(1) infinite}.run .spd{animation:slide .25s steps(1) infinite}
.c-ws-explore.run .it{animation:scan 1s steps(1) infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Immaculate Conception: the day the tree goes up ---------------------------

export const immaculate: Dress = {
  prefix: 'im',
  accent: PINE,
  sparkle: [GOLD, BRICK],
  glyph: '⭐',
  ornament: ornament(
    ['...y...', '...g...', '..ggg..', '..grg..', '.ggggg.', '.gggbg.', 'ggggggg', '...k...'],
    { y: GOLD, g: PINE, r: BRICK, b: SKY, k: BROWN },
    'o-wobble',
  ),
  costumes: {
    // Fable: floats up to put the star on top of the tree.
    fable: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 3, ['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'], { y: GOLD }, 'it')
      f(28, 1, 1, 1, '#FFFFFF', 'gl'); f(21, 2, 1, 1, '#FFFFFF', 'gl')
      snow(f)
    },
    // Heavy: carries the tree in.
    heavy: f => {
      crabBody(f)
      stamp(f, 0, 4, ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', 'ggggggg', '...b...', '...b...', '...b...', '...b...'], { g: PINE, b: BROWN }, 'it')
      snow(f)
    },
    // Careful: sets out the nativity scene, a sheep at a time.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 17, ['..k..', '.kkk.', 'kkkkk', 'k.y.k', 'k...k'], { k: BROWN, y: GLOW })
      stamp(f, 23, 5, ['.ww..', 'wwwwk', 'wwww.', 'k..k.'], { w: IVORY, k: INK }, 'it')
      snow(f)
    },
    // Medium: hangs the baubles, a basket of them at hand.
    medium: (f, t) => {
      crabBody(f, -4, 'it')
      f(25, 3, 1, 3, LINE, 'it')
      stamp(f, 24, 6, ['.r.', 'rwr', 'rrr'], { r: tint(t, BRICK), w: IVORY }, 'it')
      stamp(f, 0, 16, ['.rg.', 'brgy', 'kkkk', 'kkkk'], { r: BRICK, g: PINE, b: SKY, y: GOLD, k: KRAFT })
      snow(f)
    },
    // Light: runs the string of lights out, the bulbs blinking.
    light: f => {
      crabBody(f)
      f(3, 18, 24, 1, INK_SOFT)
      ;[BRICK, GOLD, PINE, SKY, FIG].forEach((c, i) => f(4 + i * 5, 19, 2, 2, c, i % 2 ? 'b2' : 'b1'))
      snow(f)
    },
    // Explore: brings the box of decorations down from the attic by lantern light.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 13, ['.r.g..', 'kkkkkk', 'kxxxxk', 'kxxxxk'], { r: BRICK, g: GOLD, k: '#A9824F', x: KRAFT })
      stamp(f, 24, 6, ['.k.', 'kyk', 'kyk', 'kkk'], { k: NIGHT, y: GLOW }, 'it')
      f(25, 7, 1, 2, GLOW, 'gl')
      snow(f)
    },
    // Any other agent, and the bar: a tinsel boa in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 6, 18, ['t.t.t.t.t.t.t.t.t', '.t.t.t.t.t.t.t.t.'], { t: tint(t, GOLD) }, 'tn')
      snow(f)
    },
  },
  css: style(`${tierMotion('im')}
.c-im-fable .it{animation:hop 1s steps(1) infinite}
.c-im-heavy .it{transform-origin:50% 100%}.c-im-heavy.run .it{animation:wob .5s steps(1) infinite}
.c-im-careful.run .it{animation:scan 1s steps(1) infinite}
.c-im-medium .it{transform-origin:50% 0}.c-im-medium.run .it{animation:swing .5s ease-in-out infinite}.c-im-medium.idle .it{animation:swing 1s ease-in-out infinite}
.b1{animation:blink 1s steps(1) infinite}.b2{animation:blink 1s steps(1) infinite -.5s}
.c-im-explore .it{transform-origin:50% 0}.c-im-explore.run .it{animation:sway .5s ease-in-out infinite}
.tn{animation:glow 1s ease-in-out infinite}
.o-wobble{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}`),
}

// --- Christmas Eve -----------------------------------------------------------

export const christmasEve: Dress = {
  prefix: 'ce',
  accent: '#2F4B7C',
  sparkle: [GOLD, IVORY],
  glyph: '🌟',
  ornament: ornament(['..y..', '..o..', '.ccc.', '.ccc.', '.ccc.', 'hhhhh'], { y: GLOW, o: '#E8913A', c: CANDLE, h: PINE }, 'o-flicker'),
  costumes: {
    // Fable: floats with the comet star on a stick, lighting the way.
    fable: f => {
      crabBody(f, -4, 'it')
      f(25, 4, 1, 7, BROWN, 'it')
      stamp(f, 23, 0, ['..y..', 'yyyyy', '.yyy.', 'y...y'], { y: GOLD }, 'it')
      f(21, 1, 1, 1, '#FFFFFF', 'gl'); f(28, 5, 1, 1, '#FFFFFF', 'gl')
      snow(f)
    },
    // Heavy: brings in the big fish for the dinner; it wriggles.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 0, ['f.f', '.f.', 'sss', 'sks', 'sss', 'sss', 'sss', '.s.', '.s.', '.s.'], { f: '#7FA7C4', s: '#A9C4D9', k: INK }, 'it')
      snow(f)
    },
    // Careful: wraps the last gift, ribbon in hand.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      gift(f, 0, 15, tint(t, PINE), GOLD)
      stamp(f, 23, 6, ['.gg.', 'g..g', 'g..g', '.gg.'], { g: GOLD }, 'it')
      snow(f)
    },
    // Medium: milk and cookies left out for Santa.
    medium: f => {
      crabBody(f)
      stamp(f, 24, 9, ['gg', 'ww', 'ww', 'ww', 'ww'], { g: GLASS, w: IVORY })
      stamp(f, 0, 18, ['.bb.bb', 'pppppp'], { b: '#B9784A', p: PAPER }, 'it')
      snow(f)
    },
    // Light: runs the sack of gifts to the tree.
    light: f => {
      crabBody(f)
      stamp(f, 0, 6, ['..kk..', '.ssss.', 'ssssss', 'ssssss', 'ssssss', '.ssss.'], { k: GOLD, s: BRICK }, 'it')
      snow(f)
    },
    // Explore: tracks the sleigh across the sky on its radar dish.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 1, ['...mm', '..m..', '.m.r.', '.m...', '..m..', '...mm'], { m: METAL, r: BRICK }, 'it')
      f(24, 7, 1, 3, METAL, 'it')
      f(26, 3, 1, 1, BRICK, 'gl')
      snow(f)
    },
    // Any other agent, and the bar: a striped nightcap in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 7, 2, ['..............ww', '............tt..', '..........wwww..', '........tttttt..', '......wwwwwwww..', '....tttttttttt..', '..wwwwwwwwwwww..', 'tttttttttttttttt'], { t: tint(t, SKY), w: IVORY })
      snow(f)
    },
  },
  css: style(`${tierMotion('ce')}
.c-ce-heavy .it{transform-origin:50% 100%}.c-ce-heavy.run .it{animation:wob .25s steps(1) infinite}.c-ce-heavy.idle .it{animation:wob 1s steps(1) infinite}
.c-ce-careful .it{transform-origin:50% 50%}.c-ce-careful.run .it{animation:twist .5s ease-in-out infinite}
.c-ce-medium .it{animation:hop 1s steps(1) infinite}
.c-ce-light .it{transform-origin:50% 100%}.c-ce-light.run .it{animation:sway .25s ease-in-out infinite}.c-ce-light.idle .it{animation:sway 1s ease-in-out infinite}
.c-ce-explore .it{transform-origin:50% 100%}.c-ce-explore.run .it,.c-ce-explore.idle .it{animation:sway 1s ease-in-out infinite}
.o-flicker{animation:flicker .5s steps(1) infinite}`),
}

// --- Christmas Day -----------------------------------------------------------

const SANTA_HAT = ['.............rr...', '...........rrrr...', '.........rrrrrr...', '.......rrrrrrrr...', '.....rrrrrrrrrrr..', '...rrrrrrrrrrrrrr.', 'wwwwwwwwwwwwwwwwww', 'eeeeeeeeeeeeeeeeee']

export const christmasDay: Dress = {
  prefix: 'cd',
  accent: BRICK,
  sparkle: [BRICK, PINE],
  glyph: '🎁',
  ornament: ornament(['.y..y.', '..yy..', 'rryyrr', 'rryyrr', 'rryyrr', 'rryyrr'], { y: GOLD, r: BRICK }, 'o-wobble'),
  costumes: {
    // Fable: a halo and a golden trumpet, tooting the news.
    fable: f => {
      crabBody(f)
      f(11, 7, 8, 1, GOLD, 'gl')
      stamp(f, 24, 13, ['....yy', 'yyyyyy', '....yy'], { y: GOLD }, 'horn')
      snow(f)
    },
    // Heavy: lifts the lid off the biggest present; something glows inside.
    heavy: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 6, ['.y..y.', 'cccccc', 'cccccc'], { y: GOLD, c: tint(t, BRICK) }, 'it')
      stamp(f, 23, 19, ['ccyycc', 'ccyycc', 'ccyycc', 'ccyycc', 'ccyycc'], { y: GOLD, c: tint(t, BRICK) })
      f(25, 17, 1, 1, GLOW, 'gl'); f(27, 16, 1, 1, GLOW, 'gl')
      snow(f)
    },
    // Careful: unties the ribbon without tearing the paper.
    careful: f => {
      crabBody(f, -4, 'it')
      gift(f, 0, 14, PINE, GOLD)
      stamp(f, 23, 6, ['y.', '.y', 'y.', '.y'], { y: GOLD }, 'it')
      snow(f)
    },
    // Medium: Christmas lunch, the ladle in the pot of broth.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 15, ['kkkkkk', 'kbbbbk', 'kbbbbk', '.kkkk.'], { k: METAL, b: '#E9C46A' })
      stamp(f, 1, 11, ['.s.s', 's.s.'], { s: LINE }, 'steam')
      stamp(f, 24, 3, ['.m', '.m', '.m', 'mm', 'mm'], { m: METAL }, 'it')
      snow(f)
    },
    // Light: off at a run with the new toy car on a string.
    light: (f, t) => {
      crabBody(f)
      f(2, 18, 1, 4, LINE)
      stamp(f, 0, 22, ['.rrr.', 'rrrrr', '.k.k.'], { r: tint(t, BRICK), k: INK }, 'toy')
      snow(f)
    },
    // Explore: reads the new book found under the tree.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 5, ['bbb.bbb', 'bwwbwwb', 'bwwbwwb', 'bbbbbbb'], { b: BROWN, w: PAPER }, 'it')
      snow(f)
    },
    // Any other agent, and the bar: a Santa hat in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 6, 2, SANTA_HAT, { r: tint(t, BRICK), w: IVORY, e: SHADE })
      stamp(f, 20, 0, ['ww', 'ee'], { w: IVORY, e: SHADE }, 'pom')
      snow(f)
    },
  },
  css: style(`${tierMotion('cd')}
.c-cd-fable .horn{transform-origin:0 50%}.c-cd-fable.run .horn{animation:toot .5s steps(1) infinite}.c-cd-fable.idle .horn{animation:toot 1s steps(1) infinite}
.c-cd-heavy.run .it{animation:hop .5s steps(1) infinite}.c-cd-heavy.idle .it{animation:hop 1s steps(1) infinite}
.c-cd-careful .it{transform-origin:0 0}.c-cd-careful.run .it{animation:wave .25s steps(1) infinite}.c-cd-careful.idle .it{animation:wave 1s steps(1) infinite}
.run .steam,.idle .steam{animation:rise 1s linear infinite}
.c-cd-light.run .toy{animation:zoom .25s steps(1) infinite}
.c-cd-explore.run .it{animation:hop .5s steps(1) infinite}
.run .pom{animation:hop .5s steps(1) infinite}.idle .pom{animation:hop 1s steps(1) infinite}
.o-wobble{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}`),
}

// --- St Stephen's Day: leftovers, tombola, the sofa ------------------------------

export const stStephen: Dress = {
  prefix: 'st',
  accent: '#8A6A9B',
  sparkle: [GOLD, LILAC],
  glyph: '🛋️',
  ornament: ornament(['wwwww', 'wkwww', 'wwkww', 'wwwkw', 'wwwww'], { w: PAPER, k: INK }, 'o-wobble'),
  costumes: {
    // Fable: floats asleep on a cushion, the z's rising.
    fable: f => {
      crabBody(f, 0, undefined, { eyes: 'none' })
      f(9, 13, 2, 1, INK); f(19, 13, 2, 1, INK)
      stamp(f, 4, 22, ['.pppppppppppppppppppp.', 'pppppppppppppppppppppp'], { p: LILAC })
      stamp(f, 24, 3, ['zzz', '.z.', 'zzz'], { z: SKY }, 'zz')
      snow(f)
    },
    // Heavy: digs into the leftovers, a drumstick in its claw.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 3, ['.bb.', 'bbbb', 'bbbb', '.bb.', '..w.', '..w.'], { b: '#B9784A', w: IVORY }, 'it')
      snow(f)
    },
    // Careful: plays tombola, a bean for every number.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 13, ['pppppp', 'pkpkpk', 'pprppp', 'pkprpk', 'pppppp'], { p: PAPER, k: INK, r: BRICK })
      f(24, 8, 2, 2, '#B9784A', 'it')
      snow(f)
    },
    // Medium: a slice of panettone, raisins and all.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 2, ['.bbbb.', 'bbbbbb', 'yryyyr', 'yyyryy', 'yyyyyy', 'pppppp'], { b: BROWN, y: '#F2D27A', r: BRICK, p: PAPER }, 'it')
      snow(f)
    },
    // Light: runs the lunch off, headband and trainers on.
    light: (f, t) => {
      crabBody(f)
      f(7, 9, 16, 1, tint(t, SKY))
      f(6, 25, 4, 1, IVORY, 'la'); f(16, 25, 4, 1, IVORY, 'la'); f(10, 25, 4, 1, IVORY, 'lb'); f(20, 25, 4, 1, IVORY, 'lb')
      f(24, 8, 1, 2, SKY, 'drp')
      snow(f)
    },
    // Explore: rolls the die for the board game.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 5, ['wwwww', 'wkwkw', 'wwwww', 'wkwkw', 'wwwww'], { w: PAPER, k: INK }, 'it')
      stamp(f, 0, 21, ['rwrwrw', 'wrwrwr'], { r: BRICK, w: PAPER })
      snow(f)
    },
    // Any other agent, and the bar: a blanket over its shoulders, in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 6, 9, ['.tttttttttttttttt.', 'tttttttttttttttttt', 'tt..............tt', 'tt..............tt', 'tt..............tt'], { t: tint(t, LILAC) })
      snow(f)
    },
  },
  css: style(`${tierMotion('st')}
.run .zz,.idle .zz{animation:rise 1s linear infinite}
.c-st-heavy.run .it{animation:hop .5s steps(1) infinite}.c-st-heavy.idle .it{animation:hop 1s steps(1) infinite}
.c-st-careful.run .it{animation:click .5s steps(1) infinite}
.c-st-medium .it{transform-origin:50% 100%;animation:wob 1s steps(1) infinite}
.run .drp,.idle .drp{animation:drip 1s linear infinite}
.c-st-explore.run .it{animation:rattle .25s steps(1) infinite}.c-st-explore.idle .it{animation:rattle 1s steps(1) infinite}
.o-wobble{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}`),
}

// --- New Year's Eve ----------------------------------------------------------

export const newYearsEve: Dress = {
  prefix: 'ne',
  accent: '#5B4B8A',
  sparkle: [GOLD, FIG],
  glyph: '🥂',
  ornament: ornament(
    ['y..y..y', '.y.y.y.', '..yyy..', 'yyyfyyy', '..yyy..', '.y.y.y.', 'y..y..y'],
    { y: GOLD, f: FIG },
    'o-spin',
  ),
  costumes: {
    // Fable: floats under a firework bursting overhead.
    fable: f => {
      crabBody(f)
      stamp(f, 21, 0, ['y.f.y', '.yfy.', 'fffff', '.yfy.', 'y.f.y'], { y: GOLD, f: FIG }, 'bst')
      confetti(f)
    },
    // Heavy: cotechino and lentils at midnight, fork raised.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 17, ['.lcll.', 'llcccl', 'pppppp'], { l: '#8A6A3B', c: '#C9787A', p: PAPER })
      stamp(f, 24, 3, ['m.m.m', 'mmmmm', '..m..', '..m..', '..m..'], { m: METAL }, 'it')
      confetti(f)
    },
    // Careful: eases the cork out of the bottle; it pops.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 24, 2, ['.y.', '.g.', 'ggg', 'ggg', 'gwg', 'ggg', 'ggg', 'ggg'], { y: GOLD, g: '#2F5F3A', w: PAPER }, 'it')
      f(25, 0, 1, 1, '#B9784A', 'cork')
      confetti(f)
    },
    // Medium: raises a glass of bubbly, the bubbles rising.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 24, 3, ['g.g', 'gyg', 'gyg', '.y.', '.y.', 'yyy'], { g: GLASS, y: '#F5DE8A' }, 'it')
      f(25, 1, 1, 1, IVORY, 'bub')
      confetti(f)
    },
    // Light: runs with a sparkler, the sparks flying.
    light: f => {
      crabBody(f)
      f(1, 8, 1, 7, METAL)
      stamp(f, 0, 5, ['y.y', '.w.', 'y.y'], { y: GOLD, w: '#FFFFFF' }, 'sp')
      confetti(f)
    },
    // Explore: watches the clock for the countdown.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 3, ['.kkk.', 'kwkwk', 'kwkwk', 'kwwwk', '.kkk.'], { k: INK_SOFT, w: IVORY }, 'it')
      confetti(f)
    },
    // Any other agent, and the bar: a sequined headband with two bobbing stars.
    other: (f, t) => {
      crabBody(f)
      f(7, 8, 16, 1, tint(t, FIG)); f(10, 4, 1, 4, INK_SOFT); f(19, 4, 1, 4, INK_SOFT)
      stamp(f, 9, 2, ['.y.', 'yyy', '.y.'], { y: GOLD }, 'gl')
      stamp(f, 18, 2, ['.y.', 'yyy', '.y.'], { y: GOLD }, 'gl')
      confetti(f)
    },
  },
  css: style(`${tierMotion('ne')}
.run .bst,.idle .bst{animation:blink .5s steps(1) infinite}
.c-ne-heavy.run .it{animation:hop .5s steps(1) infinite}
.c-ne-careful.run .it{animation:rattle .25s steps(1) infinite}.run .cork,.idle .cork{animation:juggle 1s ease-in-out infinite}
.run .bub,.idle .bub{animation:rise 1s linear infinite}
.run .sp,.idle .sp{animation:blink .25s steps(1) infinite}
.c-ne-explore.run .it{animation:click 1s steps(1) infinite}
.o-spin{transform-origin:50% 50%;animation:spin45 1s linear infinite}`),
}
