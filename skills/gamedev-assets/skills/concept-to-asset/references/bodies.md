# Bodies: pieces planned from the animations, generated, assembled

Part of `concept-to-asset` §0 and §3. For any creature, character, mount or boss. Numbers in parentheses are from
single assets: examples to start from, not rules.

## 1. The piece plan: from the animations, before any image

What a body will do decides what it is made of. Write a table from the clip list (ask for it when it isn't written):

| clip | what moves on its own | how |
|---|---|---|
| walk, run | each leg; the trunk's wave | legs rigid or skinned on their bones; trunk skinned, a joint at each fold |
| attack, bite | jaws, head, weapon | jaws rigid on their own bones; the head rigid to its rim |
| idle: breathe, chew, look, blink | segments, mouthparts, eyes, lids | each a rigid piece on its bone |
| hit, death | the whole chain | joints within their range; pieces that break off on death are separate |
| gear, mutations | what is swapped or added | its own piece with a socket on the body |

Then classify every part:
- **Rigid** (moves as one: a limb segment, a jaw, a claw, a plate, an eye, a lid): its own piece, its own bone, its
  own reference or procedural build, its pivot where it meets its parent, and a **socket** left on the parent (a
  short flat-cut stub that says where and along which axis it leaves).
- **Soft** (bends: a trunk, a neck, a tail): skinned, with its joints at the folds the clips bend and edge loops at
  those folds.
- **Swappable** (gear, mutations): its own piece on a socket, never fused.
- **Hanging hardware** (keys on a belt, a chain, a lantern): split at every joint it swings on, as a chain of
  pivots (strap → ring → key), each its own piece and bone.
- **Repeated parts** (chain links, rings, rivets, strap loops): one generated or modelled, repeated by code along a
  curve, so the length is a number.
- A part that moves in no clip stays in its parent's piece.

Pieces decided late cost a re-seating round each. Write the plan before the first reference prompt.

## 2. Build

1. **Measure every piece on the concept first**: a same-scale crop of each view, scaled by a known length. Per part
   record its count in every view, where it leaves the body, its length, base width, angle, and how it joins (a
   cuff, a socket under a rim). Parts guessed and tuned by eye took several rebuilds; parts measured were right the
   first time.
2. **Generate each piece** from each of its views and pick the take from six sides ([image-to-3d.md](image-to-3d.md)).
3. **Measure the take's own features in its own space, before any join**: domes (fit a sphere on the take itself, not
   on a fused skin where grooves drag the fit), sockets (a stub's cut end: centre; axis = area-weighted normal of its
   flat faces; radius just behind it), knobs the generator made out of painted marks, carved cavities (cut sections).
4. **Assemble by cuts**:
   - cut off what a piece brought that isn't it, along its groove, leaning as it leans;
   - cut the neighbour on the same plane;
   - scale the piece **whole** to the concept's proportion, never per axis;
   - narrow the neighbour's end to meet a smaller piece;
   - plug it in, carrying its measured points with its transform;
   - fill a cavity the generator stuffed with things (a mouth full of small teeth) as a whole region;
   - join, voxel-merge if needed, and symmetrise only where the body is meant to be symmetric.
   A take's extra stub is covered by the piece that replaces it: smoothing barely moves it, and deleting leaves a hole.
5. **Rigid pieces on sockets**: the base along the socket's axis, as wide as it, sunk inside the body, the exit tucked
   back from the stub's end. Free pieces by root, tip, bend and girth; the girth scales with the length, so re-check it
   when a length changes.
6. **Joints**: every rigid piece that bends at its base grows from a soft cuff. Straight out of the skin, a piece
   reads stuck on. Size the cuff by its kind, times the exit radius; keep neighbouring cuffs apart.
7. **Face**: eyes on the measured domes, standing slightly proud; thin lids (the rim at about 1.05× the ball); the
   mouth where the concept opens it, with an inside (a mouth bag) if it ever opens.
8. **Nothing below the floor.**
9. **Store every measured position relative to what moves it** (a height over the body's lift, not an absolute
   height). Lowering the body otherwise leaves the measured points where the parts used to be.
10. **The build stores what only it knows on the body**: each piece's pivot and tip, its cuff's exit and girth, a
    per-vertex mark of which piece each vertex belongs to. Never read them back off the weights: after one rig, a
    cuff's weights are more its piece's than its own. The rig then runs from the saved file.

## 3. A body of rigid pieces (a skeleton, an armour golem)

- **The joints come from the concept, not from a shared rig.** A shared rig keeps its bone names and clips, but move
  every joint onto the one measured on the concept's sheet, and take each bone's thickness from it too. Built on a
  generic human's proportions, one skeleton read badly; its silhouette IoU nearly doubled once its joints were the
  concept's.
- **One take per bone**, measured in its own space (its ends, the feature that sets its roll), laid end to end on its
  bone, a little past each joint.
- **Check whether each joint's two ends must be made, not taken.** On one skeleton no generated joint end mated
  (lobes sunk into a plateau, a hollow stump, two flat caps meeting), and all of them were made. In order:
  1. **Measure the joint's motion first**: the child's turns on its parent over every clip, split into the turn about
     the rig's axis and the rest. A remainder of more than a few degrees means the rig is wrong for the anatomy: give
     each anatomical joint its own bone (an ankle hinge plus a subtalar bone) and put its axis where the anatomy does
     (`anatomy-study`).
  2. **After a rig change, rebuild from the recipe**; never patch the saved body.
  3. **Make each end to anatomy on its axis**: the rolling surface a solid of revolution about the hinge, what rides
     the joint (a kneecap) moulded on it, each end lofted from its measured shaft. Carve the other bone by it swept
     through that joint's own turns, each side separately.
  4. **Prove it**: clearance over every clip (nothing inside, the gap kept), then cut sections through the joint and
     look at them. Sections show a flat ceiling over a dome or a slot that renders hide.
- **Every vertex 100 % one bone.** Where one take carries several bones (a hand, a foot), cut it at its own joints,
  measured on the dense take (each digit's joints at the dips of its cross-section along its own line), close each
  piece with a rounded cap, and only then decimate. Cut along a borrowed rig's joints instead, every bend breaks a
  bone mid-length.
- **Paint the joined body on its own unwrap.** The takes' UVs all cover the same square and overwrite each other.
  Drop them, recalculate normals outward, unwrap in big islands, and merge one-to-three-face islands into a neighbour.
- A body that breaks apart on death: never cut away what gear hides; each piece will be seen alone.

## 4. A skinned body (one skin that bends)

- **Shape**: check a multi-view generator fed the concept's own front, side and back crops, each square, neighbours
  masked. A generator copies the proportions it is given.
- **Topology for a biped that animates comes from a template, not from the generator.** Generated retopology and
  remeshers rarely put loops at joints, and they glue fingers together. Rings patched in afterwards zip on with
  triangles. The route that worked once:
  1. Take a template base mesh with clean joint loops (a CC0 human base mesh).
  2. Carry it onto the take by its bones; hands by their landmarks, the fingers posed, never surface-fitted onto glued
     fingers.
  3. Lay it on a smoothed copy of the take, holding landmarks and feature curves.
  4. Cut what hangs off the skin (torn cloth, a beard) into its own pieces first.
  5. Bring it to budget by removing whole rings.
  The take stays as the shape's reference and the normal map's source. On that body the template halved the stretch
  in every fight pose and kept the fingers whole at 90°. Check this route on your own body; a non-biped may keep a
  generator's quad retopology.
- **Where the template's part differs in kind from the take's, give the template a target it can fit.** Toes touching
  side by side are cut along their grooves and given made side walls. A take's closed mouth has no inside: the inner
  lip and the mouth bag are made.
- **Then UVs, rig, bake and paint** ([surface.md](surface.md), [rig-deformation.md](rig-deformation.md)).

## 5. Parts with known anatomy

- **A part with known anatomy is prompted as anatomy**: name the structures (a foot: the heel pitched, the arch, a
  big toe of two thick phalanges, the lesser toes of three lying close). Then measure the take against real numbers
  before using it: shape from anatomy, size from the concept. A cartoon foot (flat, toes fanned like fingers) is
  spotted at once.
- **Once assembled, walk the species' checklist** item by item on the renders (`anatomy-study`). One missing kneecap
  was found only when a knee plate floated over the gap.
