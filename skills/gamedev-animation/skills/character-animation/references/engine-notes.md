# Engine notes — Unity and Unreal

The method is engine-agnostic: author in Blender with IK and constraints, bake to FK bones, export FBX. These notes
cover where the engines differ. Menus and option names change between versions, so items marked "(check this)" need
confirming against the version you ship on.

## Export from Blender (both engines)

- Bake every clip to the deforming and helper bones. Export only deforming bones plus the helpers the game needs
  (grip, armour helpers, root). Leave IK controls and constraint targets out.
- One armature, one clip per action. Name clips so each one maps to a single engine asset.
- Scale and axes: Blender is Z-up, metres. Unity is Y-up and left-handed; Unreal is Z-up and works in centimetres.
  Use the exporter's axis and scale options, and check that a 1.8 m character imports at 1.8 m with identity scale on
  its root. A wrong unit shows up as a root scale of 100 or 0.01.
- Held props (weapons) are separate meshes. Export each one straightened along one axis with its grip at the origin,
  then attach it to the grip bone (Unity: a child of the grip transform; Unreal: a socket on the grip bone) at zero
  offset.
- An instantiated character in the engine shows the file's LAST pose, not the bind pose. Never place attachments
  "as in the T-pose": use the grip bone's own space.

## Import

- **Unity**: Generic vs Humanoid.
  - **Generic** keeps every bone (twist, helpers, armour) exactly as baked.
  - **Humanoid** retargets through its muscle space. It maps only the human bones; extra bones keep their
    animation only when the clip's mask includes their transforms (check this).
  - For a rig with many helper bones, Generic is the safe default.
- **Unreal**: one Skeleton asset shared by the character's meshes and animations. Helper bones import as ordinary
  bones. Retargeting to other skeletons goes through IK Rig and IK Retargeter (check this).
- Loop settings: mark looping clips as loops on import, and check that the loop's first and last frames match (the
  continuity check).
- Compression: engine animation compression can reintroduce foot sliding and jitter on small helper bones. Check
  the imported clip, not only the Blender bake.

## Root motion

- Decide per clip whether the root carries the travel (root motion) or the clip plays in place and the game moves
  the character.
- **In place**: the game's speed must match the clip's ground speed, or the feet slide. Compute it from the stride:
  `step length × steps per second`.
- **Root motion**: key the root bone's travel on the ground plane and its yaw; the hips bone then keeps only its
  motion relative to the root (bob, sway, turn).
  - **Unity**: the Animator's Apply Root Motion; the clip's Root Transform settings choose what is baked into the
    pose (rotation, Y, XZ).
  - **Unreal**: Enable Root Motion on the animation sequence, and the Anim Blueprint's root motion mode (check this).
- A playback-speed change (a heavy armour profile, a slowed attack) scales root motion with it. Check the attack
  still reaches its target.

## Events (the impact frame and footsteps)

- The impact frame is authored with the clip and travels with it. Keep a per-clip table of impact frames next to the
  clips, and generate the engine events from it on import, so a re-export never loses them.
  - **Unity**: Animation Events on the clip's import settings (a function name and a time), or a StateMachineBehaviour
    reading a normalised time. Damage lands from the event.
  - **Unreal**: Anim Notifies on the sequence (or Notify States for windows such as an active hit window).
- Footstep events on every footfall: the frame the heel or the ball reaches the ground.
- Never type a wind-up time into gameplay code beside the clip.

## Runtime IK and aim

Use it for what the bake cannot know: the actual ground, the actual target.
- **Foot IK on uneven ground**: two-bone IK per leg, driven by a ground trace under each foot, with the pelvis
  lowered by the larger drop.
  - **Unity**: Animation Rigging Two Bone IK, or Humanoid foot IK.
  - **Unreal**: Control Rig, or the Two Bone IK / leg IK nodes (check this).
- **Look-at and aim**:
  - **Unity**: Animation Rigging Multi-Aim on head and chest, weighted.
  - **Unreal**: Look At / aim nodes, or Control Rig.
  - Spread the aim over chest, neck and head; never the head alone.
- **Twist and correctives**:
  - **Unity**: Animation Rigging Twist Correction (check this).
  - **Unreal**: Pose Driver, or RBF correctives for pauldrons and clavicles (check this).
  - Baked twist bones need neither.
- **Joint limits at runtime**: keep them as small safety clamps (a gauntleted wrist). Large runtime clamps break
  weapon arcs and contacts. Put armour restrictions in the bake (`armor-rigging` skill). Unreal's Full-Body IK is the
  runtime form of the same per-joint limit model.

## Armour and outfit variants

- Swap clip sets per armour profile rather than authoring states per armour.
  - **Unity**: an Animator Override Controller that maps each base clip to its `<clip>_<profile>` bake.
  - **Unreal**: an animation layer or a sequence swap in the Anim Blueprint (check this).
- Any gameplay code reading an attack's length reads it from the clip actually playing.
