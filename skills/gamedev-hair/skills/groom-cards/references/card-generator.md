# Cards from the groom with Unreal's Hair Card Generator

One case: a short head-hair cut (a crop over a skin fade, about 200k strands with its under-coat) carded with the
experimental Hair Card Generator of one Unreal 5 version, through its Dataflow route. The plugin is experimental:
check every name and default below on your version.

## What it needs

- **Plugins in the project:** the Hair Card Generator and Geometry Dataflow (a change to the project: keep a copy of
  the project before it). The generator works on a Groom asset through a Dataflow made from its card template.
- **A Python ML stack on first run:** PyTorch with CUDA, torchvision, torchaudio and about ten pip packages (scipy,
  numpy, scikit-learn and smaller ones): about 2.5 GB downloaded and about 5 GB on disk inside the project's
  intermediate folder. It is a download from outside the engine: ask the owner first.
- **Time and memory (estimate, one case):** 15-40 min for the first run with the download, 5-30 min per generation,
  a few GB of VRAM.
- **Groom assets made for the generation**, imported from the approved groom's Alembic with its widths set
  (`strand-rendering` references/engine-notes.md); leave the approved Groom assets untouched and prove it (hash the
  assets before and after).

## Sets

A set is one groom generated once with its own settings. Split by what the cards must do:

| set | from which strands | why apart |
|---|---|---|
| long | every long zone plus the under-coat, merged into one Alembic | one atlas and one clump budget for the mass |
| edge | the ring of short hair at the top of a fade | a band of short, nearly opaque cards; never the forehead hairline, which belongs to the long set's fringe |
| upper fade | fade strands at least about 2.5 mm long | shorter strands cannot make a card; paint them (painted-base.md) |

## Settings that mattered (one case)

Common: random seed fixed (7), atlas 4096, the default layout, the group's width override at twice its largest
strand radius with root and tip scale 1 and "use the groom's strand width" on, width scaling 1.0, depth range
-2..+2 cm.

| set | clumps | cards | triangles | textures (made) | other |
|---|---|---|---|---|---|
| long | 600 | 1,800 | 10,382 | 60 (57) | 3 cards a clump, adaptive subdivision on, 10 flyaways, triangle target 10,000 |
| edge | 200 | 600 | 1,986 | 24 (22) | 3 cards a clump, adaptive on, no flyaways, target 2,000 |
| upper fade | 383 | 1,149 | 2,298 | 120 (117) | 1 segment a card (a 5-7 mm card on the skull bows about 0.07 mm), adaptive off, multi-card off, no flyaways |

The head came to 14,666 triangles of cards (plus a 5,200-triangle painted base), inside a 15,000 target.

Pitfalls met:
- **The Dataflow node sets the card count to clumps x 3 whatever the multi-card switch says**: a fade run with 560
  clumps and multi-card off made 1,680 cards and 6,720 triangles, over budget. Set the clump count from the budget.
- **With adaptive subdivision on, the maximum vertical segments per card is ignored.**
- **A card's size is the clump's, not the strands'**: fade cards about 5 mm wide stayed 9-11 mm long all the way down
  while their strands shortened from 6 to 2.5 mm; the shortening lives only inside the texture, and the set still
  ends in one band. Read the card length by root height before accepting a fade set.
- **The long cards' coverage thins out at their ends**: in one case the last 1-2 mm of the fringe's texels were
  nearly empty (coverage about 0.06), a small gap at the fringe's centre that only regenerating changes.
- **The metadata file the generator writes may still list the template's defaults**: read the counts from the
  meshes it made.
- **Keep each run's settings in a spec file** beside its outputs: runs differ by one or two numbers, and only the
  spec says which run made which mesh.

## What comes out

Per set, one static mesh (one UV set; U across a card, V along its strands; several cards share one of the atlas's
representative clump textures) and four atlases, 8 bits each:

| atlas | holds |
|---|---|
| depth | each texel's strand distance from the card plane, -2..+2 cm mapped to 0..255; 0 where no strand |
| coverage | the strands' opacity over the card: the alpha |
| tangent | the strand direction in the card's tangent space, `0.5 * t + 0.5` per channel (check the sign convention in the generator's shader) |
| attributes | R, G root UV (left at 0 in the version read); **B the root-to-tip coordinate** (0 root, 1 tip); **A a random value per strand** |

- The layout names six slots (material and auxiliary too); the version read filled four. **No colour and no
  roughness come out**: the Alembic carried none and the writer fills none. The colour is the renderer's job,
  along the root-to-tip coordinate (forward-renderer-look.md).
- Coverage differs by set: in one case the long set's non-empty texels were 82 % at 0.25 or more but only 26 % at
  0.9 or more (grey by construction), while the edge and fade sets were mostly opaque.
- The mesh is in the engine's units and axes, through the same import conversion as the groom. Exported as FBX
  and imported into Blender with the importer's defaults, it landed on the head in metres, at the rest pose the
  groom was made in (one case).

## Check it before the engine look

In the DCC, at the rest pose:
- **Root gap**: per card, the vertex nearest the scalp against the nearest root of its strands (p50 0.35, p90 0.6,
  max 1.7-2.4 mm in one case); card root to scalp about 1.1-1.4 mm median.
- **Extent and centre**: the cards' bounding box against the strands' (ratios 1.00-1.09, centre within 1 mm).
- **Shape**: a flat-colour render, coverage as alpha, no base, beside the groom in the same flat colour, at the
  close cameras. In one case it read as a full mass with no skin, a similar hairline, slightly spikier.
- **Which end is the root**: fit a plane to the attributes' root-to-tip coordinate over each card's strand texels;
  the end with coordinate 0 is the root (it was nearer the skin on every card in one case). The binding needs it.

## Licence

Cards generated by one engine and shipped in a game made with another: read that engine's licence clause on assets
made with it before relying on it. In one case the clause read as allowing it, but the live text could not be
verified word for word: check this.
