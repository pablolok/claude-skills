# A short cut with a skin fade

One case: a textured crop (top up to about 45 mm) over a high skin fade, grown with a long-hair generator of the
kind in growth-and-collision.md (blue-noise follicles, a combed scalp phase, a free phase with SDF collision, locks
and sub-locks, children inside sub-locks) extended for a short cut, judged by eye against a photo of the cut and
approved by the art owner. Its numbers are one groom's: check this.

## Zones decided at the root

- **Assign every strand to its zone by where its root is** (angle around the head, height above the cut line, front
  or back, angle to the crown's whorl), not by where it leaves the scalp. Reason: on a short cut the exit point is a
  few mm from the root and says little; the root is what the barber's rules and the fade's ramp are written on.
- **Six zones** made the cut: the fringe; the front top; the back top; the crown (a small spiral whorl, the swirl
  fading with distance); an edge band just above the fade; the fade.
- **Each zone has its own flow** (combed from the whorl, then turned toward the zone's target at a capped rate),
  **its own volume** (keyed by each point's height, so the sides drop into the fade and the volume sits at the front
  top), **its own clumping** (piecey tufts on the top and fringe, an even, barely clumped band at the edge, a back that
  lies down) and **its own length rule** (below).
- The fringe and the front top can turn from forward-down at the root to forward-up at the tips (the generator's
  near and far targets blended over a few mm): spread the turn over the whole front (about +-35 degrees) and keep it
  gentle. A strong turn read as curly hooks head-on.

## Density

- **Follicles 0.8 mm apart** on the top (about 80 per cm2) **plus one child each**: about 160 strands per cm2, near a
  real scalp (roughly 150-250 hairs per cm2). About 70k strands for the top zones; 0.6 mm spacing for the fade, thinned
  by its ramp; about 140k strands with the fade and 200k with the under-coat.
- Children interpolated between two parent roots lie on the chord between them, so on a curved scalp a child's root
  can sit under the skin (down to 0.17 mm in one case): project it back (growth-and-collision.md, Children).
- **Rescale a long-hair generator for 1-50 mm hair**: its per-metre bends, root-lift ramps, flyaway arcs, noise and
  step sizes are set for hair a metre long, and a strand shorter than one free step never grows (the fade needed
  0.2 mm steps).

## A barber's cut by rule

After growth, one list of rules, each on its zones and a range of angles around the head, jittered per lock (or per
sub-lock): cut where the strand first crosses a line plus an offset (the fringe line, the top over the fade, the edge
over the fade, a temple corner), where it passes a front plane (the fringe's reach), or where its total length root
to tip reaches **the zone's length cap**. Re-taper every cut tip; log the strands cut per rule.

- Caps in one case: fringe 30 mm, front top 43, back top and crown 33, edge band 19.
- Graduate the length toward the cut line (shorter near it, by the root's height) so the sides drop into the fade
  instead of standing out as a cap (a "mushroom" in the first delivered round).
- This is not the surface cut SKILL.md §2 warns against: a barber's cut is a rule by design, and the per-lock jitter
  and the re-tapered tips keep it from reading as a stencil. Ends inside the mass still come from the zone's tables.

## The fade

- **It thins and shortens to nothing on a line the art owner draws** (on a screenshot of the groom): fit the
  screenshot's camera by silhouette, cast the line onto the head, store it as a height per angle around the head, and
  mirror it left to right.
- **Density and length ramp smoothly from the cut line to zero at the drawn line** (stubble from about 6 mm at the top
  to a quarter of a mm at the line in one case), with continuous functions, no bins.
- **No fade roots in front of the temple corner.** There the band between the drawn line and the cut line was only
  1-23 mm tall, so its stubble kept full density and full length, pointing forward in a pocket under the corner: two
  visible patches. A density ramp by angle that drops to zero in front of the corner removed them.
- **Fade roots run a few mm above the cut line, under the top's lowest rows** (4 mm in one case): without them a pale
  line showed at the join.
- **Short strands and the push-out.** In that generator a step pushed out of its collision margin re-aims the strand
  along the push (growth-and-collision.md, Growth with push-out). The fade's first 0.2 mm step, 0.12 mm off the skin,
  was pushed out to a 0.34 mm margin, so every stubble strand stood about 48 degrees off the scalp where the top's
  lowest rows lay at 15-17 degrees: the longer stubble then stood 6 mm proud as a shelf. Fix: a base margin near zero
  for the fade (0.05 mm: no push, no re-aim), an explicit lift (about 15 degrees, rising toward the drawn line), no
  bend.
- **Make the junction flush**: shorten the top's lowest rows over a band above the cut line (per-strand cut heights,
  stub lengths by root height), cut back overhanging tips that stand further off than the fade, and check the lean of
  the top's lowest rows against the fade's in every window around the head.

## Coverage of the long top: the under-coat

- **Measure scalp in line of sight**: an unlit render with one ray per pixel; the footprint is the skin whose nearest
  root is a long-zone root within 2 mm, seen with the hair hidden; the number is the share of it still seen with every
  strand drawn opaque. In one case 10-25 % per view, from the partings between locks radiating from the whorl.
- **More strands inside the tufts do not fill partings**: 1.6x the strands cut it by only a third in front.
- **An under-coat halved it in every view** (front 21.5 to 6.9 %, profiles 12.4 to 4.4 %, back 13.5 to 5.7 %): one
  more run of the same generator over the long zones' footprint with the same seed, follicle spacing and comb field
  (so its hairs lie along the same flow), heights 0.4-1 mm off the skin, no clumping, one child each, every hair cut to
  about a third of the local tuft length (x 0.8-1.2: 5 / 8 / 12 mm at p10 / p50 / p90), 6 points a hair. Root it from a
  few mm above the cut line (more at the sides and back, where the edge band starts), so the junction is untouched;
  check that no under-coat point lies below the cut line or in front of the fringe's lowest tips. It made the hair read
  about 10 % darker.
- Tip variants (open tips, a blunter cut, loose pieces of a few locks) read the same to the art owner at the review's
  views in one case: fix coverage before tip shape.

## Checks and export

- **Poses**: zero points inside the skin at rest, at the displayed pose and with the head turned about 40 degrees
  with the neck still; roots within 1 mm of the posed skin. Zones that follow the neck's skin (the fade, the edge)
  need a skin binding, not a head-bone parent.
- **Short hair stays static**; simulate only long locks, if any.
- **Export short zones with their own points**: no resample, no push-out after it. Resampled to 16 points and pushed
  out, the 6-point under-coat's first segment tilted 7 degrees at p50 and 27 at p99; the fade and edge 1-2 degrees.
  Read every file back (counts, and positions against the DCC's rest strands).
- Widths and saving in Unreal: `strand-rendering` references/engine-notes.md.
