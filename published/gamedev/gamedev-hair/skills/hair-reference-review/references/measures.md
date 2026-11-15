# The look rows

All rows are read at one pixel density (the shipped shot's), in CIELAB, inside the region (the reference's hair
mask, eroded a few px for the engine), by the same code for the reference, the DCC render and the engine. The
definitions below are one implementation; keep yours fixed once chosen, or no two rounds compare.

## Mass and outline

| row | definition | notes |
|---|---|---|
| fill | share of the reference's mask our matte covers, per view | a gate around 0.90 worked |
| hair outside | share of our matte outside the reference's mask grown 3 px | a gate around 0.10; flyaways counted and not, both reported |
| skin in the mask | share of the mask showing bare skin through our hair | |
| edge by bands | in profile, our front (and back) edge minus the reference's, per 20 mm band from the top | the mouth and the point bands matter most on a beard |
| zone fill | fill inside named boxes (cheek, join of moustache and cheek, under the jaw, the point) | a whole-view fill hides a bare zone |
| feature coverage | share of a named feature's pixels covered (upper lip, lower lip, under the nose) | read the feature from the model's landmarks, not from the painting |
| shelves | the largest step of the outline per row, in mm | a hull carved from blocky masks steps |

## Value and colour

| row | definition | notes |
|---|---|---|
| L* p10 / p50 / p90 / p99 | percentiles in the region | p99 and the share over a high L* catch bright-tip faults that p90 misses |
| dark share | share under L* 30 | the gaps between curls in the reference; a black band in ours |
| light share | share over L* 62 (light tips) and over ~75-80 (near white) | |
| hue | a* and b* medians, or C* and h | |
| on hair only | the value rows on pixels where both pictures have hair | a median over the mask reads the backdrop where hair is missing |

## Hair look

| row | definition | notes |
|---|---|---|
| strand contrast | std of L* detail at the strand's scale (a band-pass around 1-2 px) | inflated by aliasing: a sparkling groom passes it |
| clump contrast | std of L* detail at the lock's scale (a band around 2-8 px) | |
| strand / clump ratio | the two above | the row that best separated real hair (light filaments over a darker mass, ratio ~1.4-1.5 in one reference) from cards (flakes parted by dark wedges, ~1.0) |
| halo | width over which coverage falls from 0.9 to 0.1 across the outline; coverage 3, 6 and 10 mm outside it | a soft edge, not only flyaways |
| followed strand | length a ridge tracer can follow on the strands, mm | depends on the matte it is read through: read the reference in its own mask and keep that number fixed |
| wave | wavelength and amplitude along traced strands on crops | the tracer's own floor is about one pixel of amplitude: below it, judge by eye |
| lock width | p50 width of locks on crops | |
| skin features to keep visible | share of a feature (a scar, a tattoo) left visible | when the reference shows it |

## Flow

| row | definition | notes |
|---|---|---|
| direction | dominant orientation of a structure tensor per zone and view, degrees off the vertical | read the reference's first, before setting any groom direction |
| coherence | the tensor's coherence (0 random .. 1 parallel) | parallel combed hair reads as wool |
| spread | angular spread of orientations in the zone | |

**The noise floor:** read the reference against itself (the left zones against the mirrored right, every box moved
8 px each way, the tensor's scale halved and doubled); its worst case over all rows is the floor. In one reference
that was a coherence ratio of 0.90, 4 degrees of spread and 6 degrees of direction. Gate at about twice the floor
(one floor for each of the two reads compared).

Once a groom's direction is grown from an orientation field read off the same pictures, the flow rows are circular:
report them, judge by the other rows and by eye.

## Engine-only rows

- **Shimmer:** tile flicker over a slow crawl and a motion-only control (see `strand-rendering`).
- **Ghosting** under temporal AA.
- **Both LODs at the cut's camera:** value within a few L*, outline IoU >= 0.9.
