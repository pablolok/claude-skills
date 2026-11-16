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
   before calling anything a conflict. Reason: a moustache's edge misread as the mouth line once made a false
   20 mm "conflict" that drove a design decision.
4. **Read the reference's flow before setting any direction.** A structure tensor per zone and per view, drawn as
   segments over the picture. Reason: a brief said "down and forward" for a cheek whose hair runs down and back in
   every view; the groom built to the brief was 50-60 degrees off.
5. **Check that the reference agrees with itself** before matching it (`hair-reference-review` §1.5): views painted
   one at a time need not agree in 3D, and no groom satisfies views that contradict each other. When they
   contradict, make the set again as one multi-view image. Where views still disagree, declare which one wins for that region and report
   both numbers.
6. **Measure the mass before the texture.** Carve the reference's hull from its masks, carve the groom's own
   projections the same way (like with like), and read the volume per zone (cm3) and each zone's shortfall and
   excess in mm (p50 / p90) with its extents (reach, width, lowest tip). A groom far under the reference's volume is
   a smaller beard: no reshaping, texture or shading recovers it. Grow it into the reference's hull first (one groom
   at about half the volume covered under 0.6 of the masks; grown into the hull, about 0.9).

## 1. The build order

The order production groom tools are built around (XGen, Houdini, Blender's hair nodes): guides and clumps carry
most of the look, noise and flyaways come last.

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
  a wall inside it.
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
- **Every offset laid across a strand rides a smooth frame.** Lock offsets, waves, a flyaway's lift and a child's
  spread are laid in a frame carried along the strand: a rotation-minimizing frame (double reflection, Wang et al.
  2008), seeded from the root normal at the first sample where the strand has left it by a clear angle (about 15
  degrees). Never `binormal = tangent x root normal` (it flips where the strand swings through the normal: a hook at
  each flip), and never a frame sampled per point from a field (a volume's voxel "up" jumps a few degrees a point,
  and a lift's lever turns the jumps into a zigzag; at least smooth it along the strand). Test it on a strand that
  swings through its root normal and on a helix (the twist stays near zero).
- **Flyaways are their own part:** a few long single hairs rooted at a lock's root, lifted off and running beside
  it. More lint reads as noise, not as a halo.
- **Value per strand, not per lock.** Salt-and-pepper (grey) hair is strands of different value side by side;
  give each strand a class (silver, dark, regular) and deeper layers a darker tone. A curl does not make grey hair.
  Keep each class's tone range narrow (regulars about 0.9-1.1 of the base): a wide spread reads as near-white tips
  over a dark mass once the renderer adds its contrast, and narrowing the groom's law fixes that where lowering the
  renderer's contrast flattens the strands (`strand-rendering` §4).
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
- **Blend only guides on one surface**: strands blended across columns whose fronts differ stand several mm before or
  behind their guides.
A section loft (each guide keeps its normalised place across and front to back in every horizontal section of the
hull) gave a point its mass to the tip in one case; arcs from apex to tip did not make a moustache in three attempts.
[references/beard-parts.md](references/beard-parts.md)

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

Blender notes (one case each; check on your version):
- Realise the procedural node trees into plain Curves objects per part for export and review, and keep the
  generator hidden beside them, so a restyle reruns it.
- Carry the per-curve attributes the renderer and the review need (tone, silver, lock id, layer, flyaway) on the
  curves themselves; the exporter reads them from there.
- Before using the stock curl node, check that its "frequency" is a wavelength along the strand and that it does not
  lengthen the strand (one version did neither); a helix of your own with wavelength and amplitude in mm is exact.
- Alembic attributes for Unreal: see `strand-rendering`, references/engine-notes.md.

## 6. The loop

- **One piece at a time**, its checks written before the build, judged by `hair-reference-review`.
- **Change one structural thing per build** while diagnosing, and log each build per aspect (what changed, which
  rows moved).
- **Two failed attempts on a piece send it back to evidence**: stop building, probe the cause without a build
  (read the volume, the roots, the catchment, the reference itself), then brief the next attempt.
- **Curl, loops and hooks: read the strands' 3D shape per part before changing anything** (swing of the tangent
  over about 20 mm, residual from a copy smoothed over about 40 mm, coil = arc / chord, self-crossing in the front
  and side projections, net turn for spirals), on the build and on the same build's guides with no wave.
  - The guides' own bend is the floor a texture target sits on: set swing and residual targets as the guides' value
    plus a few degrees, never as an absolute the march alone already exceeds.
  - Two grooms grown differently that read the same swing have it from the strand-shape table (wave, sweep,
    frizz), not from the growth; loops that come with a new growth are the march's.
  - A lock that orbits a pocket of the volume (net turn of hundreds of degrees, its end near its root) is chasing a
    target height the pocket lacks. **Trace the suspected trigger on the march before writing a fix** (the first
    one written fired on none of the coiled locks), prove the cause by a probe that removes the term for every lock,
    then fix only where it fires: removing it everywhere lost fill. A trigger on the volume's height against the
    planned height caught most of a throat's orbits; at a cheek's upper border, where the same chase made locks climb
    and hook back, only a rule narrow by place did (the lock's target stops rising after a few mm of run).
  - Hooks that sit where a strand swings through its root normal are the frame's (§2), not the growth's.
- **Judge the groom in the renderer that ships** before trusting an offline render's look: offline renders
  integrate sub-pixel coverage and cast card-to-card shadows the engine does not.

## Open

- The orientation-field growth is published method, adapted but not yet run on a groom here: its go/no-go probe and
  the gain over hand-set flows are unproven.
- The per-zone design-table pipeline is taken from one working head-hair groom; on a beard (tufts assigned at the
  root, the under-lip boost band, the cheek's height ramp) it is proposed, not built.
- A long tapering point (goatee, beard tip, ponytail end): a section loft gives its mass to the tip; separate
  pointed tufts side by side have no validated recipe yet (pulling strands to tuft curves moved them off their
  guides).
- A moustache from constructed guides has no validated recipe yet; guides drawn by hand on the reference's views
  are the untried alternative.
- Starting values for clump power, wave ratio, frizz share and the height-per-distance ratio come from one or two
  grooms; contributors should replace them with ranges from more.
- Which DCC features (Blender's Interpolate Hair Curves with guide groups, Houdini Guide Advect, XGen region maps)
  cover each step without custom code, per current version.
