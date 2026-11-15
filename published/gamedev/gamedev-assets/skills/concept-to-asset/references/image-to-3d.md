# Image-to-3D: shapes per view

Part of `concept-to-asset` §2.

## Input

- **Key the backdrop yourself.** Generate references on a flat colour (mid-grey for props, a contrasting flat
  colour for a pale body), turn it into alpha with a flood fill or a colour key, and look at the RGBA before
  generating. A cast shadow or an opaque gap between legs becomes a slab of geometry.
- **Square, subject centred**, filling most of the frame. Each view of a turnaround is split into its own image.
- **Multi-view beats single-view** for a model that must hold from all sides. A single image gives a mesh faithful
  only from its angle.
- For a hosted multi-view generator, **check which slot takes which view**. A "Left" slot usually means the view
  where the subject faces image-left. Swapped, one body got a second face on its back. Look at a take from behind
  before paying for anything built on it.

## Takes

- **Two or more seeds per view.** Keep them all until the six-side pick.
- **The six-side pick**: render each take in clay from the front, back, both sides, top and below, at the same
  scale. Keep the one that holds in all of them. A take that matches its own view can collapse in the others.
- **Look at each take alone** before assembling. A take of one piece can bring its neighbours' parts (a skull came
  with both rows of teeth and the other jaw's rami). Cut them off.
- **Thin-walled shapes** (a skull's temples, an ear, a hood) can tear: in one case every take of one generator, from
  two references, tore the same way, and another generator's first take was whole. When that happens, try another
  generator before tuning.
- **Open surfaces**: some generators return an open, inward-facing shell. A voxel or level-set pass reads it as
  lace. Thicken it first (a few mm), voxelise, and keep the largest piece.

## Facing

**Read a take's facing off its render beside its reference, once, and store the turn as a constant.** Never guess
it from the shape ("the wider end is up", "what hangs lowest is the front"); that put one piece upside down, then
mirrored, then backwards. From a straight front, side or back view, a generator often keeps the picture's up and
right, with the camera-facing side toward the viewer. Check this per generator. A take from a 3/4 view faces
wherever its angle put it.

## Cleanup

1. Weld the triangle soup (merge by distance at about 0.1–0.2 % of the object's size).
2. Separate loose parts and keep the largest, unless the small ones are meant.
3. **Decimate in steps of at most about 10×.** A take of about a million faces collapsed in one go to a few thousand
   comes out as a torn shell. A piece of many small bones (a foot) holds only above a few thousand faces. The dense
   take stays as the bake's high.
4. Ground it and centre it, then **apply its transforms so the object sits at identity**. Rigging math that mixes
   mesh-local and armature-local coordinates gives garbage when the two objects' transforms differ.

## GPU jobs

- One heavy job at a time, in the background. Queue the next behind the last one's **exit** (a line in its log), not
  behind an output file you expect.
- Kill a stuck job by its process ID, never every Python process: DCC and engine bridge servers are Python too.
- A DCC keeps memory a heavy job loaded (a dense high, bakes) after the job is gone. Before engine tests or an
  import, save and restart it.

## Tool options

Options to check, not endorsements. The licence notes are as reported when this bundle was written: read the
current licence and terms yourself before anything ships.

| role | option | reported licence or terms caveat |
|---|---|---|
| image-to-3D, local | TripoSG | MIT |
| image-to-3D, local | TRELLIS.2 | core decoder parts reported MIT; its export path's renderer (nvdiffrast) is NVIDIA non-commercial and its bundled background remover (RMBG-2.0) is CC BY-NC. Use only the raw decoded mesh, and key the backdrop yourself |
| image-to-3D, local | TRELLIS (first version) | its shape and bake path rely on NVIDIA non-commercial components |
| image-to-3D, local | Hunyuan3D-2 | its licence excludes some territories (reported: the EU); check where you and your players are |
| image-to-3D, hosted, multi-view, quad retopology | Tripo | commercial rights reported to depend on the plan: output made on a free tier may not ship. Its auto-rig and AI animation were not better than anatomy weights in one test, and the animation flipped a crouched rest pose |
| background removal | most demo removers (e.g. RMBG-2.0) | often non-commercial; key on a flat colour instead |
| template topology for bipeds | MakeHuman base mesh | CC0 |
| quad retopology | a quad remesher add-on (e.g. QRemeshify), the generator's own retopology | check each licence |
| UV charting and packing | xatlas | check the licence |
| image generator, hosted | the image tool in a chat assistant or agent CLI | check the terms on commercial use of output |
| image generator, local | FLUX-family and other open-weight models | licences differ per model; some weights are non-commercial |

Before adopting a new tool, record in the plan: its role, its licence, what part of its output ships, and a first
test take beside an existing one.
