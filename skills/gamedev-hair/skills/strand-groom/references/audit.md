# The audit: gates before anyone looks

Run per part and for the whole groom, on every point, children included, after the final push-out and after the
export's resample. A groom that fails a gate is not reviewed.

Ran on one working head-hair groom: penetration, sanity, export read-back, dropped strands, determinism. Proposed
for faces, not yet run: roots, moving bands, seams, the per-part budget.

| check | rule | why |
|---|---|---|
| penetration | every point but the root: clearance = signed distance - radius >= -0.05 mm, exact distance within ~25 mm of the skin | a strand through the skin shows in every close shot |
| roots | every root within +-0.5 mm of the skin | interpolated or blended roots sink or float; on a face it shows |
| moving bands | clearance near a moving feature (the lower lip, an eyelid) >= that feature's largest move in the animation clips | a strand that clears the rest pose can pierce the open mouth |
| dropped strands | the count dropped for a jump, per part | a rising count is a collider or growth fault |
| seams | no strand rooted in another part's border band | doubled density along a seam |
| sanity | every value finite, radii > 0, no zero-length segment | engines import garbage silently |
| determinism | a rebuild of the delivered design gives the same strand count, point count and masks to the digit | otherwise no number compares two builds |
| export read-back | read the exported file back: strand and vertex counts, bounds, every attribute present on every vertex, ids unique (or the collisions counted) | the importer is part of the pipeline |
| budget | strands, points, triangles at the export's segment rule, per part | the engine's cost is decided here |

Report per part as well (not gated): root distance, clearance, tip height and length percentiles.

## After the gates

The look checks belong to `hair-reference-review`: mattes against the reference's masks, edges by band, zone fills,
value and colour, the strand and clump contrast, the halo, the wave as rendered, the flow.
