# When single hairs read as combed ribbons

One case, a beard: the reference read as single wiry hairs (a single-hair share of 0.70-0.86 in profile), the engine
render as ribbons (0.24-0.63). The surface was 16-27 parallel strands deep, blended per pixel.

What did not close the gap, in the order tried (check each on yours; the figures are one groom's):

| lever | result | reading |
|---|---|---|
| a sub-pixel kink (0.07-0.15 mm) on 7,299 surface strands | reached the mesh (24 % more vertices), changed nothing by eye at any scale | its amplitude was under a pixel, and the stack was too deep for one hair to be the top one |
| a shifted highlight lobe | modest | the texture difference is the groom's structure, not its shading |
| fibre-count self-shadow on the key light (the TressFX law) | single-hair share 0.40 to 0.46 (reference 0.85), 13 L* darker against the skin; the under-lip alone improved | self-shadow darkens the mass, it does not separate parallel strands; value contrast between neighbours was never the missing term |
| a per-strand course deviation above a pixel on smooth frames, 5,039 surface strands | closed 17 % of the direction gap; single-hair share 0.415 to 0.427 | with 21-26 lit strands blended per pixel the blend decides the pixel, not the top strand; crossers rooted inside the locks owned only 21-34 % of the top pixels |

- **Before building a texture term**, check that its amplitude is above a pixel at the shot's density and that the
  stack is thin enough for one hair to be the top one; otherwise it cannot show. Probe the target's own number
  before writing a pass line on it.
- **A 4 mm export segment cannot carry a kink shorter than 16 mm** (four points per wavelength): check the resample
  first.
- The levers left are in the renderer (true sub-pixel width with coverage, fewer blended layers) and in the groom's
  geometry (fewer parallel strands at the surface, crossing; `strand-groom` references/strand-shape-diagnosis.md).
- The stop rule is the usual one (two failed attempts on a piece, `hair-reference-review` §5): once a texture has
  failed on several routes, close the piece with the art owner and record what is left; do not open a new route
  unasked.
