---
name: strand-rendering
description: Use when drawing a hair or beard groom in a game engine as strands, or deciding strands against cards - camera-facing ribbons with a width clamp and a prefiltered edge blended deepest first, the shimmer measure, per-strand tone and silver, occlusion and the under-layer between strands, scripted value sweeps with byte-identical regressions, cost, and Unity (custom URP shader) or Unreal (Groom asset) notes. The groom itself is strand-groom; the review is hair-reference-review.
---

# Strand rendering

Part of the `gamedev-hair` bundle. Building the groom is `strand-groom`; judging the result against
the reference is `hair-reference-review`.

Most of what follows was measured on one long grey beard in one engine (a forward renderer, gamma space, SMAA, no
MSAA, no TAA on its stacked camera). The structure carries over; re-measure the numbers on yours.

## When

- A close shot must show realistic hair and the cards read as plates, feathers or straw.
- Strands are on screen and they sparkle, crawl, read black, gritty, grey or flat.
- Choosing what draws at each distance (strands, cards, meshes) and what it costs.

## 1. Strands or cards: decide by pixels

- Compute pixels per mm at the head for every shot (see `strand-groom` step 0).
- **A primitive wider than the feature cannot draw the feature.** A card is a plate whenever it is wider on screen
  than the widest thing the reference shows (a lock, about 6-7 mm on a beard), whatever its texture. In one case
  cards of 18-28 mm, three to four locks wide, read as plates at the close shot through many rounds of atlas,
  shader and placement work; one patch of the groom drawn as strands read as hair on the first try.
- **Strands for the close shots, where a ribbon is about a pixel wide** (a 0.6-0.75 mm ribbon standing for a
  filament of a few hairs). Not much closer: at twice that density a ribbon is over two pixels wide and is
  expected to read as wire (an estimate, not shot).
- **Cards or meshes for distance and LODs.** At the gameplay camera the strands did not vanish, they speckled.
  There only value, outline and the point's shape show; a card LOD of a few thousand triangles is enough.
- Switch on a shot cut, never during a held shot, and check both LODs side by side at the cut's camera so the cut
  does not pop (proposed limits, not yet run: value within a few L*, outline IoU >= 0.9).
- Cards that must hold a close shot: lock-width cards (6-7 mm), thousands of them, three cards a clump with the
  clump's own strands projected (Epic's Hair Card Generator scheme). Untested here.

## 2. Camera-facing ribbons

Store each strand as a flat ribbon: a vertex pair per point, side u = 0 / 1, the half-width per vertex, the tangent
across the ribbon, the strand's line recoverable from normal x tangent. The vertex shader takes the pair back to
the centreline and lays it across the view, so the ribbon faces the camera at any angle; every pass (colour, depth,
depth-normals, shadow) uses the same layout so the depth matches the colour.
[references/ribbons-and-coverage.md](references/ribbons-and-coverage.md)

- **Width clamp:** draw the ribbon at least N px wide and fade its coverage by true width / drawn width (Persson,
  "Phone-wire AA").
- **Prefiltered edge:** widen by half a box filter each side; each pixel's coverage is the box's share inside the
  drawn strand (Chan and Durand, "Fast Prefiltered Lines"). Across a row, coverage then sums to the true width.
- **Blend deepest first:** alpha-blend in a baked rank (sort the mesh's triangles by it; an importer may reorder
  polygons), no depth write.
- **Measured (one case):** opaque ribbons about a pixel wide crawled about 4.6 times as much as the cards, and SMAA
  changed nothing (it finds no edge on a one-pixel line). A 1 px clamp plus a 1 px box, blended, brought the crawl
  to the cards' level, cost about 0.2 ms of GPU, and needed no engine change. A 2 px box blurred. The clamp alone
  still crawled; the box is what resolves it.
- **The price:** the box softens strand contrast and the wave's crests. Every value sweep after it starts there.
- **TAA** resolves it too, softer and slightly darker; check your camera setup allows it during held shots.
  **MSAA with alpha to coverage** works with MSAA on the whole pipeline, grainier, with four coverage levels.

## 3. Measure the shimmer, not the still

Shimmer is invisible in a still. Film a slow crawl (a fraction of a degree a frame) and a turn of the head, with the
AA modes you ship, and read the **tile flicker**: the second difference over time of each 8 x 8 tile's mean luma,
RMS in 8-bit steps, and the share of tiles over 3 steps. Per-pixel flips count a sliding one-pixel strand as
blinking; tiles do not. Add a **motion-only control**: one frame of the crawl slid rigidly by the crawl's own speed
and read on the same tiles. What exceeds the control is aliasing. Also read ghosting under any temporal AA
(moving minus held, blurred, at the edge band). Details in ribbons-and-coverage.md.

## 4. Value and colour per strand

- Carry **tone** and **silver** per strand from the groom (one UV channel). Albedo x tone (convert the tone if the
  groom's tone is linear light and the project renders in gamma), then mix toward a silver colour by silver.
- **Value spread for salt-and-pepper:** spread the tone about the groom's measured median,
  `tone * (tone / median)^(k - 1)`, and cap it at the groom's original maximum so regular strands gain no bright
  tips; let the light strands be the silver ones, with a silver gain. This raised strand contrast into the
  reference's band where every lighting knob had failed (one case).
- Measure the median from the imported mesh, one sample per strand id, not from the DCC.
- **Near-white tips over a dark mass: narrow the groom's per-strand tone law, keep the spread.** The cap is only as
  tight as the groom's own maximum; lowering the spread's contrast instead flattened the strands (one case).
- When the engine's light is not the reference's, set value targets relative to the skin beside the hair, in views
  lit alike (`hair-reference-review` §2).
  [references/strand-value.md](references/strand-value.md)

## 5. Occlusion, and what shows between strands

- **Depth occlusion on a whole groom turns the deepest strands black.** A deep mass (a neck and throat volume)
  puts strands 20-30 mm under the surface; a term like `(1 - depth / D)^p` drew them near black as a band under the
  jaw. Lower the power (around 0.15-0.2 in one case), or bound it, and check the band's dark share against the
  reference. Card occlusion values reused on strands darkened them by ~20 L*: sweep the strand material on its own.
- **The under-layer between strands decides the grit.** Between one-pixel strands 30-40 % of pixels show what lies
  under them: the skin, or a shell (a base mesh under the hair that gives it coverage). A shell shaded as skin, lit from behind the cheek, read near black there: salt-and-pepper grit that
  is not the strands' fault. Give the shell under the strands its own close-shot material (lighter, a scatter term,
  neutral colour) that never outshines the strands, and check it through the head's turn.
- **Drop the cards the strands replace**, coverage cards included: dark cards left under the strands became black
  blotches.

## 6. The sweep method

Tune values with scripted sweeps, not by hand. Write the arms, the gauge, the hard limits and the ranking before
rendering; render every arm in one scripted run; keep every reading in one JSON; pick by the predeclared ranking,
then look at the nearest two by eye; prove the chosen constants reproduce the swept arm and that everything else is
byte-identical. [references/sweep-method.md](references/sweep-method.md)

## 7. Cost

Triangles = strands x segments x 2; vertices = strands x (segments + 1) x 2. Orders of magnitude, one beard on a
high-end desktop GPU at 1080p: about 19k strands at 3 mm segments was 0.84 M triangles and 0.87 M vertices, ~3.6 ms
for the blended strands' pass, plus ~4 ms of CPU skinning that a rigid attach removes.
[references/cost.md](references/cost.md)

## 8. Engines

[references/engine-notes.md](references/engine-notes.md)
- **Unity (URP):** a custom shader with a strand variant (the ribbon layout in the vertex stage, the coverage as
  alpha, a tone-and-silver keyword), the mesh imported with 32-bit indices, a renderer parented to the bone for
  rigid parts. The heavy FBX usually belongs outside git.
- **Unreal:** a Groom asset from Alembic curves (one group per part), a Groom Binding to the skeletal mesh, the
  engine's own strand renderer; cards and meshes as the groom's LODs. Sections 2-3 are the engine's job there;
  sections 4-6 still apply through the groom's attributes and material.

## Open

- The resolver trade: the box keeps the crawl at card level but holds strand contrast under the reference's band
  and blurs the wave; the clamp alone keeps contrast and crawls. No arm met both in the one case measured.
- Prefiltered strands under spatial and temporal upscalers, and with depth of field (blended strands write no depth,
  so a depth-based blur reads them as background).
- A bounded occlusion that keeps depth cues without the black band, measured on more than one groom.
- Strand motion vectors: they changed nothing measurable at slow camera speeds; fast moves are untested.
- Unreal: whether per-strand tone and silver are best carried as `groom_color` per vertex or as custom attributes
  through the hair material; the strands' look against the same gauge.
- Cost on a mid-range or console-class GPU, and with GPU skinning on.
