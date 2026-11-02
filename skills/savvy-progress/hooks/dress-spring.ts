// Spring's holidays and periods: Valentine's Day, Women's Day, Father's Day, the
// Easter holidays, Liberation Day, Labour Day and Mother's Day. Carnival and Easter
// itself are in `themes.ts`.

import { INK, crabBody, mirror, stamp } from './sprite'
import type { Fill } from './sprite'
import {
  BRICK, BROWN, CHOCOLATE, FIG, FLAG_GREEN, FLAG_RED, GLOW, GOLD, GRAPE, GREEN, HEART, INK_SOFT, IVORY, KRAFT, LINE,
  METAL, MIMOSA, NIGHT, OLIVE, PAPER, PETAL, PINK, ROSE, SHADE, SKY, STRAW, YOLK, cockade, fall, flag, hearts,
  ornament, style, tierMotion, tint,
} from './wardrobe'
import type { Dress } from './wardrobe'

const petals = (f: Fill, colors: string[]): void => fall(f, PETAL, colors)

// --- Valentine's Day ---------------------------------------------------------

const CUPID_WING = ['....ew', '..eeww', '.ewwww', 'ewwwww', '.ewww.', '..ew..']

export const valentine: Dress = {
  prefix: 'va',
  accent: ROSE,
  sparkle: [ROSE, PINK],
  glyph: '💘',
  ornament: ornament(HEART, { o: ROSE }, 'o-beat'),
  costumes: {
    // Fable: Cupid, wings beating, bow drawn.
    fable: f => {
      crabBody(f)
      stamp(f, 1, 7, CUPID_WING, { w: IVORY, e: SHADE }, 'wl')
      stamp(f, 23, 7, mirror(CUPID_WING), { w: IVORY, e: SHADE }, 'wr')
      stamp(f, 26, 13, ['b.', '.b', '.b', '.b', 'b.'], { b: BROWN })
      stamp(f, 19, 14, ['........r', 'kkkkkkkrr', '........r'], { k: BROWN, r: ROSE }, 'arw')
      hearts(f)
    },
    // Heavy: finds the box of chocolates.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 3, ['.rr.rr.', 'rrrrrrr', 'rcrcrcr', '.rrrrr.', '..rrr..', '...r...'], { r: ROSE, c: CHOCOLATE }, 'it')
      hearts(f)
    },
    // Careful: writes the love letter and seals it with a heart.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 15, ['kkkkkk', 'pkppkp', 'ppkkpp', 'pprrpp', 'pppppp'], { k: SHADE, p: PAPER, r: ROSE })
      stamp(f, 24, 2, ['...r', '..rr', '.rr.', 'rr..', 'k...'], { r: PINK, k: INK }, 'it')
      hearts(f)
    },
    // Medium: a bunch of red roses.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 0, ['r.r.r', 'rrrrr', '.rrr.', 'g.g.g', '.ggg.', '..g..', '..g..', '..g..', '..g..', '..g..'], { r: ROSE, g: GREEN }, 'it')
      hearts(f)
    },
    // Light: runs a heart balloon over to its valentine.
    light: f => {
      crabBody(f)
      f(4, 5, 1, 9, LINE)
      stamp(f, 2, 0, HEART, { o: ROSE }, 'bal')
      hearts(f)
    },
    // Explore: follows the treasure map to the date, the heart marking the spot.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 12, ['pppppp', 'pk.k.p', 'p.k.kp', 'pk.r.p', 'pppppp'], { p: STRAW, k: BROWN, r: ROSE })
      stamp(f, 23, 4, ['.kkk.', 'k.r.k', 'kkkkk'], { k: BROWN, r: ROSE }, 'it')
      hearts(f)
    },
    // Any other agent, and the bar: heart-shaped glasses in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 7, 10, HEART, { o: tint(t, ROSE) })
      stamp(f, 17, 10, HEART, { o: tint(t, ROSE) })
      f(12, 11, 5, 1, INK)
      hearts(f)
    },
  },
  css: style(`${tierMotion('va')}
@keyframes beat{50%{transform:scale(1.15)}}
.c-va-fable .wl{transform-origin:100% 50%}.c-va-fable .wr{transform-origin:0 50%}
.c-va-fable.run .wl{animation:flapL .5s ease-in-out infinite}.c-va-fable.run .wr{animation:flapR .5s ease-in-out infinite}
.c-va-fable.idle .wl{animation:flapL 1s ease-in-out infinite}.c-va-fable.idle .wr{animation:flapR 1s ease-in-out infinite}
.c-va-fable .arw{animation:slide 1s steps(1) infinite}
.c-va-heavy .it{transform-origin:50% 50%;animation:beat 1s steps(1) infinite}
.c-va-careful.run .it{animation:click .25s steps(1) infinite}
.c-va-medium .it{transform-origin:50% 100%}.c-va-medium.run .it{animation:sway .5s ease-in-out infinite}
.c-va-light .bal{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}
.c-va-explore.run .it{animation:scan 1s steps(1) infinite}
.o-beat{transform-origin:50% 50%;animation:beat 1s steps(1) infinite}`),
}

// --- Women's Day: mimosa -------------------------------------------------------

const pompoms = (f: Fill): void => fall(f, ['oo', 'oo'], [MIMOSA])
const SPRIG = ['yy.y', 'yyyy', '.yg.', '..g.', '..g.']

export const womensDay: Dress = {
  prefix: 'wd',
  accent: '#C99A00',
  sparkle: [MIMOSA, GREEN],
  glyph: '🌼',
  ornament: ornament(['.yy.y..', 'yyyyyy.', '.yyg.yy', '..g.yyy', '.g...y.', 'g......'], { y: MIMOSA, g: GREEN }, 'o-swing'),
  costumes: {
    // Fable: floats crowned with mimosa.
    fable: f => {
      crabBody(f)
      stamp(f, 7, 7, ['y.yy.y.yy.y.yy.y', 'gyggyggyggyggygg'], { y: MIMOSA, g: GREEN }, 'gl')
      pompoms(f)
    },
    // Heavy: shoulders a whole branch of mimosa.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 0, ['..yy.yy', '.yyyyyy', 'yyygyyy', '.ygyyy.', '..g.y..', '..g....', '..g....', '..g....', '..g....', '..g....'], { y: MIMOSA, g: GREEN }, 'it')
      pompoms(f)
    },
    // Careful: ties the bouquet with a ribbon in the tier's color.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 9, ['y.yy.', 'yyyyy', '.yyy.', '..g..', '.rgr.', '..g..', '..g..'], { y: MIMOSA, g: GREEN, r: tint(t, FIG) })
      stamp(f, 24, 6, ['r.', '.r', 'r.', '.r'], { r: tint(t, FIG) }, 'it')
      pompoms(f)
    },
    // Medium: a mimosa cake, crumbs and cream.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 3, ['.y.y.y.', 'yyyyyyy', 'yyyyyyy', 'ccccccc', 'yyyyyyy', 'ppppppp'], { y: MIMOSA, c: IVORY, p: PAPER }, 'it')
      pompoms(f)
    },
    // Light: runs round handing out sprigs.
    light: f => {
      crabBody(f)
      stamp(f, 0, 8, ['yy.yy', 'yyyyy', '.g.g.', '..g..', '..g..', '..g..'], { y: MIMOSA, g: GREEN }, 'it')
      pompoms(f)
    },
    // Explore: the suffragist's sash, a sprig raised high.
    explore: f => {
      crabBody(f, -4, 'it')
      for (let i = 0; i < 12; i++) f(8 + i, 10 + i, 2, 1, i % 4 < 2 ? GRAPE : GREEN)
      stamp(f, 23, 4, SPRIG, { y: MIMOSA, g: GREEN }, 'it')
      pompoms(f)
    },
    // Any other agent, and the bar: a sprig of mimosa on its head.
    other: f => {
      crabBody(f)
      stamp(f, 18, 5, SPRIG, { y: MIMOSA, g: GREEN })
      pompoms(f)
    },
  },
  css: style(`${tierMotion('wd')}
.c-wd-heavy .it,.c-wd-explore .it,.c-wd-light .it{transform-origin:50% 100%}
.c-wd-heavy.run .it,.c-wd-explore.run .it{animation:sway .5s ease-in-out infinite}.c-wd-heavy.idle .it,.c-wd-explore.idle .it{animation:sway 1s ease-in-out infinite}
.c-wd-careful .it{transform-origin:0 0}.c-wd-careful.run .it{animation:wave .25s steps(1) infinite}.c-wd-careful.idle .it{animation:wave 1s steps(1) infinite}
.c-wd-medium.run .it{animation:hop .5s steps(1) infinite}
.c-wd-light.run .it{animation:sway .25s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Father's Day: St Joseph, the carpenter ------------------------------------

const sawdust = (f: Fill): void => fall(f, ['o'], [STRAW], [8, 13])

export const fathersDay: Dress = {
  prefix: 'fd',
  accent: '#3E6E9E',
  sparkle: [SKY, GOLD],
  glyph: '👔',
  ornament: ornament(['.kk.', 'kkkk', '.tt.', '.tt.', 'tttt', 'tttt', '.tt.'], { k: '#2F4B7C', t: SKY }, 'o-swing'),
  costumes: {
    // Fable: the gold medal for the best dad; it shines.
    fable: f => {
      crabBody(f)
      stamp(f, 12, 15, ['rr.rr', '.rrr.', '.yyy.', 'yykyy', 'yyyyy', '.yyy.'], { r: BRICK, y: GOLD, k: BROWN }, 'gl')
      sawdust(f)
    },
    // Heavy: the carpenter, sawing a plank.
    heavy: f => {
      crabBody(f, -4, 'it')
      f(0, 18, 12, 2, KRAFT)
      stamp(f, 21, 3, ['hh....', 'hmmmmm', '.m.m.m'], { h: BROWN, m: METAL }, 'it')
      sawdust(f)
    },
    // Careful: drives a nail home, one blow at a time.
    careful: f => {
      crabBody(f, -4, 'it')
      f(0, 19, 6, 2, KRAFT); f(2, 17, 1, 2, METAL)
      stamp(f, 23, 3, ['mmmm', 'mmmm', '.b..', '.b..', '.b..', '.b..'], { m: METAL, b: BROWN }, 'it')
      sawdust(f)
    },
    // Medium: a zeppola of St Joseph, cream and a cherry on top.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 4, ['...r..', '..yyy.', '.dyyyd', 'dddddd', '.dddd.'], { r: BRICK, y: '#F7E08A', d: '#D9A35B' }, 'it')
      sawdust(f)
    },
    // Light: runs the toolbox over.
    light: f => {
      crabBody(f)
      stamp(f, 0, 13, ['.kkk.', 'rrrrr', 'rrrrr', 'rrrrr'], { k: INK_SOFT, r: BRICK }, 'it')
      sawdust(f)
    },
    // Explore: a moustache and the morning paper.
    explore: f => {
      crabBody(f, -4, 'it')
      f(11, 16, 8, 1, INK); f(10, 15, 1, 1, INK); f(19, 15, 1, 1, INK)
      stamp(f, 21, 3, ['pppppp', 'pkkkkp', 'pppppp', 'pkkpkp', 'pkkpkp', 'pppppp'], { p: PAPER, k: '#9A9A96' }, 'it')
      sawdust(f)
    },
    // Any other agent, and the bar: a collar and a tie in the tier's color.
    other: (f, t) => {
      crabBody(f)
      f(11, 14, 8, 1, IVORY)
      stamp(f, 13, 15, ['.tt.', '.tt.', 'tttt', 'tttt', '.tt.'], { t: tint(t, SKY) }, 'tie')
      sawdust(f)
    },
  },
  css: style(`${tierMotion('fd')}
.c-fd-heavy.run .it{animation:slide .25s steps(1) infinite}.c-fd-heavy.idle .it{animation:slide 1s steps(1) infinite}
.c-fd-careful .it{transform-origin:50% 100%}.c-fd-careful.run .it{animation:twist .5s ease-in-out infinite}.c-fd-careful.idle .it{animation:twist 1s ease-in-out infinite}
.c-fd-medium.run .it{animation:hop .5s steps(1) infinite}
.c-fd-light .it{transform-origin:50% 0}.c-fd-light.run .it{animation:sway .25s ease-in-out infinite}.c-fd-light.idle .it{animation:sway 1s ease-in-out infinite}
.c-fd-explore.run .it{animation:scan 1s steps(1) infinite}
.tie{transform-origin:50% 0}.run .tie{animation:sway .5s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}

// --- Easter holidays: the trip out of town -------------------------------------

export const easterHolidays: Dress = {
  prefix: 'eh',
  accent: '#6E9B4A',
  sparkle: [PINK, GREEN],
  glyph: '🧳',
  ornament: ornament(['..kk..', '.k..k.', 'ssssss', 'sbssbs', 'ssssss', 'k....k'], { k: INK_SOFT, s: KRAFT, b: BROWN }, 'o-wobble'),
  costumes: {
    // Fable: a dove flies ahead with the olive twig.
    fable: f => {
      crabBody(f)
      stamp(f, 21, 2, ['w.....', 'ww..ww', '.wwwwy', '..ww..'], { w: IVORY, y: GOLD }, 'dv')
      f(27, 4, 1, 1, GREEN, 'dv')
      petals(f, [PINK])
    },
    // Heavy: the hiker, rucksack on the back and a stick in hand.
    heavy: f => {
      crabBody(f)
      stamp(f, 0, 9, ['.ss.', 'ssss', 'sbbs', 'ssss', 'ssss', 'ssss'], { s: OLIVE, b: BROWN }, 'it')
      f(27, 8, 1, 18, BROWN, 'stk')
      petals(f, [PINK])
    },
    // Careful: packs the suitcase, every shirt folded.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 23, 19, ['k.....k', 'kkkkkkk', 'kpptppk', 'kkkkkkk'], { k: KRAFT, p: PAPER, t: tint(t, SKY) })
      stamp(f, 23, 6, ['tttt', 'tttt'], { t: tint(t, SKY) }, 'it')
      petals(f, [PINK])
    },
    // Medium: the colomba, Easter's dove-shaped cake, sugar on top.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 4, ['..ww...', '.dddd..', 'ddddddd', '.ddddd.', 'ppppppp'], { w: IVORY, d: '#C98B3E', p: PAPER }, 'it')
      petals(f, [PINK])
    },
    // Light: off on a bike, the wheels spinning.
    light: (f, t) => {
      crabBody(f, 0, undefined, { legs: 'none' })
      f(7, 23, 16, 1, tint(t, BRICK))
      stamp(f, 3, 21, ['.kkk.', 'k...k', 'kkkkk', 'k...k', '.kkk.'], { k: INK_SOFT }, 'whl')
      stamp(f, 21, 21, ['.kkk.', 'k...k', 'kkkkk', 'k...k', '.kkk.'], { k: INK_SOFT }, 'whl')
      petals(f, [PINK])
    },
    // Explore: reads the map of the trip, the pin on the destination.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 20, 2, ['sssssss', 's.g.k.s', 'sgg.k.s', 's..rk.s', 'sssssss'], { s: STRAW, g: GREEN, k: SKY, r: BRICK }, 'it')
      petals(f, [PINK])
    },
    // Any other agent, and the bar: a straw sun hat with a flower in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 6, 5, ['......hhhhhh......', '.....hhhhhhhh.....', '....hhhhhhhhfh....', 'hhhhhhhhhhhhhhhhhh'], { h: STRAW, f: tint(t, PINK) })
      petals(f, [PINK])
    },
  },
  css: style(`${tierMotion('eh')}
.c-eh-fable .dv{animation:flap .5s steps(1) infinite}
.c-eh-heavy .it{animation:hop 1s steps(1) infinite}.c-eh-heavy .stk{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}
.c-eh-careful.run .it,.c-eh-medium.run .it{animation:hop .5s steps(1) infinite}
.whl{transform-origin:50% 50%}.run .whl{animation:spin45 .25s linear infinite}.idle .whl{animation:spin45 1s linear infinite}
.c-eh-explore.run .it{animation:scan 1s steps(1) infinite}
.o-wobble{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}`),
}

// --- Liberation Day: the tricolour and the red carnation -------------------------

const BRASS_POLE = '#C9A050'

export const liberation: Dress = {
  prefix: 'li',
  accent: FLAG_RED,
  sparkle: [FLAG_GREEN, FLAG_RED],
  glyph: '🕊️',
  ornament: ornament(['.ggg.', 'gwwwg', 'gwrwg', 'gwwwg', '.ggg.'], { g: FLAG_GREEN, w: PAPER, r: FLAG_RED }, 'o-swing'),
  costumes: {
    // Fable: floats with the flag flying.
    fable: f => {
      crabBody(f, -4, 'it')
      flag(f, 22, 0, 'it')
      petals(f, [FLAG_RED])
    },
    // Heavy: the partisan's beret, a red carnation held up.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 7, 6, ['....kkkkkkkk....', '..kkkkkkkkkkkk..', 'kkkkkkkkkkkkkkk.'], { k: NIGHT })
      stamp(f, 23, 3, ['r.r.r', 'rrrrr', '.rrr.', '..g..', '.gg..', '..g..', '..g..'], { r: FLAG_RED, g: GREEN }, 'it')
      petals(f, [FLAG_RED])
    },
    // Careful: lays the laurel wreath, the tricolour ribbon at its foot.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 2, ['..lll..', '.l...l.', 'l.....l', 'l.....l', '.l...l.', '..gwr..'], { l: GREEN, g: FLAG_GREEN, w: PAPER, r: FLAG_RED }, 'it')
      petals(f, [FLAG_RED])
    },
    // Medium: hands out red carnations from the basket.
    medium: f => {
      crabBody(f)
      stamp(f, 0, 14, ['r.r.r', 'rgrgr', 'kkkkk', 'kkkkk', '.kkk.'], { r: FLAG_RED, g: GREEN, k: KRAFT }, 'it')
      petals(f, [FLAG_RED])
    },
    // Light: runs the relay with a small flag, the cockade pinned on.
    light: f => {
      crabBody(f)
      cockade(f, 13, 16)
      stamp(f, 0, 7, ['pgkr', 'pgwr', 'pgkr', 'p...', 'p...', 'p...', 'p...'], { p: BRASS_POLE, g: FLAG_GREEN, w: PAPER, k: SHADE, r: FLAG_RED }, 'it')
      petals(f, [FLAG_RED])
    },
    // Explore: up in the mountains, the alpine hat and its feather, a walking stick.
    explore: f => {
      crabBody(f)
      stamp(f, 6, 5, ['......hhhhhh......', '.....hhhhhhhh..f..', '....hhhhhhhhhhf...', 'hhhhhhhhhhhhhhhhhh'], { h: OLIVE, f: IVORY })
      f(27, 6, 1, 20, BROWN, 'it')
      petals(f, [FLAG_RED])
    },
    // Any other agent, and the bar: the tricolour cockade on its head.
    other: f => {
      crabBody(f)
      cockade(f, 13, 5)
      petals(f, [FLAG_RED])
    },
  },
  css: style(`${tierMotion('li')}
.c-li-fable .it{transform-origin:0 0;animation:wave .5s steps(1) infinite}
.c-li-heavy .it,.c-li-careful .it{transform-origin:50% 100%}.c-li-heavy.run .it,.c-li-careful.run .it{animation:sway .5s ease-in-out infinite}.c-li-heavy.idle .it{animation:sway 1s ease-in-out infinite}
.c-li-medium .it{animation:hop 1s steps(1) infinite}
.c-li-light .it{transform-origin:0 0}.c-li-light.run .it{animation:wave .25s steps(1) infinite}
.c-li-explore .it{transform-origin:50% 100%;animation:sway 1s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}


// --- Labour Day: work, and the concert -----------------------------------------

const notes = (f: Fill): void => fall(f, ['.o', '.o', 'oo'], [FIG, SKY, GOLD])

export const labourDay: Dress = {
  prefix: 'ld',
  accent: '#C2410C',
  sparkle: [BRICK, GOLD],
  glyph: '🛠️',
  ornament: ornament(['...k...', '.kkkkk.', '.kk.kk.', 'kk...kk', '.kk.kk.', '.kkkkk.', '...k...'], { k: METAL }, 'o-spin'),
  costumes: {
    // Fable: on stage at the concert, strumming the guitar.
    fable: (f, t) => {
      crabBody(f)
      stamp(f, 9, 16, ['.rrr........', 'rrrrrnnnnnnm', 'rrkrr......m', '.rrr........'], { r: tint(t, BRICK), k: INK, n: BROWN, m: METAL }, 'gtr')
      notes(f)
    },
    // Heavy: hard hat on, swinging the pickaxe.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 6, 4, ['.....yyyyyyyy.....', '...yyyyyyyyyyyy...', '..yyyyyyyyyyyyyy..', 'dddddddddddddddddd'], { y: YOLK, d: '#C99A1E' })
      stamp(f, 22, 2, ['.mmmmm.', 'm..b..m', '...b...', '...b...', '...b...', '...b...', '...b...'], { m: METAL, b: BROWN }, 'it')
      notes(f)
    },
    // Careful: the tailor, tape round the neck, needle and thread.
    careful: f => {
      crabBody(f, -4, 'it')
      stamp(f, 7, 17, ['ykykykykykykykyk'], { y: YOLK, k: INK })
      f(25, 3, 1, 6, METAL, 'it'); f(24, 4, 1, 1, BRICK, 'it'); f(23, 5, 1, 2, BRICK, 'it')
      notes(f)
    },
    // Medium: the picnic sandwich, everything in it.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 3, ['.bbbbb.', 'bbbbbbb', 'gggggg.', 'rrrrrrr', 'yyyyyy.', 'bbbbbbb'], { b: '#D9A35B', g: GREEN, r: '#E07A7A', y: YOLK }, 'it')
      notes(f)
    },
    // Light: pushes the wheelbarrow at a run.
    light: (f, t) => {
      crabBody(f)
      f(20, 17, 3, 1, BROWN)
      stamp(f, 23, 17, ['ssssss', '.ssss.', 'k.mm..', '..mm..'], { s: tint(t, BRICK), k: BROWN, m: INK_SOFT }, 'whl')
      notes(f)
    },
    // Explore: unrolls the blueprint.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 20, 3, ['bbbbbbbb', 'bwbbwwbb', 'bwwwwbwb', 'bbbwbbwb', 'bbbbbbbb'], { b: '#2F5F9A', w: '#BFD7F0' }, 'it')
      notes(f)
    },
    // Any other agent, and the bar: a worker's cap in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 7, 6, ['...tttttttttt...', '.tttttttttttttt.', 'tttttttttttttttt', 'tttttttttttttttttttt'], { t: tint(t, BRICK) })
      notes(f)
    },
  },
  css: style(`${tierMotion('ld')}
.c-ld-fable .gtr{animation:rattle .25s steps(1) infinite}
.c-ld-heavy .it{transform-origin:50% 100%}.c-ld-heavy.run .it{animation:swing .5s ease-in-out infinite}.c-ld-heavy.idle .it{animation:swing 1s ease-in-out infinite}
.c-ld-careful.run .it{animation:click .25s steps(1) infinite}.c-ld-careful.idle .it{animation:click 1s steps(1) infinite}
.c-ld-medium.run .it{animation:hop .5s steps(1) infinite}
.c-ld-light.run .whl{animation:zoom .25s steps(1) infinite}
.c-ld-explore.run .it{animation:scan 1s steps(1) infinite}
.o-spin{transform-origin:50% 50%;animation:spin45 1s linear infinite}`),
}

// --- Mother's Day ------------------------------------------------------------

const TULIPS = ['p.r.p', 'p.r.p', '.ggg.', '..g..', '..g..', '..g..', '..g..']

export const mothersDay: Dress = {
  prefix: 'md',
  accent: '#C9607F',
  sparkle: [PINK, ROSE],
  glyph: '💐',
  ornament: ornament(['.p.p.', 'ppppp', 'ppppp', '.ppp.', '..g..', 'g.g.g', '.ggg.'], { p: PINK, g: GREEN }, 'o-swing'),
  costumes: {
    // Fable: a heart locket on a gold chain; it glows.
    fable: f => {
      crabBody(f)
      f(10, 16, 1, 1, GOLD); f(19, 16, 1, 1, GOLD); f(11, 17, 1, 1, GOLD); f(18, 17, 1, 1, GOLD)
      stamp(f, 12, 17, HEART, { o: PINK }, 'gl')
      petals(f, [PINK])
    },
    // Heavy: brings breakfast in bed, the coffee steaming.
    heavy: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 4, ['..c..b.', '.ccc.bb', '.ccc.bb', 'kkkkkkk'], { c: IVORY, b: '#D9A35B', k: KRAFT }, 'it')
      stamp(f, 22, 1, ['.s', 's.'], { s: LINE }, 'steam')
      petals(f, [PINK])
    },
    // Careful: makes the card by hand, a heart cut out on the front.
    careful: (f, t) => {
      crabBody(f, -4, 'it')
      stamp(f, 22, 3, ['pppppp', 'prprpp', 'prrrpp', 'pprppp', 'pppppp'], { p: tint(t, PAPER), r: ROSE }, 'it')
      f(21, 2, 1, 1, GOLD, 'gl'); f(28, 7, 1, 1, GOLD, 'gl')
      petals(f, [PINK])
    },
    // Medium: bakes the pink cake.
    medium: f => {
      crabBody(f, -4, 'it')
      stamp(f, 21, 4, ['..r.r..', '.ppppp.', 'ccccccc', 'ppppppp', 'ccccccc', 'kkkkkkk'], { r: BRICK, p: PINK, c: IVORY, k: METAL }, 'it')
      petals(f, [PINK])
    },
    // Light: runs home with the tulips.
    light: f => {
      crabBody(f)
      stamp(f, 0, 7, TULIPS, { p: PINK, r: ROSE, g: GREEN }, 'it')
      petals(f, [PINK])
    },
    // Explore: picks wildflowers into the basket, a daisy held up.
    explore: f => {
      crabBody(f, -4, 'it')
      stamp(f, 0, 14, ['.hhh.', 'h...h', 'ywpwy', 'kkkkk', '.kkk.'], { h: BROWN, y: MIMOSA, w: IVORY, p: PINK, k: KRAFT })
      stamp(f, 24, 4, ['.w.', 'wyw', '.w.', '.g.', '.g.', '.g.'], { w: IVORY, y: YOLK, g: GREEN }, 'it')
      petals(f, [PINK])
    },
    // Any other agent, and the bar: a bow in the tier's color.
    other: (f, t) => {
      crabBody(f)
      stamp(f, 11, 4, ['tt...tt', 'ttt.ttt', '.ttttt.', 'ttt.ttt', 'tt...tt'], { t: tint(t, PINK) })
      petals(f, [PINK])
    },
  },
  css: style(`${tierMotion('md')}
.run .steam,.idle .steam{animation:rise 1s linear infinite}
.c-md-heavy.run .it,.c-md-careful.run .it,.c-md-medium.run .it{animation:hop .5s steps(1) infinite}
.c-md-light .it,.c-md-explore .it{transform-origin:50% 100%}
.c-md-light.run .it{animation:sway .25s ease-in-out infinite}.c-md-light.idle .it,.c-md-explore.idle .it{animation:sway 1s ease-in-out infinite}
.c-md-explore.run .it{animation:sway .5s ease-in-out infinite}
.o-swing{animation:sway 1s ease-in-out infinite}`),
}
