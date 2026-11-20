# Generated cards in a forward renderer

One case: generated cards (card-generator.md) in Unity URP, forward, MSAA 4x, a custom card shader, judged at three
close shots (face, over the shoulder, nape) and a third-person camera against the groom's render and against the
same groom drawn as strands in another pipeline. Every number is that case's: check this.

## Coverage: why the scalp shows, and the recipe

The first pass (coverage as alpha through alpha-to-coverage) left 33 % of the scalp in sight with the base hidden,
where the groom showed 6.5 %, although the DCC's flat render with blended alpha looked dense.

| mode, base hidden | skin in sight, face | nape |
|---|---|---|
| alpha-to-coverage, raw coverage | 33.4 % | 32.6 % |
| blended (approximate order) | 23.8 % | 17.5 % |
| alpha-to-coverage, coverage sharpened at 0.5 | 31.7 % | 29.4 % |
| alpha-to-coverage, sharpened at 0.25 | 9.4 % | 10.5 % |
| stock lit shader, alpha clip 0.5 / 0.35 | 31.5 % / 15.8 % | |

- **The recipe:** opaque, depth written, both faces drawn, alpha-to-coverage on the coverage **sharpened at a
  threshold t** by its screen-space derivative,
  `saturate((c - t) / max(fwidth(c), 1e-4) + 0.5)`, with **mips that keep coverage at the same t** (a mip chain kept
  at another reference thinned the cards: 10.5 % at t 0.25 with mips kept at 0.25, 9.4 % with mips kept at 0.5,
  so measure the pair together).
- **Sweep t on the coverage gate, then look:** 0.25 / 0.20 / 0.15 gave 10.5 / 8.1 / 6.2 % at the face. 0.20 was
  picked (the gate was the groom plus 2 points); the fine detail fell only slowly with t, with no sign of the strands
  thickening into plates.
- **MSAA on the whole pipeline.** Alpha-to-coverage without MSAA is a hard clip. The game project needs the same
  setting, so write it into the delivery notes.
- Import the coverage map as linear data, uncompressed, alpha from the grey, trilinear.
- Even blended, the cards left a quarter of the scalp in sight: the maps are thin, and thickening them (a low
  threshold) is what helps. Why raw coverage covers so little is a hypothesis: layers with the same partial alpha
  cover the same MSAA samples and do not add up the way blending does. Untested.
- At the third-person camera the scalp in sight with the base hidden was 10.2 % against 9.9 % at the close nape:
  coverage-keeping mips do not thin the cards at distance.

## The grey veil

The hair looked washed grey, palest at card edges and spikes. One change at a time on the same shot found it:

| change | hair value | saturation |
|---|---|---|
| as built | 0.041 | 0.45 |
| flat albedo | 0.040 | 0.46 |
| direct specular and smoothness 0 | 0.025 | 0.61 |
| **environment reflection off** | **0.027** | **0.61** |
| normals from a smooth hull (less grazing) | 0.033 | 0.52 |
| alpha clip instead of alpha-to-coverage | 0.041 | 0.45 |

- **Cause: the environment reflection at grazing angles.** The cards carry the skin's normals, which lean up, so
  the camera sees them nearly edge-on, where the renderer's grazing reflectance is near its peak; that reflectance
  came from smoothness plus reflectivity (0.2), not from the DCC's low specular level. Direct specular and ambient
  added almost nothing. The tips were not brighter relative to the body than in the DCC, and the texture was not the
  cause.
- **Fix in the shader:** keep the renderer's own lighting and pull the grazing term back toward F0,
  `grazing = lerp(f0, grazing, k)`, k from the specular level; k 0 was kept. At k 1 the output is the stock one
  (keep that as a regression).
- "Tips never lighter than the body" is not a usable target: the groom's own tips were 3x its body in the DCC (lit
  tips, shadowed roots). Greyness is the target: read saturation and value on the same pixels as the groom's render.

## Colour

The generator gives no colour. Make it in the shader from the attributes atlas:
- a **ramp along the root-to-tip coordinate**: the groom's own colour by position along the strand (one case: a
  64-step ramp taken from the coverage-weighted colour of an earlier card atlas, dark brown at the root to a lighter
  brown at the tip);
- times `1 +- 0.15` from the per-strand seed;
- a **root darkening** over the whole length (0.65 at the root, fading to none at the tip, one case);
- a gain and a saturation scale fitted so the hair's mean value and saturation on the close shots meet the strands'
  (gain 1.58, saturation x 0.73, one case). Set them once, from numbers, and look.

## What did not help, or cost more than it gave

- **An anisotropic highlight from the tangent atlas** (Kajiya-Kay): one strength brought one shot's value and every
  shot's saturation to the strands but overshot two shots by 1.6-1.9x, and the lobe read as a **grey sheen** (the
  reflection probe's colour, not tinted by the hair). Dropped. Bending the lighting normal toward the head's centre
  did not rescue it.
- **Root darkening alone** fixed the back's tip-to-body ratio but darkened the top further.
- **Cards casting shadows** (key light only): the shadowed scalp stopped reading as skin (skin-toned pixels 5.7 to
  3.6 %), but the hard, pixel-stepped strand shadows under the fringe tripled the fine-detail energy of the forehead
  band. No card shadows was kept.
- The depth atlas as occlusion and the root darkening together brought the body's value down near the strands' range
  in one test; the generator bakes no occlusion of its own.

## Judge it

- **Coverage with any base hidden**, on the region the groom's hair covers in that shot, against the groom's own
  number there. With the base shown, a dark base can pass a gate the cards fail.
- **Where the base shows through on the long zones** (card coverage under 0.5 where the base's alpha is 0.5 or
  more): it should be near zero, or the base draws the head's dome.
- **The hairline** on a crop of the groom, the cards, and the cards with the base hidden.
- Make a marker pass (the root-to-tip coordinate or a zone colour drawn unlit) to know which card a pixel belongs
  to; it draws raw coverage, not the sharpened one, so it overstates what shows.

## Engine notes

- **Unity URP:** the stock Lit shader with alpha clipping turns on alpha-to-coverage and sharpens at the cutoff by
  itself, but multiplies a flat colour by the grey coverage (the tiles read grey) and keeps the grazing reflection:
  write a card shader on URP's own lighting with the two changes above. MSAA is set on the pipeline asset for every
  camera; a viewer can swap in a copy of the asset at run time and restore it on exit. The texture importer can
  build mips that preserve coverage against a given alpha reference: set that reference to t.
- **Unreal:** the generator's cards are drawn by the engine's hair card material, which reads the four atlases in
  their layout; this file's problems are the other renderer's.
