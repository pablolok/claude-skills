---
name: concept-to-asset
description: Use when turning concept art into a game-ready 3D asset (a creature, a character, a prop, worn gear, a body part) — clean per-piece reference images audited against the concept, image-to-3D per view with the take picked from six sides, assembly by cuts and sockets, retopology, UVs with hidden seams, bakes, designed paint, a rig with deformation checks, and export. Blender plus any engine (Unity and Unreal notes).
---

# Concept to asset

Part of the `gamedev-assets` bundle. Matching the result to its concept, round by round, is
`concept-match-loop`. A body's bones, joints and ranges are `anatomy-study`.

The route: **plan the pieces → reference images per piece → shapes per view → assembly → topology, UVs, bakes,
paint → rig and deformation → export → the match loop.** Each step's check passes before the next starts: a defect
found late costs every step built on it.

Tools are named by role (an image generator, an image-to-3D generator, a retopology tool). The current options and
their licence caveats are in [references/image-to-3d.md](references/image-to-3d.md#tool-options). They are options
to check, not endorsements.

## 0. Before the first image

- **Licences first.** For every tool whose output ships (generator, remesher, background remover, base mesh), read
  its current licence and terms before using it: commercial use, territory, and whether output from a free tier may
  ship. Record the tool and licence beside the asset. A shippable shape with a non-commercial texture bake is not
  shippable.
- **Research the method before the first build.** Most asset kinds (foliage, grass, hair, fur, water, fire, cloth,
  chains, armour) have a standard studio technique. Find it first: breakdowns, talks, engine docs, forum threads,
  video tutorials. Write the method with its sources in the plan. Home-made attempts at a solved problem burn rounds;
  after two failures, go back to research, not to a third attempt.
- **Decide how the piece is used.** What it is worn on or joins, what passes through it, which bone carries it, how
  it moves in the clips, rigid (one bone) or soft (blended). Look at the concept's crop of that spot first: an item
  asked for by its type name ("a pauldron", "sandals") comes back as the generic type, not as the concept's.
- **The moves come first, then the piece plan.** List the clips (for a boss, its fight design and scenes). Every
  part a move acts on, throws or swings is its own piece. Then write the piece plan: every piece, its bone, rigid or
  skinned, the clips that move it, where it is cut, its socket. Agree it with the art owner. The prompts follow
  from it. See [references/bodies.md](references/bodies.md) §1.
- **What you can make, make.** A shape that is easier built procedurally than generated (rocks, walls, straps wound
  on a limb, a chain's links, a joint's two bone ends, a plate over a joint, a helmet drawn as primitives) is built
  in code from the concept's measures. No generator, no licence to read, and its numbers stay editable.
- **Fill a designed part by layout, not by randomness.** Inside a standard-technique asset, a designed part (a
  moustache, a fringe, a row of rivets) is laid out ordered and mirrored from the reference; random or procedural
  placement only for the masses. Read its coverage and edge angle off the reference on the model's own landmarks.

## 1. Reference images, per piece, audited

[references/reference-images.md](references/reference-images.md) has the prompts, sheet layouts, turn grids and
failure cases.
- **One clean reference per piece of the piece plan**, from an image generator with the **concept's own crops
  attached first**, then the prompt. Name the subject's distinctive features in words. Without them, the generator
  draws the generic animal or object.
- **A body piece: a turnaround** (front, side, 3/4, back in one row), same scale, orthographic, flat light, no
  shadow, no text. Each view in its own cell with a wide empty gap. The pieces it carries are drawn as short stubs
  cut flat; they become the sockets.
- **A prop: one object, a 3/4 view**, plain mid-grey background, flat light, no shadow, "only the object", bare of
  plants or moss (as geometry they come out as shards; colour only).
- **Audit every view against the concept crops before generating**: what it added, what it lost, its proportions
  as numbers (width ÷ height of the piece against the concept's), and its orientation. Write the differences down;
  fix them in the prompt or plan a cut in 3D. A generated image is never assumed right.
- **Views never touch.** Split the sheet and check no silhouette's box reaches its neighbour's. A sheet that fails
  is generated again, never kept.

## 2. Shapes: image-to-3D per view, the take picked from six sides

[references/image-to-3d.md](references/image-to-3d.md) has the input keying, the seeds, the facing, decimation and
the tool table.
- **Key the background yourself** on a flat colour; look at the keyed RGBA before generating. A shadow or an opaque
  gap becomes a slab. Most demos' background removers carry their own (often non-commercial) licence.
- **Generate from each view** of the piece, with two or more seeds.
- **Pick the take by rendering it from six sides in clay** (front, back, both sides, top, below). A take that matches
  its own view can collapse in the others. Look at each take alone: a take of one piece can bring its neighbours'
  parts (a skull with both rows of teeth and the other jaw). Cut what isn't the piece before assembling.
- **A skinned body** (one skin that bends): check a multi-view generator fed the concept's own front, side and back
  crops. On one body this beat every turnaround and every local single-view route. A generator copies the
  proportions it is given, so give it the concept, not a redrawn turnaround, unless that turnaround is audited.
- **Never hand-shape a take toward views it wasn't made from.** A new source beats more tuning: a new reference, or
  the other generator when every take of one tears the same way.

## 3. Assembly by cuts and sockets

[references/bodies.md](references/bodies.md) §2–3.
- **Measure every piece on the concept before setting a number**: count, where it leaves the body, length, base
  width, angle, how it joins. Store each as a named constant with how it was measured.
- **Measure each take in its own space before any join**: domes, a socket's cut end (centre, axis, radius),
  cavities.
- **Cut, don't fuse.** Cut off what a piece brought that isn't it, along its groove; cut the neighbour on the same
  plane. Scale a piece **whole** to the concept's proportion, never per axis: round features go oval.
- **Socketed pieces** leave their parent along the socket's axis, as wide as it, the base sunk inside, the exit
  tucked into a soft cuff. Move a part off its socket only when **every** concept view agrees.
- **A build recipe per body**: one script that rebuilds, bakes, paints and dresses it from the takes and the
  constants. A fix is a constant changed and a rebuild, never a hand edit of the result.

## 4. Topology, UVs, bakes, paint

[references/surface.md](references/surface.md).
- **Retopology** that can bend and ships: count the triangles against the class's LOD0 budget the moment a mesh is
  adopted. For a biped that animates, check a template topology (a base mesh with loops at the joints) carried onto
  the take rather than a remesher's output; generated retopo rarely puts loops at joints.
- **UVs with hidden seams**: seams where the player doesn't look (weighted by how much the game camera and the
  concept's views see each edge). Check a generator's own UVs before keeping any; they are usually fragmented.
- **Bakes**: normal and AO from the dense high onto the low, every piece of the low with a high. Check the bake texel
  by texel (missed rays, flipped or jumped normals, seams) and fix only the real faults.
- **Paint is designed, not generated**: values first (occlusion, layers, a light-to-dark grade, per-panel value),
  then colour through a ramp measured on the concept's own pixels. Every material sets its roughness and metallic
  explicitly: at the DCC's default, leather reads as plastic.

## 5. Rig and deformation

[references/rig-deformation.md](references/rig-deformation.md).
- **Rigid pieces 100 % one bone.** Soft parts are weighted by anatomy (nearest bone capsule, fold planes), never by
  the DCC's automatic heat weights on a generated mesh.
- **Joints in the middle of their mass at the crease**, checked from three views, each side measured on its own
  (generated bodies are not symmetric); each limb bone rolled to its hinge.
- **Test deformation before finishing the body**, and after every change: isolation (one pose per joint, nothing
  far from it moves), bend rows (stretch, crossings, volume) judged by eye, clips inside the measured ranges, a
  stretch gate on every clip.
- **Review sheet before any clip**: joints as dots beside the concept, weight heat maps, bend rows. The art owner
  reviews the rig before animation is built on it.

## 6. Worn gear and garments

[references/garments.md](references/garments.md). Gear is its own asset on a bare base body. Size a worn piece by
the concept's own piece (its width on the same-scale crop), never by the body under it. Centre it by its symmetric
part (a helmet's dome), never its whole box. A fit search is scored by the concept's measures, with clearance only
reported.

## 7. Export

[references/export.md](references/export.md): FBX settings, axes, textures outside the FBX, engine import (Unity,
Unreal), correctives as blend shapes, and the DCC facts the scripts depend on.

## 8. Verify before showing

- **Against the concept first**: run `concept-match-loop`. Technical checks never stand in for it, and neither does
  one channel. A garment's shape can match while its paint, its gloss or a made band beside it is what a reviewer
  sees.
- **Each piece alone, front view, at rest and in the stance**: a piece on the wrong side, floating, or cut short
  shows only that way.
- **Quality bar**: closed, welded mesh (no open edges but intended ones); quads or a decimated budget; normal and AO
  baked; no UV seam visible in a close-up; a roughness map; emission where the concept glows; a texture size by the
  asset's class (hero bodies larger than props).
- **In the engine**: the game camera, a close-up, the level's light; console clean, the engine's tests green; the
  reference, the mesh, the textures and the spec committed together; DCC work files backed up.

## Open

- Ship reference scripts for the checks described here (six-side take renders, view-gap check, bake fault map,
  deformation gate, isolation test). The method was built on project scripts that are not in this bundle.
- Prop and environment routes (rocks, foliage, modular kits) are only sketched; a contributor with that pipeline
  should write them.
- Unreal import notes beyond what the sources back: skeleton import options, morph target import, material setup.
- The tool table ages fast. Re-check each licence and add new local generators as they appear.
- Hair and fur: only one groom has been taken through this route (see the surface reference). A full method is
  open.
