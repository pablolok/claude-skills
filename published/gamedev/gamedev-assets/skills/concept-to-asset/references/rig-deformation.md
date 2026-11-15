# Rig and deformation

Part of `concept-to-asset` §5. Where joints are and how far they bend: `anatomy-study`. The thresholds below are
starting values from a few bodies; calibrate them on yours.

Do these in order. Each step's check passes before the next. The first rig a reviewer sees has passed all of them:
one body passed its numeric gate cleanly and the reviewer still found a dozen defects in its review sheet.

## 1. A mesh that can bend

Count its triangles against the budget and its loops at each joint (see [surface.md](surface.md)). Limbs are
separate, with loops at the joints.

## 2. A rig built like the body

- **The root inside the body** (the pelvis or the centre of mass), never at the nose. Limbs pivot at their real joint.
- **Keep the armature and the mesh objects at identity transforms.** Set rest positions by script with explicit
  coordinates, never by dragging. If bones drive the wrong region, compare the two objects' world matrices first.
- **Measure each side on its own.** Generated bodies are never symmetric: mirrored, one body's wrist and finger bones
  lay several centimetres off the other side's own parts.
- **A joint sits in the middle of its mass at its crease level, checked from three views**: along the hinge, at its
  front, and along the bend's bisector. One view fixes only two coordinates; a section averaged along the limb put a
  knee at its crease corner, several centimetres low. A lean toward the anatomy's side is a stated fraction of the
  joint's radius (start from elbow 0.25 back, knee 0.15 into the fold).
- **Roll each limb bone to its hinge** (X = the axis of its own bend; a finger's = its direction × the palm's normal)
  before any bend test. A default roll was 17–76° off on one body, and every test bent the joints partly sideways.
- **A hand**: the hand bone from the wrist's centre to the middle finger's knuckle. Each knuckle sits back in the palm,
  not at the web. Three bones per finger, the thumb from its base joint near the wrist.
- **Reason from the body's own skeleton.** A clip borrowed from another body is judged against it: does each joint it
  bends exist here, bend that way, that far.

## 3. Weights by anatomy

- **Rigid pieces 100 % their bone**, past a narrow ring at the base. Soft or blended weights stretch an appendage that
  should keep its shape.
- **Don't trust the DCC's automatic heat weights on generated meshes.** They can fail outright on non-manifold meshes,
  or drag far regions (a raised arm moved one body's neck by several centimetres).
- **A skinned limb**: each vertex goes to its nearest **capsule** (the bone segment plus the body's radius there; by the
  bare line, the side of a wide chest goes to the arm). Each chain bends at its fold planes; a limb blends into the
  trunk only at its root. The trunk blends across each joint's fold plane. Smooth the weights on the welded mesh; at
  most 4 influences, normalised.
- **Radii may narrow along a bone** (a chest wide at the ribs, narrow at the neck). As one number, a capsule's end
  swallowed a face.
- **Fold bands scale with the joint's radius.** A fixed width pinched one knee and gave a buttock's fold to the shin.
- **Hinges**: the bend's outside rounds the corner (a half-turning helper bone for the kneecap or elbow point); the
  inside goes from parent to child into a crease.
- **Digits are weighted along their own line**, never by nearest capsule. A wide hand capsule kept centimetres of
  every finger, and a knuckle turn sheared it.
- **What must not bend** (spikes, strands, hanging strips) takes its base ring's weights, and the gate judges it by its
  base.

## 4. Test before finishing the body

Test the weights on a rough skin, before paint, and again after every change to the body or the rig.
- **Isolation**: one pose per joint. Vertices outside the posed chain (selected by their shape, never by their
  weights), farther than about 8 % of body height from the joint, moving more than about 0.5 % of it, is a defect.
  0 is the bar. What it found once: a long part with no bone of its own (fingers past the hand bone) was nearer
  another limb; a neck hung forward is a chain off the chest, like a limb.
- **Bend rows**: each joint at about +30°, +60° and −20° about its true hinge ("+" closes the joint). Read the stretch,
  the section kept, and the crossings.
  - **Judge every row by eye**, with an independent judge told what is not natural (`concept-match-loop`, judge). A
    row past the stretch limit is a defect until a look says otherwise, never waved off as crease micro-edges.
  - **Sort crossings, don't just count them.** The fold's own two masses pressed together on its concave side are
    contact (a crease). Anything else a camera sees, and any back face it sees, is breakage.
  - Test "seen" with a ray from the camera to a face's centre, never to a vertex: on the silhouette a vertex's ray
    meets its own fan.
  - **Split stretch by who sees it**: an edge past the limit is breakage when a camera of the clips sees it (the game
    camera at every yaw the body can face, and each cutscene shot). Count the hidden ones apart; never drop them. Never
    use the inspection views for this: one inside the fold sees its floor at every angle.
- **Turn the bend rows into each joint's clean range**, and keep the clips inside it. A joint buried in the body (a hip
  in the rump) is read by the gate's measure, not by a section: the cutting plane opens pieces of skin.
- **A fix that makes a row's numbers clean is judged before it is kept.** One slide-corrective that cleaned a fold's
  stretch pulled the fold's hidden floor into view as a flat membrane. A blind A/B judge preferred it off.

## 5. Correctives (after good weights)

- Make the fix on the **posed** skin and carry it to the rest pose through each vertex's inverted skinning matrix
  (exact for linear blend skinning; turn the armature's volume preservation off). Keep it as a shape key driven by its
  bone's swing about one axis, from a start angle to the build angle.
- Useful posed fixes: push out of another part's surface by a margin; flatten two soft parts pressed together onto
  the plane between them; spread a stretch along the skin; delta-mush smoothing with the sculpted detail laid back.
- Judge correctives blind, off against on. Correctives tuned to a crossing count can read worse than none.
- **Unity has no pose-space driver**: sample each driven key per frame into a blend-shape curve in every clip at
  export, and prove it with a round trip. Unreal: see export.md.

## 6. Clips

- **Clips within the joints' ranges**, measured, never chosen by eye. After every bake, report each joint's bend per
  frame against its free range, and for a foot on the ground, its loaded range (a planted ankle bends further).
- **The gate** on every clip before export: FAIL past about 0.2 % of the edges stretched over 1.5× or squashed under
  0.4× by a visible change, or one fair-sized edge past a hard limit (about 1.6× the stretch limit).
- **Gear against bones**: per clip, the worst frame where a bone passes through worn gear. Confirm an inside point by
  ray parity, because generated takes have inward faces that fake insides.
- **Single-bone legs can't plant a foot**: a one-bone leg swings the foot on an arc. A planted gait needs a multi-bone
  leg with IK, which bends the geometry. Surface that trade-off; don't grind toward "rigid and planted".
- **Loops**: build motion from periodic functions so value *and* velocity match at the seam.
- **A bone swung about a world axis** (a leg forward and back): conjugate the world rotation into the bone's local
  space, or aim the bone at a target point. Rotating its local X often reads as vertical.
- **Motion is judged moving**: render clips as MP4 frame sequences, or have a person watch playback live and direct in
  plain words while you edit the curves. Still frames hide pops and slides.
