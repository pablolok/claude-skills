# The look rows

All rows are read at one pixel density (the shipped shot's), in CIELAB, inside the region (the reference's hair
mask, eroded a few px for the engine), by the same code for the reference, the DCC render and the engine. The
definitions below are one implementation; keep yours fixed once chosen, or no two rounds compare.

## Mass and outline

| row | definition | notes |
|---|---|---|
| fill | share of the reference's mask our matte covers, per view | the limit is the reference's own worst self-disagreement (whole views 0.86-0.88, zones 0.75-0.94 in one set) |
| hair outside | share of our matte outside the reference's mask grown 3 px | the same rule (0.12-0.14 in one set); flyaways counted and not, both reported |
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
| relative to skin | each value row minus the median of fixed skin patches beside the hair (a forehead and a cheek patch, outside the hair grown a few px), per picture | for a reference painted or rendered in another light; cancels exposure and grade, not the light's direction (read the mirrored views first) |
| under-tone strength | the band under a border against bare skin beside it in the same picture, pixel by pixel | sets a skin tint under sparse strands; a skin-to-skin ratio across two pictures in different light reads nothing |

## Hair look

| row | definition | notes |
|---|---|---|
| strand contrast | std of L* detail at the strand's scale (a band-pass around 1-2 px) | inflated by aliasing: a sparkling groom passes it |
| clump contrast | std of L* detail at the lock's scale (a band around 2-8 px) | |
| strand / clump ratio | the two above | the row that best separated real hair (light filaments over a darker mass, ratio ~1.4-1.5 in one reference) from cards (flakes parted by dark wedges, ~1.0) |
| halo | width over which coverage falls from 0.9 to 0.1 across the outline; coverage 3, 6 and 10 mm outside it | a soft edge, not only flyaways |
| followed strand | length a ridge tracer can follow on the strands, mm | depends on the matte it is read through: read the reference in its own mask and keep that number fixed |
| wave | the direction along each traced strand in windows of about two wavelengths (its overall turn removed), its power summed over the wave's band, per zone and view; gated within the reference's own spread (boxes moved a few px) plus a margin set so the same build with the wave at zero and a crimped build both fall outside | wavelength and amplitude rows passed a tight crimp: the tracer's floor is about one pixel of amplitude. Crossing strands in the reference also add direction change, so a groom of parallel waved strands cannot reach it by more wave |
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
that was a coherence ratio of 0.90, 4 degrees of spread and 6 degrees of direction. Gate the flow rows at about
twice the floor (one floor for each of the two reads compared); the shape rows at the floor itself (SKILL.md §2).

Gate flow for every area at every round, per view, profile included: the angle error against the reference's flow,
the share of strands far off, and the spread and coherence, not only the mean direction (one case: 13 flow cells
passed a moustache whose profile fanned to 105 degrees; "strays" were the part's own strands fanned out, spread
113-117 degrees against 69-77). A count of strands out of the mass outline is a second row, with the reference's own
count as its target. Read flow on the outer layer only for a part with an under-coat.

**Judge direction on the raster, per cell, by the worst cell** (what is drawn in front), never by a median over
strand data: strands hidden behind the outer layer or curling away from the camera vote in the data and not in the
picture. One roll passed at 8 degrees (median of 16 cells on strand data) while its profile picture was a ball; per
cell on the picture the worst error was 82 degrees.

Once a groom's direction is grown from an orientation field read off the same pictures, the flow rows are circular:
report them, judge by the other rows (mass and length first) and by eye.

## Density and shape rows added by regrows

| row | definition | notes |
|---|---|---|
| density map | per zone and view, hair coverage against skin showing, at the reference's pixel, ours against the reference | sparse patches (under the lip, a cheek fade) are part of the shape |
| hull mass | the hull's volume per zone, ours against the reference's, and height off the skin | direction can pass while the mass is lost |
| length per area | tip line per area along the flow | checked after every grow |
| strays | share of an area's strands outside the part's own outline | the reference read 0.4-2.9 % |

## Proxies

A proxy is a cheap picture of the groom made outside the engine (a numpy projection of the strands with a simple
shade). It speeds up ladders; it never replaces the capture.
- **Calibrate per row** against engine captures of the same builds. In one case it was reliable for notch air, lip
  share, edge and outline, and unreliable (slope near 0.2 or negative) for heading and coherence, which were read on
  captures only.
- **Gate on the difference from a control** (the base build through the proxy and in the engine): in one case the
  proxy read about 10-12 luma above the engine on every build, and the gap between two builds held to 2. The proxy's
  error on that control is the row's floor; a miss under it (3.0 against 5.8 in one case) is not a result.
- **Name the terms it leaves out.** A proxy without the root shade cannot judge specks in the strands' first
  millimetres; one without the highlight cannot judge a value change from a re-route.
- **Depth-test hidden strands**: plain projection drew far-side strands over the mouth.
- **A gate between two failure sides is a band, not a limit** (one case: notch air 0 for the base, 871 for one
  build, 358 for the reference; a one-sided limit passed the very base it was to fix).

## Engine-only rows

- **Shimmer:** tile flicker over a slow crawl and a motion-only control (see `strand-rendering`).
- **Ghosting** under temporal AA.
- **Both LODs at the cut's camera:** value within a few L*, outline IoU >= 0.9.
