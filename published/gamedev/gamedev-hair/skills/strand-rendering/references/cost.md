# Cost: formulas and orders of magnitude

## Formulas

- Ribbon triangles = strands x segments x 2; vertices = strands x (segments + 1) x 2.
- Each pass draws them again: opaque strands with a depth prepass draw twice; blended strands with no shadow, once.
- Segments are set by the wave, not by taste: at least four points per wavelength where the wave is seen (the top
  layer, the flyaways); fewer elsewhere (the under-coat, the mid layer).

| strands | 8 segments | 12 segments | 25 segments |
|---|---|---|---|
| 5,000 | 80k tris | 120k | 250k |
| 10,000 | 160k | 240k | 500k |
| 20,000 | 320k | 480k | 1.0 M |

## Measured (one beard, one high-end desktop GPU, 1080p)

| what | strands | triangles drawn | GPU | CPU |
|---|---|---|---|---|
| a cheek patch, opaque, two passes | ~5k | ~110k | under the clock's noise (~1 ms) | ~0.4 ms skinning |
| the whole beard, blended, one pass, 3 mm segments | ~19k | ~0.84 M | ~3.6 ms for the strands' pass | ~4-5 ms CPU skinning of ~0.87 M vertices |

- Skinning scaled linearly with vertices in that engine (GPU skinning off). Hair that rides one bone rigidly (cheeks
  and moustache on the jaw or head) needs none: parent a renderer to the bone and skin only what moves on its own
  (a long point on a chain).
- A "bake the skinned mesh" proxy overstates skinning (it rebuilds the mesh with every UV set): an upper bound only.
- A profiler's per-pass GPU timer resolves arms the frame clock does not; use it and alternate arms over several
  rounds.

## Published anchors

| source | what | numbers |
|---|---|---|
| Epic, MetaHuman LOD specification | facial hair | strands 10,000 at LOD 0, 5,000 at LOD 1; card vertices 15,000 / 7,000 / 3,000 / 1,000 / 500 over LOD 0-4 |
| Epic, MetaHuman LOD specification | a hairstyle | strands 50,000 / 25,000; cards to LOD 4; meshes from LOD 5 |
| Epic, Hair Card Generator tutorial | one cinematic hairstyle, cards, LOD 0 | ~54k triangles over coverage, mid, top, flyaways and short-hair layers |
| NVIDIA, "The Witcher 3: Wild Hunt" graphics guide | the hero's HairWorks strands | ~6,000 for the beard (30,000 average for the whole hair) |
| Frostbite, SIGGRAPH 2019 | strand hair on a base last-generation console at 900p | 15,000 short strands in 1.9 ms; 10,000 long in 4.5 ms |
| shipped card beards (artist posts, store packs) | hand-placed cards | about 10-12k triangles |

## Budget questions to settle early

- The weakest GPU the close shot must hold on.
- GPU skinning on or off for the project.
- Which zones need the wave's segments in the shot; LOD by layer (under-coat and mid layer are often half the
  strands and hidden).
- Where the heavy mesh lives (an FBX of tens of MB is usually not for git; rebuild it from the export or use LFS).
