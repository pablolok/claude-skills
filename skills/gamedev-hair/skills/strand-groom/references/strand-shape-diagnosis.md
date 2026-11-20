# Curl, loops and hooks: read the strands' 3D shape first

Before changing anything, read the strands' 3D shape per part: swing of the tangent over about 20 mm, residual from
a copy smoothed over about 40 mm, coil = arc / chord, self-crossing in the front and side projections, net turn for
spirals. Read it on the build and on the same build's guides with no wave.

- The guides' own bend is the floor a texture target sits on: set swing and residual targets as the guides' value
  plus a few degrees, never as an absolute the march alone already exceeds.
- Two grooms grown differently that read the same swing have it from the strand-shape table (wave, sweep, frizz),
  not from the growth; loops that come with a new growth are the march's.
- A lock that orbits a pocket of the volume (net turn of hundreds of degrees, its end near its root) is chasing a
  target height the pocket lacks. **Trace the suspected trigger on the march before writing a fix** (the first one
  written fired on none of the coiled locks), prove the cause by a probe that removes the term for every lock, then
  fix only where it fires: removing it everywhere lost fill. A trigger on the volume's height against the planned
  height caught most of a throat's orbits; at a cheek's upper border, where the same chase made locks climb and hook
  back, only a rule narrow by place did (the lock's target stops rising after a few mm of run).
- Hooks that sit where a strand swings through its root normal are the frame's (SKILL.md §2), not the growth's.

## Parallel strands and blunt ends read as combed ribbons

A single-hair read needs strands that cross and end apart, not thinner strands. One case: the strands' crossing angle
p50 was 3-4 degrees against the reference's 9-10, bundles ended blunt, and the reference looked wider only because it
was blurred. Levers proposed, ranked by expected gain and not confirmed: a per-strand wave (noise 0.1-0.2 up to 0.8-1.2 mm at 10-16 mm wavelength),
per-strand end stagger (0-2 up to 0-25 mm), a weaker sub-lock pull, a few flyaways in the lower beard, a tip fade.
Their gain is unproven: in the engine a per-strand course deviation closed only 17 % of the direction gap, a
sub-pixel kink changed nothing by eye, and a stack 16-27 strands deep blended per pixel decides the pixel, not the
top strand (`strand-rendering`, references/single-hair-read.md). Check a term's amplitude against a pixel at the
shot's density and the stack's depth before building it; a kink needs four export points per wavelength, so a 4 mm
segment cannot carry a kink shorter than 16 mm.
