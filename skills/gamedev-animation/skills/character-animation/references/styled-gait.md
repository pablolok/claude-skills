# A body that must not move like an average person — a styled idle, walk and run

Example: a hunched skeleton warrior. Its idle and walk must not read as an upright soldier's.

## 1. Pick the reference before any work

- Show the person who decides the look several reference clips and let them pick one. Wrong references are cheap to
  reject before work, and expensive after it.
- **Good sources**:
  - showcase and turntable videos of animation packs;
  - animators' own test videos.

  These show one clip at a time, on a clear background.
- **Poor sources**:
  - gameplay footage: the character is small, in combat, and the camera moves;
  - photo-mode stills: they are not motion.
- Cut each reference to GIFs or contact sheets (one frame a second, a grid of frames).
- Look at every GIF's middle frame before sending it on: is it the right kind of body, and does it move?
- Decide early whether to buy and retarget a pack or rebuild its style. Respect the pack's licence either way.

## 2. Measure the reference

Track one bright, stable feature (a glowing eye, a helmet crest) frame by frame: threshold its colour, then take its
centroid per frame. From the track, read:
- the cycle length;
- the side sway;
- the vertical dip per step, and whether both steps dip the same (a limp shows as one deep dip a cycle);
- the posture: hunch angle, knee bend, where each arm hangs or carries.

An example of what a hunched undead walk measured (check this; it is one reference):

| clip | cycle | side sway | dip | posture |
|---|---|---|---|---|
| walk | 41 frames at 30 fps = 1.37 s (two steps) | ~15 cm | one deep dip a cycle (~5.5 cm on one leg, ~1.5 cm on the other: a limp) | hunched ~25-30°, knees always bent, weapon arm low and out to the side, the other hanging forward |
| run | 29 frames = 0.97 s | ~8 cm | one dip of ~11 cm a cycle | more forward lean, the weapon held back, the free arm forward |
| idle | — | a slow sway | — | soft knees, weight on one leg, head forward and tilted, arms limp, no breath |

## 3. Build it as a style, never as edits of the base clips

Give the body its own style parameters (stance, hunch, step length, cycle time, arm carry, limp) and feed them to the
same clip builder. Never edit the base clips for it. An example from one build (check this):
- Walk: 33 frames at 24 fps, step 0.55 m (0.8 m/s).
- Run: 23 frames, step 1.05 m (~2.2 m/s). A game chasing at 2.5 m/s plays it at ~1.14×; cap playback at ~2×.
- Switch walk → run at the geometric mean of their speeds: √(walk × run) ≈ 1.3 m/s.

## 4. Rules that come with it

**A swing foot lands at the ground's speed.** In an in-place clip the ground moves back under the feet. A swing eased
to its spot reaches it at rest in the clip, which means it is still moving forward over the ground, and a heel low in
its last frames drags.
- Ease the swing over the GROUND: the foot rests on it for the first and last ~10 % of the swing (toe-off, heel
  settling) and travels between them, with smootherstep.

**A trunk bend takes the hips back**, so the COM stays over the feet.

**A hunched walk raises the thigh into a forward-hanging arm.** Keep the free arm out far enough, and measure it with
the worn gear on: ~0.3 m out cleared a bracer that 0.2 m did not (check this).

**A run's heel kick and toe-off hit gear.** A high heel kick passes the shin through hanging cloth strips, and a hard
toe-off puts the foot's straps into the shin. Keep the run's foot lift and toe-off low (lift ~0.16, toe-off ~30°;
check this).

**Carry a weapon the same way across the set.** If the walk carries the sword vertical, the run carries it vertical
too, even if the reference holds it back. A weapon that changes carry between walk and run reads wrong.

**Choose the free hand's pose in the run as a runner's fist, upright.** A limp hand with the fingers down, swung
forward, makes the solver roll the whole arm half a turn in one frame.

**Give the elbow a fixed pole when a solver hops.** A searched pole can hop between two near-equal choices every few
frames and leave the loop's ends apart.

**A new range on one side checks that side's joint geometry.** Joints carved or corrected per side, through the old
clips' turns, may not cover the new range: an ankle taken further than before can put one bone into another.

## 5. Checks every bake

- **The standard checks** (`checks.md`): balance, foot slip, continuity (arms under ~5° a frame), and the loop seam
  closed.
- **Hanging cloth**: not through the pelvis or thighs, and each panel's turn not beyond its leg's.
- **Gear clearance**: the worn pieces against the legs (`gear-fitting` skill), on every LOD.
- **Joint clearance** for exposed bones (talus, foot, toes), on every LOD.
- **Look**: the side view and the reference's own 3/4 view, frame by frame against the reference.
