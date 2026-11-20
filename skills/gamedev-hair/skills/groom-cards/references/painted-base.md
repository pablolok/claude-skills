# The painted base under the cards

One case: a short crop over a skin fade, generated cards over a base mesh lifted about 1 mm off the skin (5,200
triangles, a 4096 x 2048 texture, a texel of about 0.13 mm on the fade). The rules below held in that case: confirm
them with the art owner before painting. Every number: check this.

## Why a base, and how it goes wrong

- Cards leave partings and thin ends open; the base hides them. With it hidden, earlier hand-built cards showed
  39-43 % skin and the generated ones 8 %.
- **An opaque, smooth base draws the head's shape**: in one round it was the visible surface over 42 % of the hair
  area, one dark untextured dome with a clean arc at the hairline. No change of lighting, normals or alpha removed the
  shape; only hiding the base did. So the base must never read as a surface: one dark colour where the long hair
  is, strand-scale strokes where it is short, a broken edge.

## One root colour under all long hair

- **Colour:** the cards' root colour in shadow: the ramp's root step times the root darkening, with the same gain and
  saturation as the cards (a very dark brown in one case), no seed variation and no depth cue.
- **Where:** where the nearest groom root is a long-zone root (not a fade root), blended over 2.5 mm.
- **Forehead and temples:** the edge follows the fringe roots' density (ramped between 0.6 and 0.9 of its median
  within 5 mm); alpha 0.5 at the fringe roots' lowest few percent and 1 about 3 mm behind, so the front edge stays
  soft.
- Measured: base seen on the long zones 0.5-1.6 % per shot, in the forehead band 2.3 %.

## The short fade drawn as strokes

- **Strokes, not a tint:** many short marks along the groom's fade directions (in one case about 12,000 strokes
  0.27 mm wide and up to 3.5 mm long), dense right under the lowest cards and thinning to nothing at the end line:
  with `t` from 0 at the line to 1 at the cards' lower edge, density `0.45 * t^0.7` per mm2 and tint `0.5 * t^0.9`.
  A first law (`t^1.2` and a smoothstep) stopped 6-17 mm short of the line.
- **Continuous functions of the angle around the head**, never a value per bin: per-5-degree bins made visible steps
  at the temple.
- **More strokes where the art owner wants a stronger fade** (twice the density at the back, from ear to ear, in one
  case), with less tint low down.
- **Wrap the rasteriser across the texture's seam**: triangles whose U runs past 1 left an unpainted column, a light
  stripe at the nape.
- A "stronger fade" that may not touch the fade's lowest third changes nothing below the cards where that third
  begins at their edge; it only darkened the paint under them and the step grew.

## The end line

- **The art owner draws it** on a screenshot (side, back, temple). Fit that screenshot's camera by silhouette against
  the head, cast the drawn pixels onto the skin, turn them into a height per degree around the head, and read the
  right side at the mirrored angle (binning mirrored points shifted them by up to 3 mm on steep parts).
- Where a drawn stroke splits into two loops (a sideburn), ask which one holds; one case took the lower.
- Check the paint's end against the line at several points per side: within about +-1.3 mm in one case.
- The line's height is a design choice per character, not a rule of fades.

## Rules (defaults; confirm them with the art owner)

1. **Never painted in front of the cards at the temples.** Above the line's top end, nothing visible in front of
   that end's angle around the head (softened over 1.5 degrees). Offsets from the nearest card point (1-2.5 mm,
   opaque points only, a notch cut) all left paint showing; only the angle rule reached zero on both sides.
2. **Both sides identical, always.** Paint the left, mirror it texel by texel to the right, and where a trim applies
   take the smaller of a texel's own value and its mirror partner's, so the more restrictive side wins; then apply each
   side's own trim once more after the mirror. Check left against the mirrored right on the side views.
3. **A visible gap of skin around the ears** (a few mm to a centimetre), and never inside the ear's outline:
   - Build the ear's **silhouette** from the mesh: the part standing more than about 1 mm out of the skull, closed over
     a few mm and hole-filled. An "ears" vertex group can hold 5-9 mm of skin in front of the helix's root; using it
     whole put the keep-out on the wrong line.
   - **Measure the gap in the side view, against the silhouette**, with the views registered to the screenshot (best
     of a few turns and elevations, outline residual under 1 mm median). A 3D distance alone passed while hairs still
     sat on the ear: a fade-out 1.5-3 mm from the ear's vertices took the painted texels near the ear to zero, and the
     side views still showed paint touching the outline above both ears (504 and 1,207 px on or inside it).
   - In one case: a keep-out 5 mm from the outline in the side view and 6 mm from the ear's surface, both ears built
     on one side and mirrored, a soft band of 2 mm, strokes reaching into it dropped whole (not cut).
   - When the art owner's own line around the ear is tighter than the gap, and the gap would take most of a painted
     sideburn, stop and ask before painting.
4. **Nothing dark on skin outside the hair at the hairline**, whether it comes from the base or from the skin's own
   colour map: an old paint pass carried into the skin texture showed as a dark patch under the fringe. Hide the base
   first to learn which one it is (or take the art owner's word for it), then repaint only the texels that show from
   the front and never lie under the rendered hair, filled from the skin beside them. A thin dark rim right under the
   fringe's tips can stay: it makes the tips read as hair.

## The join between the long cards and the fade

- **Measure the step**: the largest value change over 4 mm windows across the cards' lower edge, at the centre of
  the nape, the back 3/4 and over the ear, against the groom's own step there (the groom: -5 to -13 levels; cards on a
  thin cut base: up to -79; with the upper fade carded and the strokes, about -20).
- A base cut thin under the lowest cards shows the skin as a light band: un-cut it there.
- The step left after that is the art owner's call; paint only softens it.

## Checks

- Paint inside the ear's outline in the side views, the distance to it above, in front of and behind the ear, and
  texels within the 3D keep-out: 0, at the rest pose and at several poses (turns, a nod).
- Paint outside the art owner's line, and in front of the cards at the temples, on the views they drew on: 0 on
  both sides.
- Left against mirrored right: the paint masks equal; the remaining differences only where the cards themselves
  differ between sides.
- The base hidden against as built, for coverage; base in sight on the long zones.
