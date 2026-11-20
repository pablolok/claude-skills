# Motion in the card material: a delayed head and wind

One case: the long cards of a short crop, rigidly bound (binding-and-export.md), made to answer the head's movement
and a wind with one small script and a vertex offset in the card shader. No bones, no simulation. Unity URP; the
design carries to any engine with a vertex stage. Check this on yours.

## Data written at export

On the long cards only (zero on the edge, fade and base cards and on the base), in two spare UV channels:

| channel | holds |
|---|---|
| motion.x | the weight: the vertex's distance from its card's root over the root's distance from the head joint (0 at the root) |
| motion.y | the vertex's distance from its card's root, in metres |
| card.x | a random value per card: its wind phase |
| card.y | a flag for the cards over the forehead (kept for a fringe rule; not used in the final build) |

Read the shader's inputs for these channels only when motion is on, so the static look compiles as before. Compare
the re-exported mesh with the old one under the new shader: in one build about 100 single edge pixels of the static
look changed, all from the re-export (the old mesh under the new shader matched within 4 px).

## The delayed head (the script)

- **A damped spring on the lag** between the head and a "delayed head" that keeps its momentum, for position and for
  rotation (axis times angle).
- **Kicked by each change of the head's velocity**, linear and angular, as an impulse at the start of the update:
  `lagVelocity -= gain * (velocity - lastVelocity)`. It swings when the head speeds up or stops and relaxes to nothing
  at any steady speed. A finite-difference acceleration held over the update smeared the kick a frame late: 30 and
  120 fps then differed by 22 % of the peak.
- **Fixed sub-steps** (1/240 s, the remainder carried to the next update), implicit Euler on
  `x'' = -k x - c x'` (stable at any step): the same motion gives the same lag at any frame rate (1.9 % apart between
  30 and 120 fps).
- **Values used:** about 5.5 Hz, half of critical damping, the lag capped at 16 degrees and 3 cm, with the velocity
  along the cap removed when it is hit.
- **Reset on a jump in pose** (a rotation over 25 degrees or a move over 0.15 m in one update: a clip change, a loop,
  a teleport): start again from rest instead of whipping. A clip change then left 0.14 mm.
- Off path: with the script off or at rest the offset is exactly zero.

## The offset (the vertex stage)

```
moved  = delta * p                              // delta: head-carried point -> delayed-head-carried point
offset = (moved - p) * motion.x
gust   = (1 - g) + g * sin(windClock * omega + card.x * 2 pi)
offset += windBend * (motion.y * gust)          // windBend: radians along the wind's direction
radial = normalize(p - headCentre)
r      = dot(offset, radial)
lift   = motion.y * liftTangent
floor  = min(0.3 * length(offset), lift)        // a move along the scalp lifts a little
offset -= radial * (r - clamp(r, floor, lift))  // never inward, at most the lift
```

- **Never into the head**: the inward part along the head's radius is removed. The radius is not the skin's normal:
  with a lift share of 0.1, about 20 vertices still crossed the skin; 0.3 left none at the worst state.
- **Every pass that draws the cards uses the same offset** (colour, shadow caster, any debug marker), under one
  keyword; without it the passes compile as before.
- **Running counts as a head wind** (the apparent wind).

## Strengths (one case: tip offsets at the strongest moment)

| preset | quick turn | nod | front wind |
|---|---|---|---|
| light | 3.7 mm | 1.9 mm | 2.2 mm |
| medium | 7.4 mm | 3.9 mm | 5.2 mm |
| strong | 11.1 mm | 5.9 mm | 8.9 mm |

Ship a scene with the presets on keys and let the art owner choose; the numbers do not choose for them.

## The side effect: what the fringe uncovers

A fringe that moves uncovers the skin under it, and whatever is painted there (a dark border, an old skin texture)
shows. In one case a front wind on the fringe darkened a marked area of the forehead; keeping the fringe out of the
wind fixed the number. Whether the fringe moves is the art owner's choice, not the check's: if it moves, repaint the
skin under it further rather than freeze the hair. The build with the fringe in the wind was not measured in that
case. Check the skin under every moving part at the largest swing and the strongest wind.

## Gates

- Motion off: the static captures reproduced (within 1 level); script on at rest equals off.
- Nothing newly inside the skin at the worst state (a quick turn plus the strongest wind); roots, edge, fade and base
  do not move.
- The ear and temple checks unchanged at the largest swing.
- No whip on a clip change; the same motion at 30 and 120 fps.
- Face shapes still animate after the re-export that added the channels.
- Not verified in that case: shimmer at card edges while moving (judged on stills only).
