# The numbers

Part of `concept-match-loop` §3. Every number is computed on the concept's crop and the model's render at the same
framing (the views spec). The numbers back up the list of visible differences; they never replace it.

## Shape

- **Silhouette IoU per view**: segment both images (the concept against its backdrop, the render by its alpha),
  intersection over union. Report it per view, never averaged: a model can match the front and fail the side.
- **Outline aspect**: width ÷ height of each silhouette's box. It catches a body too long or too squat when the IoU
  is pulled down by pose.
- **Proportions as ratios**: per segment (head : body, upper arm : forearm : hand, thigh : shin) measured on both.
  An image generator's "barrel" ribcage can come back as an egg; naming the measured ratio in the next prompt fixed
  it in one case.
- **A part's distance is no match by itself.** A surface distance (p95, Hausdorff) between a part and its reference
  says nothing about a lumpy rim, a flattened fold or a seam. Use it to find where to look.

## Colour and value

Work in CIE Lab (D65), converted from sRGB per pixel.
- **The lit half**: compare L*, chroma C* and hue h on the half of each region that faces the key light. The
  shadowed half depends on the light rig more than on the paint.
- **Per palette region**: segment the concept by its colour regions (skin, chitin, cloth, metal). Compare each
  region's mean and spread with the model's same region.
- **Value contrast, broad and fine**: the luminance spread after a blur of about 8 px at sheet size (broad: the
  painter's value design), and the spread of the residual (fine: texture). A tiled texture tinted to the concept's
  mean colour matches the mean and fails both spreads.
- **Accents inside their palette window**: an accent (a glow, a wound, a marking) is counted only where its L* and
  C* fall inside its palette region's windows, not by hue alone. By hue alone an orange-red counted as a dull maroon.

## Gloss

Gloss can't be guessed. Read it off the concept: per region, find its painted specular highlights (spots about +10
L* over their local mean and paler than it). Share × step gives a gloss estimate. Map it to roughness between two
anchors calibrated on your own renders. This stops responding at low roughness, so set very glossy materials in the
engine (`concept-match-loop` §2).

## Landmarks for a word

When a judge or a reviewer names a region ("no grin", "jaw too heavy"):
1. Pick a point both images share, near the region (the eyes, the shoulder line).
2. On same-scale crops, walk from it to the region, landmark by landmark: mouth corners, chin, jaw angle.
3. The first landmark that differs is where the fix starts. In one case "no grin" was a closed bite and a short
   lower face, not the lips.

## Defect checks

Automated checks (wrong-layer texels, holes, mesh crossings, stretched edges) are worth having. They are trusted
only once calibrated:
- Read the check at each spot where a close-up shows a known defect, and on a clean area.
- Set its limit between the two: the least that every known defect trips, and that the clean area passes.
- Prove it on an overlay: paint the flags back onto the texture or a render and check they land on the defects the
  crop shows.
- A tolerance that is absolute (a fixed 5 mm) on parts of very different sizes misses small parts' defects. Scale
  it with the part, or calibrate per part class.
