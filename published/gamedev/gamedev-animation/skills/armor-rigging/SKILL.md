---
name: armor-rigging
description: Rig plate armour the way games do — rigid plates, one bone each; joint caps (couter, poleyn) and pauldrons on helper bones that turn part of the way; overlaps and a mail under-layer at every joint; cloth left soft; joint limits as a bake profile, not custom clips; a range-of-motion proof in numbers. Use for any armour of rigid pieces (plate, pauldrons, greaves), after gear-fitting has fitted the outfit and before export.
---

# Armour rigging — pieces, not a sleeve

A plate outfit skinned like skin bends like cloth: its pauldrons and cuisses stretch in every blow. Plate armour is
separate rigid pieces, and it is rigged as pieces. Fit the outfit's soft parts first (`gear-fitting` skill), then
rig the plates with this skill, then export.

## 1. How real plate moves (what to reproduce)

- A suit is **separate rigid plates, one per segment**:
  - arm: pauldron (shoulder), rerebrace (upper arm), couter (elbow), vambrace (forearm), gauntlet;
  - trunk: breastplate and backplate, fauld and tassets (hips);
  - leg: cuisse (thigh), poleyn (knee), greave (shin), sabaton.
- At the joints the plates **overlap and slide** (lames on sliding rivets, leathers). The couter and poleyn sit
  **between** the two segments.
- Under the plates is **mail or a padded jack**, and that is what shows where plates part: never skin, never the void.
- The pauldron is strapped to the arm and articulated to the shoulder. It rises **part** of the way with the arm,
  not all of it; all the way and it goes into the neck and the helmet.
- Real couters and poleyns cover the OUTSIDE of the joint only. The inside of the elbow and the back of the knee are
  open.

## 2. How games rig it (the rules)

1. **Separate pieces**, modelled over the base body in the bind pose. Each piece stands off the body, and
   neighbours **overlap** at the joint, the upper over the lower.
2. **Rigid binding**: every plate 100 % on ONE bone, including belts and pouches. Never blend weights inside a plate:
   blends are what make metal stretch.
3. **Joint caps on helper bones**: the couter and the poleyn each ride a helper bone at the joint that turns about
   HALF as much as the joint. In Blender this is a Copy Rotation at ~0.5 in local space, or the bake poses it
   directly. The cap then stays between the two segments.
4. **Pauldron on a helper bone** that follows the upper arm only part of the way (~0.4-0.5, check this), as a child
   of the clavicle. It lifts with the arm without entering the neck.
5. **Tassets** on helper bones that follow the thigh's swing by about half, as children of the hips.
6. **Leave the twist out of the caps**: a couter does not roll with the forearm.
7. **Soft parts stay soft**: tabard, cloth and straps take the body's weights (weight transfer) and are smoothed. The
   under-layer is the body's own skin copied out a few mm.
8. **Spread the forearm's twist** over twist bones, so the soft under-layer does not wring like a candy wrapper.
9. **Helper bones are ordinary bones for the engine.** Their motion is baked into every clip at export, and the
   engine plays it; there are no constraints at runtime.
10. **Range-of-motion (ROM) proof**: a clip that takes every joint from its minimum to its maximum (spine, shoulders,
    elbows, wrists, hips, knees, ankles, head), plus every game clip (§7).

## 3. Before anything: a body armour can fit, and a map of the pieces

- **The base body needs real proportions.** Measure each limb's median radius against a real adult's: upper arm
  ~4.5-5 cm, forearm ~4 cm, thigh ~8 cm, calf ~6 cm. A cartoon bodybuilder (upper arm 8.8 cm, thigh 13 cm) cannot
  wear a plate drawn to a real shape without it turning into a box or a pot. Fix the BODY, not the plates.
- **Make an assembly sheet with labels**, used only for placing. It shows:
  - the body in its bind pose with every piece numbered and named, and an arrow to where each goes;
  - for each piece, which side faces out and front, which end goes toward the shoulder or hip, and the pose it is
    drawn in.

  Place and orient each piece from the map, never by guessing from the drawing. Give the image-to-3D step the same
  drawings WITHOUT text, or it models the letters.

## 4. Route A — plates authored apart

Use this when the plates can be drawn or modelled as separate pieces. Detail: `references/plate-fitting.md`.

1. **Proportions first.** Measure each segment's tube (width over length) on the body, and draw or prompt each plate
   to those numbers. A plate drawn to a textbook's slim shape cannot fit a stocky limb without being bent.
2. **Make an exploded sheet**: every plate alone and apart, one side only (mirror the other), seen as worn on the
   right side, in the bind pose's orientation, empty inside. The cloth (tabard, gambeson) is a separate sheet with no
   plate on it.
3. **Fit each plate like a helmet**: its long axis onto its bone, sized so its hollow holds the segment's skin and the
   under-layer with a gap, 100 % on its bone or helper, mirrored for the other side.
4. **Size a plate, never deform it.** Allow only rotation, translation and a scale along each of the piece's own
   three axes, so straight lines stay straight and rims and rivets keep their shape.
   - Never fit vertex by vertex: conformed plates crumple and the caps tear.
   - Keep the sizing sane: the section within ×3 of the length's change.
   - Check: after the best affine transform, the fitted piece and the drawn one differ by < 1 mm.
5. **Fit each piece in the pose it is DRAWN in.** A pauldron drawn for a hanging arm, fitted in a T-pose, gets turned
   the wrong way by its helper in the idle. Place helper-riding caps in the pose of the drawing (usually an idle with
   the arms down), then carry them back to rest through their bone's posed matrix.

## 5. Route B — a suit generated as worn, split by position

Use this when a generator gives the whole suit as ONE fused surface with the plates only painted on.
- **Split by WHERE each face is, never by its paint.** A paint mask mistakes greaves for cloth and painted shadows
  for plate.
- **Move no vertex**: the plates cannot deform by construction.

Detail: `references/fused-suit-split.md`.

1. **Add the joint helper bones** (couter, poleyn, pauldron, tasset) and have the bake pose them in every frame of
   every clip.
2. **Open the joints' hollows**: delete the plate inside the elbow and behind the knee, on the flexion side read
   from the clips. Kept rigid, that plate folds through itself in shards at a run's knee.
3. **Split the suit**: each face goes to the segment it is nearest to, then along that segment to its piece. Slice
   the mesh with a plane at every seam, so cut faces don't leave saw-tooth edges. Each piece reaches ~3 cm under its
   neighbour. Every vertex of a piece is 100 % on its bone.
4. **Split the sabatons** at the ball: the foot and the toe cap are separate pieces.
5. **Keep the tabard as cloth**, with the weights it took from the body.
6. **Add the mail under**: the body's skin copied out ~4 mm over every plated bone and the head (a coif under the
   helmet).
7. **Run the checks** (§8), then export the body (new bones, rebaked clips) and the outfit. Name the mail material
   so the engine maps it to a metal shader.

## 6. Armour restricts movement: a profile, not custom clips

Real plate restricts movement (one measured harness, check this):
- the arm stops near horizontal;
- elbow and knee usable to ~100°;
- the wrist about halved;
- the trunk turns ~10 % less;
- gait ranges barely change.

Shipped games mostly scale speed by equipment weight. Detail and numbers: `references/armour-movement.md`.

- **Write a profile per armour type**: per-joint limits. Plate, for example: shoulder 95° from the trunk's down, elbow
  100°, knee 100°, wrist ×0.5, trunk turn ×0.9, bend ×0.95. Mail over a gambeson: shoulder −10-15°, trunk bend
  −10-20 %.
- **Bake the same clip keys within the profile** as `<clip>_<profile>`. The solver holds each joint at its limit and
  redistributes the rest:
  - the hand gets no nearer the shoulder than the elbow's fold allows;
  - the upper arm stays no higher than the shoulder's limit, and the forearm then reaches as it can;
  - the pelvis stays higher over a planted foot.

  There is zero hand animation per armour. Flag hand targets that become unreachable.
- **Check the bake**: each joint's extremes against the profile; the blow still landing on its impact frame at the
  same tip speed; balance and feet as in the base clips. Expect the wind-up's fist lower (the blade over the
  shoulder, not overhead) while the impact frame holds.
- **In the engine**, swap each clip for its profile bake for whoever wears that armour (`character-animation`
  skill, `references/engine-notes.md`). Add speed and recovery scalars on top if the design wants them.

## 7. The range-of-motion clip

- Take each joint, one at a time, from its minimum to its maximum and back. Then combine the hard pairs: shoulder
  raise with trunk turn, deep knee with hip flexion, elbow fold with forearm twist.
- Use the base body's ranges, or the profile's for an armour bake.
- Run the same checks on every game clip and on every profile bake, every 3rd frame at least.

## 8. The checks (numbers first; say them in the reply)

- **Shape error**: Route A only. After the best affine fit, the plate matches its drawing to < 1 mm.
- **Stretch**: plate edges changing length by > 2 % (check this). Must be **0** for every plate in every frame; cloth
  is excluded. Script: the `character-animation` skill's `scripts/edge_strain.py`, called with stretch 1.02 and
  squash 0.98 on the plate pieces as their own object (its regions are per bone, and cloth shares bones with plates).
- **Caps on their joints**: couter and poleyn at half the joint's swing, 0 mm off the joint in every frame.
- **Gaps**: sample points on the body under the plates and cast rays from the game camera's directions. A point
  seen with nothing drawn in front of it shows the void. The masked body itself hides nothing. Target ~0, and
  locate any (which joint, which clip).
- **Interpenetration**: no plate inside another plate, or inside the body, beyond the tuck under its neighbour.
  Test with ray parity on sampled plate points.
- **Then look**: close-ups of shoulder, elbow, knee and waist, with each piece in its own colour so you can see WHICH
  piece fails, in the 3D tool and in the engine.

One knight before and after (check this):
- before: 51-63 % of the suit's edges stretched > 2 % in every pose, even standing;
- after: 0 % of the plates (the cloth's 5-6 % is expected);
- gaps: ≤ 6 sampled points a frame, at the fingers, the wrist, and the flank in a hard twist.

## Open

- Lamellar, scale and brigandine armour: rules for many small rigid pieces on few bones.
- Helmet visors and articulated gauntlet fingers.
- The pauldron ratio (0.4-0.5) and the 2 % stretch limit from more rigs.
- A runtime Pose Driver / RBF alternative to baked helpers, measured against the bake.
- A script for the gap check (rays from the game camera).
