# Beards: the parts and what each owns

Production grooms split facial hair into separate parts (moustache, beard, sideburns, peach fuzz; MetaHuman ships
beard, moustache and "connected moustache" grooms separately), each with its own guides, density and clumping. No
sourced split finer than that was found; the table below is an inference from where one long grey beard's
reference flow and its failed builds broke. Treat each row as a starting design to check.

| part | roots | direction | what the part owns | border |
|---|---|---|---|---|
| moustache (mirrored) | the upper lip, from the nostril sill to the lip line, out to the mouth's corners | out and down, read off the front and 3/4; drawn guide curves where the field is blind | the arch, the wings past the corners, the standoff off the lip | hard parting along the lip line |
| under-lip | a band right under the lower lip, down to the chin's top | down over the chin | the continuity under the lip; feeds the point's front | hard to the moustache, soft to the chin |
| chin and point | the chin's front and underside | down, slightly forward | the point: its own seeds, catchment and length taper | soft to the jaw |
| cheeks (mirrored) | inside a border line on the cheek | from the reference's flow (often down and back toward the jaw's angle) | the wave, the clumps | soft to jaw, sideburn and fade |
| sideburn | in front of the ear | from the reference; usually one or two views only | - | soft |
| jaw, under-jaw, neck | the jaw line and below | the prior where strands lie near horizontal; one declared view at the neck | - | soft |
| cheek-line fade | a strip straddling the cheek's border | the cheek's | sparse, shorter, finer strands; low height | overlaps the cheek |
| flyaways, under-coat | a share per part; the under-coat everywhere, short | - | the halo; the dark mass between filaments | - |

## The moustache

- **Roots up to the nostrils.** Leave no band of skin under the nose unless the reference shows one.
- **The lower edge is an arch, not a level curtain.** It falls toward the mouth's corners (about 30 degrees in one
  reference); a level edge reads as a curtain. Strands straight down in narrow columns read as a comb.
- **It stands off the lip and overhangs it.** Read the standoff by layer rank off the profile and 3/4; a moustache
  lying on the lip is a thin dark fringe in profile.
- **The wings hang past the corners**, standing off the face, so the side views see them over the lip's side while
  the front still sees the mouth.
- **Give sub-locks a role at the mouth:** some cross over the upper lip, the rest stop above it, staggered. A single
  cut row reads as a stencil.
- Fit the mouth window to the model's lip vertices, never to a mask carved from a painting: a painted mouth can sit
  millimetres off the model's, and a mask carve then bites the model's upper lip.
- Decide with the art owner, before building, what shows. A default to check: the moustache covers the upper lip,
  and the beard starts right under a lower lip that stays visible.
- Constructed guides (apex-and-tip arcs placed on the hull's front and the reference's edge line) failed three
  attempts in one case even with the root region cut and the lengths bounded (SKILL.md §3): blended across columns whose
  fronts differ, rooted at the corners where the collider counts them behind the lips, tips set under an edge that
  lies on the lip seam. Read those three before a fourth construction.

## Under the lower lip

- Root it right under the lower lip; a root-ban band near the mouth (often added to keep strands out of the mouth)
  leaves a bare strip. Use a border line fitted to the lower lip's vertices, a small margin, and a boost band of
  extra roots along it.
- Strands run flat a short way first, then down into the chin's locks.

## The point (goatee, beard tip)

- **Assign its locks at the root**, never by gathering after growth. Give it tuft seeds on the chin; each tuft takes
  only the roots in its own bounded area (a lock joins a tuft only within roughly 15 mm of its path).
- **Feed each tuft from its roots:** lengths and direction from the root so enough strands reach the tip. A tuft
  with few roots near its path cannot be made dense by bending strands at the bottom.
- **End it by a taper of lengths** (an end-height table per tuft with jitter), not at one row: one row is a flat cut.
- Match its length in the view that shows it best (usually the profile) and judge in profile and 3/4 together.
- The curtain behind the point stays jaw locks with their own end heights; where they hang outside the reference
  beside the point, end them short of the first point that leaves the reference's front or 3/4 mask, staggered per
  lock by its own random draw (one stop for all is a stencil edge).
- **Built once, as constructed guides**: a section loft through the hull's horizontal sections from the chin to its
  lowest cell (each guide keeps its normalised place across and front to back, so the family narrows with the V),
  joined to its roots by a short blend along the skin's normal, a few core guides run on past the hull to the
  reference's tip as wisps; ends by a length table. It reached the tip as a mass in profile and a converging V in
  front, with no rope or crease. Still open: it reads as one smooth brush, not separate pointed tufts; a pull of
  whole locks toward a few tuft curves made bundles in depth only and moved strands off their guides. Tufts need
  their own roots and guides.
- Check the minimum spacing between converging guides near the tip (a rope where they all meet on one line).

## The cheek line

- Read the cheek's flow first; give the cheek's top border a skin phase (strands leave flat, height grows with
  distance travelled) and a density and length ramp straddling the line, sparse and short at the border.
- A fade only outside the line leaves the inside at full density and height to the last millimetre: a wall.
- A classifier that measures "cover by depth inside the border" must be validated on the reference itself before it
  gates anything (one such row passed a visible wall).

## Grey and salt-and-pepper beards

- Value per strand: a share of silver strands (about a tenth was a starting point, more among flyaways), a share of
  dark strands (about a quarter), the rest close to the base value; deeper layers darker; a lock's own darkening
  small. These shares are chosen, not fitted: compare the reference's value percentiles and its share of very light
  pixels at the shipped density.
- Light strands in a grey reference sit lower in value than you expect at a shipped density (a white filament
  covering part of a pixel reads mid-light, not white): read the reference's percentiles, do not guess "white".
- Do not use curl to make the beard read grey: it reads as a perm.

## Binding

- Cheeks and moustache can ride one bone rigidly; the point may need skinning to a chain. Separate parts let the
  moustache follow the head and the chin follow the jaw; check the jaw's clips before deciding.
