# Engine notes

## Blender to any engine

- Hair curves (the Curves object) are the source. Realise procedural nodes into plain curves before export and keep
  the procedural version hidden, so a restyle reruns the generator.
- For a mesh-based engine path: export your own ribbon mesh (two vertices a point, the channels in
  ribbons-and-coverage.md) as FBX or glTF. For a curve-based path (Unreal): export Alembic curves.
- One export per part when parts bind differently; read every export back.

## Unity (URP)

- **Shader:** a custom URP shader with a strand variant: the ribbon layout in the vertex function shared by every
  pass (colour, depth only, depth normals, shadow caster), the width clamp and prefilter, the coverage as the colour
  pass's alpha, a keyword for per-strand tone and silver. It was built as a hand-written shader; whether Shader
  Graph can host the same vertex layout in every pass is untested.
- **Material state:** blended strands in the transparent queue, no depth write; an `AlphaToMask` toggle for the MSAA
  route.
- **Mesh import:** 32-bit index format; keep the import from recalculating normals and tangents (they carry the
  strand's frame); check the polygon order or sort by rank after import.
- **Skinning:** check the project's GPU skinning setting. Rigid parts: a MeshRenderer parented to the bone (no
  skinning cost). Moving parts: SkinnedMeshRenderer weighted to the chain.
- **Anti-aliasing:** SMAA did nothing measurable for one-pixel lines (FXAA untested, expected alike). TAA resolves them, but URP disables TAA on a
  stacked camera (an overlay UI camera in the stack), so held shots would need an unstacked camera. MSAA is set on
  the pipeline asset for every camera and excludes TAA and the temporal upscalers.
- **Gamma vs linear:** check the project's colour space before converting DCC tones (see strand-value.md).
- **Strand packages:** Unity's `com.unity.demoteam.hair` (preview; strands as lines, view-facing strips or tubes;
  Alembic input; physically based hair shading only on HDRP) is a fallback; verify it on your Unity and pipeline
  version before planning on it. Check any third-party package's licence (copyleft code in a closed game is out).

## Unreal Engine

- **Import:** Alembic curves as a **Groom asset**. Put one part per group with `groom_group_id` (per curve), the
  width in `groom_width` (default 1 cm if absent), per-vertex colour in `groom_color` (falls back to black), guides
  flagged with `groom_guide` (else generated from the strands), `groom_root_uv` (else a spherical mapping),
  `groom_id` per curve; the version attributes `groom_version_major` / `groom_version_minor` on the top node. Check
  Epic's current "Alembic for Grooms" specification for scopes and units before writing an exporter.
- **Binding:** a Groom Binding asset to the skeletal mesh; a Groom component attached to it. Bind parts that move
  differently (moustache on the head, beard on the jaw) as separate groups or assets, and check the jaw clips.
- **Rendering:** Unreal draws strands with its own hair renderer; the ribbon, clamp and resolve sections of this
  skill are its job. What stays yours: the groom, the per-strand value (through `groom_color` or the hair
  material's per-strand attributes), the review against the reference, the sweep method for the material.
- **LODs:** strands at the closest LODs, cards and then meshes further out (MetaHuman's specification: facial hair
  strands at LOD 0-1, cards LOD 0-4). Epic's Hair Card Generator builds cards from the groom (one to three cards a
  clump, the clump's own strands projected, single-strand flyaway cards); it was experimental when read.
- **Simulation:** if the groom simulates, guides matter; a beard that rides the jaw may need none.

## Sources

- Epic, "Alembic for Grooms" specification; "Platform support and LOD specifications for MetaHumans"; "Hair Card
  Generator for Grooms"; "Creating Hair Cards and LODs Using Hair Card Generator".
- Unity manual, anti-aliasing in URP; `com.unity.demoteam.hair` README.
