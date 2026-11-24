---
name: strand-groom
description: Use when building or fixing a realistic hair or beard groom as strands (Blender hair curves or any DCC) from a reference image set - zones as parts with a design table, roots by blue noise, parents grown with skin-SDF collision, locks, waves and children inside sub-locks, direction read from the reference, beard parts (moustache, under-lip, point, cheek fade), the audit gates, and the stop rule. Drawing it in an engine is strand-rendering; the review loop is hair-reference-review.
---

# Strand groom

Part of the `gamedev-hair` bundle. Drawing the groom in an engine is `strand-rendering`; judging it
against the reference is `hair-reference-review`.

The groom is the single source of the hair. Close shots draw it as strands, distant shots and LODs draw cards or
meshes made from it. So it is built for the closest shot it must hold, and judged there.

## When

- A character needs realistic head hair, a beard, a moustache or other facial hair, and a close shot will see it.
- An existing groom "reads wrong" against its reference: wool, ringlets, a wall at the border, a stencil edge, a
  flat cut at the tips, shelves, bare bands.

## 0. Before the first strand

1. **The scale of every shot.** For each camera that must show the hair, compute pixels per millimetre at the head
   (field of view, distance, resolution). Write a table: one pixel in mm, a strand's width in px, a lock's width
   in px. Reason: a feature under a pixel is not a target, and a shot the game never uses is not a judge.
2. **The reference in force.** The image set the groom is measured against now, one calibrated camera per view
   that sees the model as the image does, a hair mask per view. Below the reference's own pixel the target is
   realistic hair made by professional technique, not a stroke-for-stroke copy of the painting.
3. **Register the reference through the model's landmarks** (mouth corners, lip lines, nostrils, ear, jaw angle)
   in every region the groom will be fitted to, under the hair included, before calling anything a conflict
   (`hair-reference-review` §1.4). Reason: a moustache's edge misread as the mouth line once made a false 20 mm
   "conflict" that drove a design decision.
4. **Measure the mass before the texture.** Carve the reference's hull from its masks, carve the groom's own
   projections the same way (like with like), and read the volume per zone (cm3) and each zone's shortfall and
   excess in mm (p50 / p90) with its extents (reach, width, lowest tip). A groom far under the reference's volume is
   a smaller beard: no reshaping, texture or shading recovers it. Grow it into the reference's hull first (one groom
   at about half the volume covered under 0.6 of the masks; grown into the hull, about 0.9). Direction can pass
   every flow row while the mass is lost: gate direction, shape and length together from the first regrow.
5. **The order of work, for every zone** (a moustache, a cheek, a crown). Each step before the next:
   1. **Map the zones over every reference view**: for a moustache the root line, centre, lobes, corners, legs and
      edge; the equivalents for any groom. Two maps with the same named areas, each area's owner part and root
      polygon. [references/area-map-and-traces.md](references/area-map-and-traces.md)
   2. **Choose the leading view per zone for each quantity separately**: outline and position, direction, standoff
      and depth. The front alone is not enough: the side or three-quarter view usually defines direction and depth
      better. First check that the reference agrees with itself (`hair-reference-review` §1.5): views painted one at
      a time need not agree in 3D, and when they contradict, make the set again as one multi-view image. Where views
      still disagree, measure it and show the views side by side with both numbers; the art owner picks
      (`hair-reference-review` §5), never you. Record the pick per zone and quantity.
   3. **Outline the zone where hair must be.** The outline is a guide, not a mould (§2).
   4. **The hair map.** In each view that shows the zone, trace real strokes lock by lock: root, course, tip, width,
      layer, what each crosses. Then write the logic in a few plain sentences a non-technical person can check. A
      structure tensor per zone and view, drawn as segments over the picture, checks the trace and never replaces it.
      Reason: a brief said "down and forward" for a cheek whose hair runs down and back in every view; the groom
      built to the brief was 50-60 degrees off.
   5. **The value levels.** Before choosing tones, split the reference into its levels (often two or three: a darker
      under-layer, a lighter main layer, a few whitish single hairs on top). For each: its area, patch size, width,
      where along the hair it shows, how it is spread, and its direction (which level carries the locks' direction,
      which crosses it). Divide out the lighting first: lighter because lit is not lighter hair. Then check that a
      lighter level exists in the groom's data as well as in the renderer's shading, at the reference's area and size.
   6. **The same maps on your own groom**, same cells, side by side with the reference's; name per cell what is
      wrong: direction, position, standoff, arrangement or level.
   7. **Show the maps and get the art owner's yes before the build brief.** A brief that says "direction stays"
      without steps 4 and 5 mapped for that zone is refused.
   8. **Build by levels**, every area grown along the traced flow from the first build
      ([references/area-map-and-traces.md](references/area-map-and-traces.md)): the level that carries direction
      and locks first, then the under-layer that fills behind it, the few white hairs last; judge each, then all
      together. One structural change per build (§6).

   Reason: one centre was rebuilt several times on length and shape alone, each build trading one defect for
   another, because its direction and value levels had never been mapped. The three-level recipe (step 5) and the
   build by levels (step 8) are proposed, not yet validated on a finished groom (Open).

## 1. The build order

The order production groom tools are built around (XGen, Houdini, Blender's hair nodes): guides and clumps carry
most of the look, noise and flyaways come last. A short cut over a skin fade: references/short-cut-and-fade.md.

1. **Parts and the design table.** One part per zone, each with its own roots, tables and seeds.
   [references/design-table.md](references/design-table.md)
2. **Roots.** Blue noise inside a drawn border line, with a boost band of extra roots where the hair must be
   dense to the edge.
3. **Parents grown with collision** against a signed distance field of the skin.
   [references/growth-and-collision.md](references/growth-and-collision.md)
4. **Locks and sub-locks** assigned at the root, then clump pulls, trims, waves, flyaways.
5. **Children** inside their parent's sub-lock, roots on the skin.
6. **Value per strand** (tone classes, silver) as the last pass.
7. **The audit**, then the review against the reference.
   [references/audit.md](references/audit.md)

## 2. Structure rules

- **The lock first, then the strand.** A strand is its lock's guide plus its root offset scaled by
  `1 - clump * u^p` (u = share of length). With p around 2 a lock keeps most of its width halfway and ends in a
  point. Reason: a linear, tight clump with its own helix per lock reads as ringlets, "lamb's wool" (one case:
  check it on yours).
- **Assign locks at the root** (nearest seed among the zone's roots wins), so a lock never crosses a zone and every
  shape's catchment is bounded by design.
- **The wave lies in the lock's layer and is shared by the lock.** Strands keep their lock's phase within a fraction
  of a radian. Use two components about 1 : 1.35 in wavelength so they drift in and out of step, plus an amplitude
  envelope; add a small per-strand noise. Put the long wave after the clump pull (pulls straighten growth waves).
  Per-strand crimp only on a minority (frizz on roughly a tenth of the strands).
- **Hang, do not hug.** Direction blends from a near-skin target to a hanging target along the strand, at a
  capped turn rate; the share of "down" grows with the distance run. Strands held in a layer of a volume to the
  end turn along its underside.
- **End strands with tables, not surfaces.** A length table and an end-height table (by position across the zone)
  with per-lock jitter, trims and layered cuts per sub-lock, staggered. Reason: strands cut where they leave a
  volume or enter a mask make a wall or a stencil edge.
- **Soft borders from height, not only density.** Height off the skin grows with the distance travelled from the
  root (a small ratio, around a tenth of a millimetre per millimetre), so border roots lie flat and the mass builds
  behind them; add a density and length ramp that straddles the border line. A fade only outside the line leaves
  a wall inside it. A border that stays hard after strand edits: switch each layer off first (`strand-rendering` §5).
- **Never gather strands after growth** to make a shape (a tuft, a point, a ponytail's end). Feed it from the
  roots: give it its own roots, lengths and direction from the root. Reason: a gather pulls in whatever crosses a
  row, smears what it catches and cannot add mass where no strand passes.
- **A volume from the masks bounds the growth; it is not a mold.** A visual hull of the reference's masks is where
  the locks may march, the "hair outside" check, a source of end heights and of positions for constructed guides
  (§3); never pack it strand by strand. Reason: filling it strand by strand made a fleece, and the masks' blocky
  outlines carved shelves (smooth the outlines a few px before any carve). A hull from a few views cannot carve
  concavities (under the lower lip, between moustache and beard), and where the views disagree its carve leaves
  artefacts (a split bottom, a short tip): gate guides against the masks beyond the reference's own floor, not
  against the hull.
- **Offsets across a strand ride a smooth frame.** Lock offsets and waves interpolated onto a strand are laid in a
  rotation-minimizing frame carried along it (double reflection, Wang et al. 2008), seeded from the root normal at
  the first sample where the strand has left it by a clear angle (about 15 degrees); test it on a strand that swings
  through its root normal and on a helix (the twist stays near zero). Never `binormal = tangent x root normal`: it
  flips where the strand swings through the normal, a hook at each flip. A flyaway's lift is never laid on a frame
  sampled per point from a field (a volume's voxel "up" jumps a few degrees a point and the lift's lever turns the
  jumps into a zigzag): smooth that frame along the strand and shorten the lift (a transported frame for the lift
  gained little more in one case).
- **Flyaways are their own part:** a few long single hairs rooted at a lock's root, lifted off and running beside
  it. More lint reads as noise, not as a halo.
- **Value per strand, inside levels.** Salt-and-pepper (grey) hair is strands of different value side by side: give
  each strand a class (silver, dark, regular) inside each value level (§0.5, step 5), and let the levels follow
  depth, a darker tone for the deeper layer. A curl does not make grey hair.
  Read the tone's spread on the export (p10 / p90 over strand ids): a wide spread reads as near-white tips over a
  dark mass once the renderer adds its contrast. Narrowing the groom's law (tone p10 / p90 0.55 / 1.10 -> 0.60 /
  1.06, a light zone scaled down, in one case) reduced the tips where lowering the renderer's contrast flattened the
  strands (`strand-rendering` §4).
- **Deterministic.** One seed per design, derived per zone; store parents and the design only; every variant must
  rebuild to the digit (strand and point counts, the masks). Reason: a number that moves between two runs of the
  same build cannot judge a change.

## 3. Direction and reach from the reference

An orientation field triangulated from a few calibrated views (Wei et al. 2005) can give the direction where the
views see the hair; parts give everything the field cannot (roots, lengths, ends, tufts, partings).
[references/orientation-field.md](references/orientation-field.md). Its limits decide where it may be used:
near-horizontal strands, regions one view alone sees, painted strokes that do not correspond between views.

Where a part's reach must match the reference (a point's tip, a moustache's front), **construct its guides on the
reference's measured geometry** instead of growing them: roots, tips and standoff placed on the hull's surfaces and
sections and on the masks' edge lines; strands then interpolated from the guides. A growth law makes reach emerge,
and twice it did not. When interpolating guides into strands:
- **Root region inside the guides' coverage**: cut it at the outermost guide row. A strand rooted beyond it is
  extrapolated (in one case turned onto the lip's normals and into the mouth: all the jumps and nearly every point
  behind the lips came from that strip).
- **Bound each strand by its guides**: no longer than their blended length, ending above the lowest point of its
  nearest guides.
- **Check each strand's reach against its own guides** (front per column, p50 / p90): strands blended across
  columns whose fronts differ stood several mm before or behind their guides.
A section loft (each guide keeps its normalised place across and front to back in every horizontal section of the
hull) gave a point its mass to the tip in one case; arcs from apex to tip did not make a moustache in three attempts.
[references/beard-parts.md](references/beard-parts.md)

A part that stands off the skin (a drape, a point) takes its shape from a section loft on the masks (front width by
profile depth per section), not from the 2D flow or the hull; measure its standoff first so the strand's first leg
can reach it; if its strokes run one way and its silhouette another, build two layers (an under-coat for the volume,
an outer layer for the flow); reach without mass makes stripes. Details in beard-parts.md, "Standing parts".

## 4. Beards

A beard is several parts with different jobs: moustache, under-lip, chin and point, cheeks, sideburn, jaw and
neck, a cheek-line fade, flyaways, an under-coat.
[references/beard-parts.md](references/beard-parts.md)

## 5. The export to an engine

- Resample so the wave survives: at least four points per wavelength. Check the wave's amplitude after the
  resample against before (one case: 3 mm segments kept about 90 % of a 12-18 mm wave; a cap of ten segments a
  strand lost it).
- Carry per-strand data the renderer needs: a strand id, a random, root-to-tip, depth or rank in the mass, tone and
  silver, flyaway and under-coat flags.
- Export per part when parts bind to different bones (the moustache to the head, the chin to the jaw).
- Read the export back (counts, bounds, attributes on every vertex) before the engine sees it.
- **Re-routing accepted strands keeps their draw rank and occlusion profile** (resampled at the same arc fraction):
  an exporter that recomputes them reorders strands where nothing moved (a dark stripe on an untouched lobe in one
  case). Re-baked shading normals are tested for the share pointing away from the skin's outside, and strays rooted
  along the old route are listed and dropped. [references/rerouting.md](references/rerouting.md)

Blender notes (one case each; check on your version):
- Realise the procedural node trees into plain Curves objects per part for export and review, and keep the
  generator hidden beside them, so a restyle reruns it.
- Carry the per-curve attributes the renderer and the review need (tone, silver, lock id, layer, flyaway) on the
  curves themselves; the exporter reads them from there.
- Before using the stock curl node, check that its "frequency" is a wavelength along the strand and that it does not
  lengthen the strand (one version did neither); a helix of your own with wavelength and amplitude in mm is exact.
- Alembic for Unreal (attributes, widths, saving from Python): see `strand-rendering`, references/engine-notes.md.

## 6. The loop

- **One piece at a time**, its checks written before the build, judged by `hair-reference-review`: one section
  (moustache, then chin and lower beard, then cheeks), each ending on the art owner's yes.
- **Shape before look**: a wave laid on a wrong outline reads as crimp and is rejected. Fix the outline, length and
  mass, then the waves, then the tone. Except where the highlight carries a part's light: it follows the tangent, so
  a re-route changes the value too; plan the strands' tone in the same piece (`strand-rendering` §4).
- **Change one structural thing per build** while diagnosing, and log each build per aspect (what changed, which
  rows moved). A ladder changes one variable, and round 0 is the base.
- **Two failed attempts on a piece send it back to evidence**: stop building, probe the cause without a build
  (read the volume, the roots, the catchment, the reference itself), then brief the next attempt. The same stop
  applies to a fit steered by a proxy gauge (`hair-reference-review` §5).
- **A fix that moves a defect without removing it names the wrong cause.** If a change turns a defect's angle or
  place but not its strength, stop and census the strands that draw it (by part and lock) before a second try; the
  guessed second cause was also wrong in one case, and 480 of 646 "crossing" strands belonged to another part.
- **No build on a forecast that passes nothing**: if the table's forecast fails the reliable rows at every setting,
  refit the forecast (single-variable ladders) before spending a grow attempt.
- **Curl, loops, hooks and combed ribbons: read the strands' 3D shape per part before changing anything.**
  [references/strand-shape-diagnosis.md](references/strand-shape-diagnosis.md)
- **Judge the groom in the renderer that ships** before trusting an offline render's look: offline renders
  integrate sub-pixel coverage and cast card-to-card shadows the engine does not.

## Open

- The orientation-field growth is published method, adapted and run on one beard's regrow: direction came out right
  and the mass wrong, and a flow field carried across to another face doubled its left-right difference. Its gain
  over hand-set flows is unproven.
- The per-zone design-table pipeline is taken from one working head-hair groom; on a beard (tufts assigned at the
  root, the under-lip boost band, the cheek's height ramp) it is proposed, not built.
- A long tapering point (goatee, beard tip, ponytail end): a section loft gives its mass to the tip; separate
  pointed tufts side by side have no validated recipe yet (pulling strands to tuft curves moved them off their
  guides).
- A moustache from constructed guides has no validated recipe yet; guides authored from the reference's traced
  locks (references/area-map-and-traces.md) are the route being tried.
- The value-level read (two or three levels, each with its own area, patch size, spread and direction) and the build
  by levels are proposed from one centre's rebuilds, not yet validated on a finished groom.
- Starting values for clump power, wave ratio, frizz share and the height-per-distance ratio come from one or two
  grooms (a short crop's density and caps: short-cut-and-fade.md); contributors should replace them with ranges.
- Which DCC features (Blender's Interpolate Hair Curves with guide groups, Houdini Guide Advect, XGen region maps)
  cover each step without custom code, per current version.
