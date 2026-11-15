---
name: hair-reference-review
description: Use when judging a hair or beard groom, or its engine render, against a reference image set - calibrated views and masks, one gauge at one pixel density for reference, DCC render and engine, mattes and overlays, the look rows (strand vs clump contrast, value, hue, halo, followed strand, wave, flow with a noise floor read from the reference against itself), a numbered defects list, the judge by eye, and the stop rule. Building is strand-groom; drawing is strand-rendering.
---

# Hair reference review

Part of the `gamedev-hair` bundle. It judges the work of `strand-groom` (in the DCC) and
`strand-rendering` (in the engine). If the `gamedev-assets` bundle is installed, its `concept-match-loop` holds the
general loop (views spec, sheets, judge); this skill adds what hair needs.

Hair fools both the eye and the numbers: the eye forgives a soft offline render, the numbers pass on pixel grain.
The review uses both, and the eye decides.

## When

- Before a groom or a hair look is shown to the art owner, and after every piece of work on it.
- When a groom "passes every number and still does not read" as the reference.

## 1. Set up once

1. **The reference in force:** the exact image files, one per view; name them in every sheet and report.
2. **A calibrated camera per view** that sees the model as the image does (tune once on the silhouettes).
3. **A hair mask per view** drawn on the reference; for the engine region, the mask eroded a few px (6 at about
   1 px/mm) so edges do not leak background into the rows.
4. **Register the reference through the model's landmarks** (mouth, nose, eyes, ears, jaw) and check the overlay
   before reading anything around them. Measure what a feature is (a lip line, a moustache's edge) before calling
   the reference and the model in conflict.
5. **One pixel density.** Bring every picture (reference, DCC render, engine) to the same px/mm, the one a shipped
   shot uses. Judge only at a size that ships: at twice the density everything looks different, and a feature the
   shipped shot cannot resolve is not a defect.
6. **One gauge.** The same code reads the reference, the DCC render and the engine in the same run.
7. **Which defects each camera can show.** At the gameplay distance only value, outline and gross shape show; list
   which defects live only in close shots, so the work goes where it is seen.

## 2. Read the rows

[references/measures.md](references/measures.md) defines each row. The groups:

- **Mass:** mask fill and hair outside (mask grown 3 px), profile edge by bands, zone fills, skin seen where the
  reference shows none.
- **Feature fit:** coverage of named features (upper lip, lower lip, under the nose), edge heights and slopes.
- **Value and colour:** L* percentiles (p10, p50, p90, p99), dark share, share of very light pixels, a* b* or
  C* h.
- **Hair look:** strand contrast (fine detail) against clump contrast (coarse), and their ratio; the halo's width and
  coverage outside the outline; the length of a strand the eye can follow; the wave's wavelength and amplitude as
  rendered; lock width.
- **Flow:** dominant direction, coherence and spread per zone and view, gated by a noise floor read from the
  reference against itself.

Rules for the rows:

- **Read the reference against itself first** (left vs mirrored right, boxes moved a few px, the orientation scale
  halved and doubled). Its worst case is the noise floor; a gate tighter than about twice the floor judges noise.
- **Validate a new measure on the reference before it gates anything.** A row that reads the reference poorly
  (one "cover by depth" row read 0.5-0.6 deep inside the reference's own beard) will also pass a visible wall.
- **Know what each row is blind to.** Aliasing reads as strand contrast; a median over the mask reads the backdrop
  where hair is missing (read value only on pixels with hair in both); the wave tracer has a floor of about a pixel
  of amplitude; the followed-strand length moves with the matte it is read through (use the fixed reference
  numbers).
- **Report every miss** with its number and limit; never loosen a limit after seeing the result.

## 3. Look, do not trust the number

Before quoting a row, write the list of what differs in the pictures, worst first, then use numbers as support.

- A wave row passed (wavelength and amplitude inside the reference's band) on a groom that plainly read as a tight
  curly perm beside the reference's long loose arcs.
- A card beard passed every numeric target (coverage, lip, colour mean, budget) and read as straw.
- Strand contrast once rose into the reference's band only because the strands sparkled.

**The sheets:** reference | before | after, one row per view, at the shared density; the same crops enlarged 2-4x
for the places defects live (a cheek, the mouth, the chin, the border, the point); the mattes over the reference's
masks as an overlay (ours only, the reference's only, both); films for anything that moves.

**The judge:** by eye at 1:1 first, then enlarged. Where possible an independent judge who sees the sheet and the
reference, not the numbers or the author's notes.

## 4. The defects list

After a round, write every defect seen against the reference, numbered, grouped by area, each as "the reference
shows X; ours shows Y", plus a short list of what has been tried so it is not repeated. Diagnose per group with one
change at a time before fixing anything.
[references/defects-list.md](references/defects-list.md)

## 5. The loop

1. Fix the checks of the next piece before building it: the rows, their limits, the views, and the by-eye question.
2. Build one piece; read the gauge; make the sheets; write the differences seen.
3. Met: the piece is done; state what it cost elsewhere (a row that got worse).
4. Missed: diagnose from evidence (the defects list, a probe without a build). **Two failed attempts on the same
   piece stop it**: back to evidence, a new brief, or a question to the art owner.
5. Conflicts inside the reference (two views that disagree in 3D, a painted feature off the model) are decided
   once, by the art owner or a declared rule, and both numbers are reported from then on.
6. Before calling it done: the art owner's eye on stills and films at the shipped cameras.

## 6. Traps

- **The offline render is kinder than the engine.** It integrates sub-pixel coverage, shows wisps a clipped pass
  removes, and casts card-to-card shadows a few mm wide that the engine does not. Judge the look in the engine.
- **Dark jagged shards in an offline close-up are first the key light's cast shadows**: render with casting off
  before blaming the geometry.
- **A sheet at a density that never ships** hides or invents defects.
- **A number printed on every sheet that gates nothing** ("hair outside the mask 20 %") is a defect nobody owns:
  gate it or drop it.
- **A changed baseline:** if this session's baseline stills differ from the saved ones, compare only within the
  session and say so.

## Open

- The look rows' limits come from one reference set (three painted views of one beard); bands for other hair types
  (straight, coily, short) are unknown.
- A validated measure for a soft border (cover gradient inside the border line) does not exist yet.
- The followed-strand row depends on the matte; a matte-independent version is wanted.
- An independent judge's rubric for hair (filaments, crossing, halo, light over dark) is not written.
- How to read references that are photographs rather than paintings (real strands correspond between views; the
  multi-view capture literature then applies).
