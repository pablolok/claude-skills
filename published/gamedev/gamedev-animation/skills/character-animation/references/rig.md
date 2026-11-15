# The rig a game biped needs

The animation is authored with IK and constraints: feet planted, hands on targets, clavicle from arm elevation,
twist from hand roll. It is then BAKED to plain FK bones for the engine. The engine plays keyed bones only: no
constraints at runtime unless the engine's own runtime IK is used (`engine-notes.md`).

## Bones

- **Spine and head**: root → hips (pelvis, carries the body) → spine → chest → neck → head.
- **Arms**: chest → **clavicle L/R** → upper arm → forearm → hand → fingers and thumb (three bones each); a
  **grip** helper bone in each hand.
- **Legs**: hips → thigh → shin → foot → **toe L/R** (ball of the foot). Heel-toe roll needs the toe bone.
- **Twist bones**, so a limb's turn is spread over its length:
  - forearm: two or three roll bones carrying 1/3 and 2/3 of the hand's roll toward the wrist, and a wrist twist
    bone carrying all of it;
  - upper arm: a roll bone at the shoulder undoing the humerus' own turn, and one half-way carrying half of it.
  - Four twist bones a side brought a ~90° forearm turn from 72 % to 90-97 % of the rest radius mid-forearm
    (check this).
- **Armour helper bones** (couter, poleyn, pauldron, tasset), posed by the bake: see the `armor-rigging` skill.
- **A body whose ankle bones show** (a skeleton): add a talus bone under the shin and split the foot's turn into the
  ankle hinge and the subtalar axis. The knee turns off its pole about the hip-ankle line for what neither joint
  can do (check this).

## Baking

- **The feet's rest pose is every clip's zero.** A foot turned out at rest (a concept's stance laid into the rig)
  adds its yaw to every clip and can put the weight off the sole. Rest the feet straight, and put the turn-out in the
  clips.
- Key rotations on every deforming and helper bone, every frame.
- Also key the location of every bone that leaves its rest place on its parent: the root, the hips, a foot turning
  about a subtalar line.
- Skin weights: at most 4 influences per vertex (most engines' default).
  - The shoulder blends chest, clavicle and upper arm.
  - The forearm blends from the forearm bone at the elbow to the wrist twist bone at the wrist.

## Joints where the anatomy puts them

Place each pivot where the bone's joint is, not where the mesh happens to bend. A head pivot placed low, or a wrist
inside the hand, reads wrong in every clip.

- **Wrist**: at the narrowest section between forearm and hand.
- **Elbow**: at about 0.186 : 0.146 of the shoulder → wrist length (upper arm : forearm).
- **Shoulder**: on the arm's axis.
- **Spine**: near the back, not the middle of the trunk.
- **Neck base**: at C7, where the neck leaves the shoulders.
- **Head**: nodding at the skull's base.
- **Hips**: ~0.05 H from the midline. **Ankle**: ~0.04 H above the ground (H = body height).
- **Thumb**: its base beside the carpus.

## Skinning a generated mesh

- Generated meshes are often not closed, and bone-heat weighting fails on them. Voxel-remesh a closed copy, compute
  bone heat on it, then transfer the weights back (nearest face, interpolated). This gives clean shoulders and hips
  where proximity weights tore.
- Bind the hand with the fingers close together. A body bound with spread fingers keeps the fan under any curl.
- Before calling a bent finger's crossings breakage, classify them. The palm side folding onto itself at a knuckle
  is fold contact, not a fault. A thumb metacarpal entering the index knuckle is a fault: fix it with a corrective
  (a helper or a shape), not by curling less.
- Read a joint's clean range with every nearby region's reader, not its own alone. A shoulder can read clean on its
  own region well past the angle at which it already breaks the chest and clavicle.

## The hand that holds

- **Hammer grip**: the fingers wrap one side of the handle and the **thumb closes across the other side**, onto
  the fingers.
  - Search the thumb's axis, don't guess it: across the handle (~70-90°), its tip on the fingers, nothing inside the
    handle or the fingers.
- **The grip bone sits in the hole the closed fist leaves.** Measure it: the largest circle with bone (or skin) on
  all four sides, across the grip. The handle's radius is that hole's.
  - Re-measure after any change to the hand's joints.
  - Never take the handle's radius from the weapon's drawing: it is rarely the fist's.
- **A handle crosses the fist diagonally** (index knuckle to the heel of the hand). A held object leans ~22° toward
  the fingers (check this). Straight across, every blade needs a bent wrist.
- **A spear is held more diagonally still** (~52° across the palm, check this). In a plain hammer grip it sits ~60°
  off the forearm, and no wrist aims it down a thrust's line.
- **The held weapon rides the grip bone** (a helper the clips key, not deforming): parent it to that bone, never
  skin it.
- **What a wrist in a fist can do**:
  - Flexion turns the hand about the grip itself, so it does not tilt the blade.
  - What tilts the blade toward or away from the arm's line is the sideways bend: ~20° toward the thumb, ~30-35°
    toward the little finger.
  - The rest of the aim comes from the forearm's turn and the elbow.
  - A hammer grip holds a blade ~30-80° off the forearm and cannot point it along the forearm. The blade is CARRIED,
    not aimed: key its angle to the forearm in the swing plane and let the forearm place it. Aiming the blade
    directly asks for poses no wrist reaches (tip jumps of tens of m/s in a frame).
  - Keep the forearm's turn smooth from key to key. A 160° flip in one frame is a whip, not a cut.
- **Every hand that holds something is a fist round it in every clip.** A hand busy with a light source never joins
  a two-handed blow.
- **A relaxed empty hand** is the cascade: fingers in slight flexion, the little finger most and the index least,
  the thumb beside the index (`walk-arms.md`).

## Between the keys

Interpolated rotations can pass through the body even when every key is clean. An upper arm can fold through the
helmet between a high wind-up and the blow.

- Sample every frame between keys. Add a solved key where a frame fails.
- Reject an elbow within ~20 cm of the head's centre, or raised toward the midline (a raised elbow goes out to the
  side).
- Keep the fist on its path between keys. An in-between that swings it far off reads as a glitch.
- A blade turning more than a right angle goes OVER, never under.
