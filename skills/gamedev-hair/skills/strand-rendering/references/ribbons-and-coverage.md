# Camera-facing ribbons, their width on screen, and the shimmer measure

## The mesh

Per strand point, two vertices (side u = 0 and u = 1). Per vertex:

| channel | holds |
|---|---|
| position | the ribbon's edge as stored (flat, any orientation) |
| tangent | the direction across the ribbon |
| normal | perpendicular to the strand (a volume normal made perpendicular to the line works); with the tangent it gives the strand's line |
| uv0 | u = side (0 / 1), v = root 0 .. tip 1 |
| uv1 | the strand's rank in the draw order (deepest first), root-to-tip |
| uv2 | a random per strand, the ribbon's half-width in mesh units |
| uv3 | tone and silver per strand |
| colour | occlusion (depth in the mass) |

Store it flat with a real width so normals and tangents import sound (MikkTSpace and friends need a non-degenerate
quad). Use 32-bit indices: a beard is hundreds of thousands of vertices.

## The vertex stage

```
side    = u * 2 - 1
across  = normalize(tangent)
centre  = position - across * side * halfWidth
along   = cross(normal, across)                 // its sign does not matter
view    = object-space view direction at centre // the camera's forward for an orthographic camera
facing  = normalize(cross(along, view))         // fall back to `across` when the strand is seen end-on
```

With width handling on:

```
pixel     = 2 * clipW(centre) / (|P[1][1]| * screenHeightPx)   // size of a pixel at that depth, mesh units
trueHalf  = halfWidth * |M * facing| / pixel                  // px
drawnHalf = max(trueHalf, 0.5 * minPixels)
reach     = drawnHalf + 0.5 * filterPx
fade      = trueHalf / drawnHalf
out.position     = centre + facing * side * halfWidth * reach / trueHalf
out.coverageData = (side * reach, drawnHalf, fade)          // interpolated to the fragment
```

Fragment coverage, with a box of width `filterPx`:

```
r        = 0.5 * filterPx
inside   = saturate((min(x + r, drawnHalf) - max(x - r, -drawnHalf)) / filterPx)   // x = coverageData.x
coverage = fade * inside
```

Both settings at 0 must draw exactly as before; keep that as a regression.

## Resolving the coverage

| resolve | depth | needs | notes |
|---|---|---|---|
| opaque | written | nothing | ignores coverage; ribbons about a pixel wide sparkle as they slide |
| blended | not written | a draw order: triangles sorted by the baked rank, deepest first | the chosen resolver in one case; flyaways over the background read as background to a depth-based blur |
| alpha to coverage | written | MSAA on the camera | four coverage levels at 4x; grainier |

- Put blended strands in the transparent queue with the material's "fringe" state (blend, no depth write, back
  faces kept).
- An importer can reorder polygons: sort the triangles by rank after import or keep the order on import.
- **Check the draw order where the skin's outline ends.** A straight tone step across a blended groom that follows a
  skin outline or a fixed height, or a dark streak in profile, had one cause in one case: 662 strands rooted on a
  chin's underside, 40-60 mm behind the front strands, drew after them (rank 0.28 against 0.36) and blended over them
  wherever the skin's lower edge stopped hiding them. Probe the order first (draw nothing, draw one part at a time,
  emulate a re-rank) before touching the groom or the shading; re-ranking those strands before the first front strand
  they overlap (export only) cut the step from 15.8 to 6.8 and the streak from 16-18 to 10, where occlusion floors,
  slope caps and shadow bias had moved nothing. A rank fix is per export: rerun it on every new groom and read every
  other strand's rank shift.
  After a re-route, keep the accepted groom's rank (`strand-groom` references/rerouting.md).
- Cast no shadow from the strands to start; a shadow map cannot draw millimetre wedges. Casting is one variant to
  test, receiving another.

## What does the work (one case: re-test on yours)

- Blending in rank order alone changes nothing; the clamp alone, even blended, still crawls.
- The box prefilter alone gets most of the way.
- Clamp and box together bring the crawl to the cards' level. A wider box (2 px) over-resolves: it blurs and pushes
  strand contrast under the reference's.

## The shimmer measure

- Film: a slow crawl (the head or camera moving a fraction of a degree a frame) and a turn of about 30 degrees, at
  the shipped frame size, with each AA mode you ship; also a held pose (any non-zero flicker there is temporal jitter).
- Region: the same pixels for every arm (the strands' footprint intersected with the baseline's, eroded).
- **Tile flicker:** per frame, the mean luma of each 8 x 8 tile; per tile the second difference over time; report its
  RMS in 8-bit steps and the share of tiles over 3 steps. A strand sliding across a tile's edge changes the tile
  smoothly; a strand that blinks out or doubles jumps it.
- **Motion-only control:** one crawl frame slid rigidly by the crawl's measured speed (cubic resampling), read on the
  same tiles. What the real crawl adds over this is aliasing. In one case the strands' slid frame read like the
  cards' while their real crawl read 4-5 times higher.
- **Ghosting** under temporal AA: luma blurred by 2 px against the same look without AA at the same frame, moving
  minus held, in the region and at the edge band. The measure has no positive control unless you build an arm known
  to ghost; say so when you report it.
- The turn is mostly motion, not shimmer: report it, do not rank by it.
- Look at the crawl's frames enlarged 3x: sparkle re-deals bright pixels every frame; sliding strands keep them.

## Sources

- E. Persson, "Phone-wire AA" (humus.name): clamp the width to a pixel and fade by the radius reduction ratio.
- E. Chan, F. Durand, "Fast Prefiltered Lines", GPU Gems 2, ch. 22: lines convolved with a filter, the polygon
  widened by its reach, intensity from the distance to the line.
- TressFX ("Hair in Tomb Raider" talks): strands expanded by a pixel, edge distance as alpha, order-independent
  blending.
- S. Tafuri, "Strand-based Hair Rendering in Frostbite", SIGGRAPH 2019: why widening a real 0.08 mm hair to a pixel
  looks like straw, and the visibility-buffer route with MSAA. A ribbon standing for a filament of a few hairs at
  about a pixel avoids the straw look.
- T. Scheuermann, "Hair Rendering and Shading", GDC 2004: the strand lighting model (Kajiya-Kay with shifted
  lobes), softened N.L, per-vertex occlusion, opaque-then-blended passes in a fixed order.
