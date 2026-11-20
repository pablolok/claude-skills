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
- **That package on HDRP, tried once** (a short head-hair crop, about 140k strands, then 200k with an under-coat, in
  a separate HDRP project): the physical hair shading and the line renderer are HDRP-only (on URP it draws strands
  through a Lit graph); the editor version matters (in one trial one version worked with warnings, others rendered
  nothing or did not compile: pin the package and the editor); it ships only a debug material, so a hair
  graph and colour tuned per renderer are yours; it is unsupported, so its fixes are yours too.
  - **Binding:** attaching roots to a skinned mesh needs a further package; parented to the head bone, the zones on
    the head followed it within a micron while the nape's fade roots, on neck-driven skin, missed it by up to
    0.46 mm. A managed script that wrote the roots onto the skinned skin each frame cost about 11.7 ms per frame; a
    compiled version was written and never run.
  - **Cost** (1080p, face close shot, TAA, a high-end desktop GPU; indicative: the GPU was sometimes busy and no clean
    measurement was made): head alone about 2.1 ms a frame; with the strands about 6.2-7.7 ms (140k) and 7.1-9.2 ms
    (200k) depending on the shadow casters; the camera's GPU time +4.3 to +4.9 ms; the under-coat alone about +1.2 ms.
  - **Why it was set aside:** cards made from the same groom were chosen as the game version to save resources
    (`groom-cards`), the strands kept as the look reference. What the strand route would still have needed: a few ms
    of GPU per close shot, the whole game on HDRP, an unsupported package to maintain, a skin binding, a hair
    material, and a clean cost measurement (none was made).

## Unreal Engine

- **Import:** Alembic curves as a **Groom asset**. Put one part per group with `groom_group_id` (per curve), the
  width in `groom_width` (default 1 cm if absent), per-vertex colour in `groom_color` (falls back to black), guides
  flagged with `groom_guide` (else generated from the strands), `groom_root_uv` (else a spherical mapping),
  `groom_id` per curve; the version attributes `groom_version_major` / `groom_version_minor` on the top node. Check
  Epic's current "Alembic for Grooms" specification for scopes and units before writing an exporter.
- **Width, checked once** (one Unreal 5 version, a short crop): a per-point width attribute is read as centimetres.
  An exporter whose convention was another unit (radius over 30 microns) would have drawn strands about 2.8 cm thick
  (computed from the stored settings and the files, not seen in a render). Set each group's width override to twice
  its largest point radius with root and tip scale 1, so every point keeps its own radius (quantised to 6 bits: 1-3 %
  under at the tips); a tip scale under 1 on widths that already taper tapers twice.
- **Saving from Python:** setting a Groom's group arrays from Python changed them in memory but left the package
  clean, so a save-if-dirty call skipped them (the inferred cause; render and physics settings were lost). Save
  unconditionally, raise on a failed save, and read the settings back in a fresh editor.
- **Counts:** Unreal adds an ending vertex per curve (about 10 % past the tip): vertices = points + curves. Short
  zones are best written with their own points (`strand-groom` references/short-cut-and-fade.md).
- **Axes:** a Blender (Z up, -Y forward, metres) export imported with rotation (90, 0, 0) and scale (1, -1, 1); keep
  the same conversion for everything made from the groom, cards included.
- **Binding:** a Groom Binding asset to the skeletal mesh; a Groom component attached to it. Bind parts that move
  differently (moustache on the head, beard on the jaw) as separate groups or assets, and check the jaw clips.
- **Rendering:** Unreal draws strands with its own hair renderer; the ribbon, clamp and resolve sections of this
  skill are its job. What stays yours: the groom, the per-strand value (through `groom_color` or the hair
  material's per-strand attributes), the review against the reference, the sweep method for the material.
- **Look against an offline render** (one case: a dark-brown crop against its Cycles render, same views and lights):
  - the hair shading read the same base colour 1.35-2x lighter per channel than Cycles' hair shader; the default
    Specular (0.5) doubles the white primary lobe into a whitish sheen. Values that matched within 1-9 % at the side
    and crown (a nape close-up stayed 18-26 % lighter from a local sheen on lock tips): base colour (linear) about
    0.037 / 0.018 / 0.011, Specular 0.08, roughness 0.70-0.85 by the strand's seed;
  - a fringe close above the forehead cast a near-black, speckled band (the voxel shadow at the default density). The
    renderer setting `r.HairStrands.Voxelization.DensityScale.Shadow=0.25` in the project's config made it a soft
    shadow and kept the self-shadowing; voxelization off removed the band and all self-shadowing (flat, light hair).
    Constant jitter, a finer voxel size or a lower global density did not (turning deep shadows off on the lights
    was never picked up by the render, so it is untested);
  - overrides set on the groom component from Python (stable rasterization, deep shadow on lights) were not picked
    up by an offscreen render; material overrides and console variables were;
  - capture with a long lens from far away rather than a true orthographic camera, which drew the strands sparse.
- **LODs:** strands at the closest LODs, cards and then meshes further out (MetaHuman's specification: facial hair
  strands at LOD 0-1, cards LOD 0-4). Epic's Hair Card Generator builds cards from the groom (one to three cards a
  clump, the clump's own strands projected, single-strand flyaway cards); it was experimental when read. Run once on
  a short crop, its output and the settings that mattered are in `groom-cards` (references/card-generator.md).
- **Simulation:** if the groom simulates, guides matter; a beard that rides the jaw may need none. A short crop
  (strands up to 4.5 cm) was kept static in every zone; simulate only long locks.
- **Binding and simulation were not tested on the short crop** (imported, configured and rendered only): the notes
  above on binding are still the documentation's, not experience. Check this.

## Sources

- Epic, "Alembic for Grooms" specification; "Platform support and LOD specifications for MetaHumans"; "Hair Card
  Generator for Grooms"; "Creating Hair Cards and LODs Using Hair Card Generator".
- Unity manual, anti-aliasing in URP; `com.unity.demoteam.hair` README.
