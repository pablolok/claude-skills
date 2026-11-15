# Growing parents with collision; children inside sub-locks

## Parents, not a few guides

In the working head-hair groom this comes from, every root grows its own parent strand with full collision; the
"guides" are the level-1 lock means, and children only thicken the long zones. A few guides interpolated over a
head skip the collision for every interpolated strand, which is where strands go through the skin.

## The skin's signed distance field

- **Collider:** the posed body and head, exact where the hair is (the face for a beard, the scalp and shoulders for
  head hair).
- **Grid:** about 1.25 mm cells around the hair's skin, coarser elsewhere. Within a band near the skin store the
  exact distance: nearest triangles from a KD-tree of triangle centres (16 nearest is enough), exact closest point
  on each triangle (Ericson, *Real-Time Collision Detection*, closest point on triangle); interpolate outside the
  band.
- **Sign from the pseudo-normal of the closest feature** (Bærentzen and Aanæs 2005: the angle-weighted normal of
  the face, edge or vertex the closest point lies on). Reason: a vertex-normal sign fails at saddles; the mouth
  corners and nostrils are saddles (one case read +3.5 mm where the truth was -32.5 mm). Where the posed skin
  intersects itself, use a winding-number or ray-parity count instead.
- **Measure its error before trusting it:** sample points within a few mm of the skin, compare grid distance with
  exact point-to-triangle distance. Aim at p99 under about 0.1 mm at the lips, chin and nostrils; build a finer
  local grid if it misses.
- Keep the mouth's pit closed for the moustache (a closed lip line), or strands dive into the mouth.

## Growth with push-out

- Per point, a margin = base clearance (about 0.5 mm) + the strand's radius + the layer standoff at its rank.
- At every growth step, a point inside its margin moves along the field's gradient by the shortfall, **and the
  strand's direction is reset to that move**, so the strand slides along the skin instead of bouncing off it.
- After resampling: several push passes at radius + a little, let strands escape where they can, then a few more.
- Drop strands with a jump (a segment over a few cm, or over a dozen mm and over four times the strand's median
  segment) and **count them**; a rising count is a collider or growth fault, not noise.

## Children

- Draw each child's partner from the parent's own **level-2 sub-lock**, never from the whole lock.
- One weight w in [0.2, 0.8] for the whole child strand; child = (1 - w) parent + w partner, point by point,
  the radius too. Tips then land inside the sub-lock's V.
- **The partner must be rooted within a few mm of the parent, and the child's root projected back onto the
  skin**, then pushed out like a parent. Reason: blending two roots far apart puts the child's root under the skin
  (one head-hair groom had roots down to about -19 mm, 1 % below -6 mm, invisible on a scalp under long hair and
  plain on a face).
- Seed children deterministically from the design seed and the zone; sort members stably. Store only parents and
  the design: render, audit and export rebuild identical children.
- Children add mass. They do not add silhouette or wisps: those are the parents', the flyaways' and the tips'.

## Growing toward a target height (soft borders)

- A skin phase: strands leave the skin at a shallow angle and run along it first.
- Target height off the skin = base + k x distance travelled, times a ramp by distance inside the border line, so
  roots at the border lie flat and the mass builds behind them.
- Unlike a density fade, this keeps the border's strands visible as hair lying flat, which is how a real hairline or
  cheek line reads.
