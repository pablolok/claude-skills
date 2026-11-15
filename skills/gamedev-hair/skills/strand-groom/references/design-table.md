# The design table: one part per zone

A groom is easier to steer, review and bind when every zone is a part with its own table, rather than one global
rule tuned region by region. This layout comes from a working head-hair groom (long hair, tens of thousands of parent
strands; its author had not yet given final approval, and only its import into Unreal was tested) and is proposed
for beards; the fields are the ones that groom needed, the values are yours.

## Top level

| block | sets |
|---|---|
| seed | one seed for the design; each zone and the children derive theirs from it |
| roots | blue-noise spacing, roots' offset off the skin, the border line (drawn by hand or fitted to landmarks), its margin, boost bands seeded twice |
| skin phase | the shared combing along the skin before strands leave it: field, jitter, and the height off the skin as a function of the distance travelled |
| detach | where a strand leaves the skin (for example where the skin faces down) |
| free phase | step length, clearance, how an outer layer's standoff settles with distance, keep-out boxes (eyes, mouth) |
| zones | the parts (below) |
| clumps | sub-lock spacing, fine-lock spacing, pull strength and power per level |
| noise | sideways waves per sub-lock and per strand, each with amplitude and wavelength ranges |
| flyaways, strays | a share each; strays with their own wave phase |
| radius | root and tip radius ranges, the length of the taper |

## A zone's fields

| group | fields | what they do |
|---|---|---|
| selection | a zone coordinate range (an angle around the head, or `|x|`, depth and distance inside the border), mirror | which roots belong to the part; hard ranges, so a lock never crosses a border |
| sampling | points, step | resolution of the growth |
| locks | level-1 spacing at the exit, sub-lock spacing, assignment depth, pull per level | the lock structure, assigned at the root |
| length | a table by zone coordinate, per-lock jitter | the cap; the end height usually stops first |
| end height | a table by zone coordinate, jitter tied to the length draw | draws the outline's shape (a V, a cascade, a point) |
| direction | near-skin target, hanging target, blend distance, maximum turn rate, lift, curl, fan, per-lock jitter and lean | where the strand goes; the hanging direction is set by hand or read from an orientation field |
| volume | standoff by height, by layer rank, and its floor | outer layers ride on inner ones |
| tips | sub-lock trims, layered cut, spread, flick, taper | ragged, pointed ends instead of a straight cut |
| waves | growth waves; a sideways wave after clumping | see the structure rules in SKILL.md |
| roles | per sub-lock: crosses a window (an eye, a lip) or stops above it, staggered | windows read as pointed, not cut |
| density | children per parent | mass where the zone is long |

## Placement order

1. Roots for all zones: area-weighted blue noise inside the border line, plus the boost bands.
2. One shared skin phase, combed along the skin; the height off the skin grows with the distance travelled.
3. The zone from the exit point's coordinate (hard ranges).
4. Level-1 locks: blue-noise seeds among the zone's exit points; nearest seed wins.
5. Layer rank from the exit height (0 inner .. 1 outer).
6. Per-strand values from the tables plus per-lock draws.
7. Free phase: turn toward the blended target by at most the turn rate per step; fan, waves, curl; collision every
   step; stop at the length or the end height.
8. Shaping: sub-locks, trims, layered cut, window roles, clump pulls by level, spread, noise, the late wave, flick,
   flyaways; join, resample, taper, a final push-out; drop broken strands and count them.
9. Children (see growth-and-collision.md).

## Borders between parts

- One shared root set and skin phase across all parts hide most jumps.
- Put a border where the style parts anyway (a parting, the lip line).
- A soft border is two parts whose root regions overlap with complementary density masks, plus a fade part.
- A hard border (the lip line) is a discontinuity of direction, not a smooth turn; nothing interpolates across it.
- In tools that interpolate children from guides, keep the guides grouped per part (guide group ids, region maps,
  parting lines at full strength) so a part's children use only its own guides.

## Reading the tables off the reference

- Read every table through the model's landmarks, one registration per part: length and end height by position
  across the zone in the front view, by depth in the profile.
- Read the end-height table where the masks are trustworthy; where two views disagree, the view declared for that
  region decides.
