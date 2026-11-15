# Topology, LODs, UVs, bakes, paint

Part of `concept-to-asset` §4.

## Retopology

- **Count against the budget the moment a mesh is adopted**: its triangles against its class's LOD0 limit. Bring
  it under before UVs, rig and bake are built on it. One body carried all three on a mesh nobody had counted, and
  every step was redone.
- **Count the loops at each joint before rigging.** A generated retopology's fingers had sparse loops about twice
  their radius apart and none on a joint, which caps how well they can curl. Loops added after the UVs mean redoing
  the UVs, the bake and the rig.
- **Smooth pieces get quads; pieces with teeth or serrations get decimation.** Quads round off serrations: jaws read
  as legs.
- **A take carved in flat panels**: round it first with plain Laplacian passes. Taubin smoothing keeps the panels,
  and thin cones shrink under it.
- **Refine where a detail is finer than the quads**: round an eye, faces about a centimetre wide dip into the ball
  between their corners.
- **Make each rigid piece's game mesh once** from its take, and place its copies by their highs' transforms.

## LODs

- **The budget decides the shape, the high the map.** At the same budget, a denser source changes nothing. Measure
  each low against its high (silhouette IoU and surface distance) before moving triangles around. Plot a few budgets,
  then check the joints' clearance on the rebuilt low. Keep a small margin under the limit: the collapse overshoots.
- **Small islands** (rivets) can be dropped and baked into the normal map. A part the LOD must keep (a helmet's nose
  guard) is joined to a big island, or a small-island filter takes it for a rivet.
- **Check thin plates before decimating them**: on one body they tore, so only bones were decimated. Fill holes
  before decimating. When a collapse sticks on non-manifold edges, collapse
  again from a voxel-closed copy of the piece, never from the stuck low.
- **A skinned body's LOD keeps its UVs and weights.** Collapse with the UV seams locked (a free seam split the islands
  further), and the joints' creases and knuckles locked too. Resample every moved vertex's UV, weights and point data
  from the source surface inside its own UV island. A collapse's edge-interpolated weights leaked a neck share onto a
  shoulder. Fix UV flips the collapse made (it checks 3D only). Run the deformation gate on the result.

## UVs with hidden seams

- **Seams where the player doesn't look.** Give each edge a cost: its length times how much the game camera and the
  concept's views see it. Route seams of least cost: a ring cuts a part off at a joint, a cut opens each piece flat,
  cuts run to the tips. Unwrap angle-based, with minimum stretch where it folds (spikes, fangs).
- **Check a generator's own UVs before keeping them**: one take came with thousands of islands, and they were
  replaced.
- **Decimated meshes** chart badly with smart projection (thousands of islands, most of the atlas lost to margins).
  Use a charting packer (e.g. xatlas).
- **Report** islands, atlas use, distortion, texel density per part, and the seams the cameras see. Make a review
  sheet (seams in red, a checker, the layout) for the art owner.
- **Rigid pieces**: unwrap at a high angle limit (about 89°), pack into one atlas.

## Bakes

- **Every piece of the low needs a high.** A built piece bakes from a copy of itself; without one it bakes black.
- **Bake the normal map with the pieces exploded apart** (a face turned to a neighbour bakes the neighbour). Bake the
  AO from the assembled body.
- **Check the bake texel by texel**, then fix only the real faults:
  - coverage: the texels each UV island owns, named by part;
  - missed rays: bake a hit map through the same rays (the high emitting a constant);
  - normals tilted far from the low's (start at about 60°), or turned far from most neighbours (about 45°);
  - **face seams**: the map turning along a whole low face's border, because neighbouring faces' rays met different
    layers (strands over skin). No per-texel test sees these.
  - Fit a cage where rays miss, grown per vertex toward the high and capped. Keep the run with the fewest real faults.
  - Fill the real faults and margins by pull-push. A 60–90° tilt is often true relief; leave it.
- **Grazing hits**: steep texels beside flat ones inside one island, where the low bridges a hollow of the high (under
  a jaw). A plain rebake repeats them. Give that band its own pass with its tilt clamped.
- **A rest pose that moved vertices off the high** (arms opened after the take) bakes on a twin at the high's
  placement: the same faces, corners and UVs.
- **A skinned body's AO** is baked at rest with the armature off, lifted to a floor (soft, never black), and its
  gutters filled.
- **Pieces drawn through their own UVs over the whole square** (an eye's glow, a mouth bag) join the low **after** the
  atlas bakes. Baked with it, their occlusion darkens the atlas.
- **Find a bake's source by a property it carries, never by its name.** A DCC suffixes taken names (`.001`), and a
  name lookup can silently fall back to the wrong object.

## Shadow pass

- A real-time shadow comes from the low's geometry, never the normal map. A faceted flap's shadow shard is a mesh fix.
- Right after the bake: render the low with its normal map under the level's shadow-casting lights, from the game's
  camera, with shadows on and off side by side.
- Dark jagged shards in a clay close-up are first suspected to be the key light's cast shadows of a coarse low's facets.
  Render without cast shadows before blaming the mesh.

## Paint

- **Paint is designed, not generated.** This route doesn't ship a generator's texture: those tend to carry baked-in
  light and a licence of their own, and an owned paint can be edited. A generated texture may be used as a
  comparison, with its baked-in light divided out.
- **Values first, then colour**: occlusion, layers under the front ones darker, a grade along the hang (lighter at the
  top than the hem), a value per panel, broad mottling, rims along tears and edges. Then colour through a ramp
  measured on the concept's own pixels. A tiled texture tinted to the concept's mean colour is one value of noise
  beside a painting.
- **A body**: painted per texel by regions (each region over the base by its share, in order), with noise that is
  continuous across UV seams (3D noise, cellular cracks) and roughness from the same regions (cavities wetter).
- **A prop or gear**: layered materials, baked. Seamless textures in the concept's style, projected box-wise, mixed
  by masks, baked to colour and normal. A part the concept paints apart (a plate's rim, rivets) is a layer over a
  point attribute, marked where it is built or found as what stands out of the piece's own smoothed surface.
- **Straps and bands** are painted along a trim sheet (UVs laying each strip along it). A painterly style has no
  edges to draw on smooth ribbons.
- **Set roughness and metallic on every material.** At the DCC's default, leather reads as plastic. Read gloss off
  the concept (`concept-match-loop`, metrics); set the final values in the engine.
- **Lines the concept draws** (cracks, scars) are taken off its pixels as a mask per view (hue window, darker than the
  local blurred skin), traced into lines, and projected onto the texels through the views' cameras. A generated crack
  network reads as scribbles.
- **Paint a piece alone in the render.** A cavity or occlusion pass finds every visible object: one body repainted
  while dressed came out darker under its gear.
- **A piece replaced in a painted family is painted with its family**, joined and painted whole. Painted alone its
  colour parts from the rest.
- **A narrow crevice the mesh doesn't have** (teeth fused into a band) no occlusion finds: that is geometry.
- **The albedo's value and the gloss are set in the engine**: the concept's pixels are lit, so a palette measured on
  them gives the hue and the ramps, not the albedo value. A body painted at the concept's lit L* read pale under the
  level's fill.

## Hair and fur (one case; check before relying on it)

- Check the studio method first: strands for a close shot, cards for the play camera.
- In one case, realistic facial hair framed by a close shot needed strands (camera-facing ribbons from a groom) on a
  close-shot renderer, with a resolver so sub-pixel strands don't sparkle in motion. Cards were enough where the play
  camera shows the head at about 100 px.
- Realistic cards need thousands of lock-width cards; fewer, wider ones read as shingles.
- A realistic groom by professional technique can beat a stroke-for-stroke match of a stylised concept. Agree which
  reference is in force first.
