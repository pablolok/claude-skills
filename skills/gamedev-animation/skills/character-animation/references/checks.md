# The numeric checks — inputs, formulas, thresholds

Each check is described so it can be written in any tool (a Blender Python script over the baked clip is the
easiest). Run them on the BAKED clip, played back on the bones the engine receives, never on the IK controls.
"(check this)" marks a threshold that comes from one rig; confirm it on yours.

Common inputs: the armature, its clip, the frame rate, the ground plane (z = 0), the game camera's direction(s),
and per frame the world matrices of every bone.

**Read posed matrices in POSE mode.** A rig left displaying its Rest Position makes every posed matrix read rest.
The symptom is identical numbers for every clip, or a hand far from its key. Set the armature to Pose Position
before any check reads it.

## 0. Bake sanity

- For each hand (or grip bone) with a key: the distance between its played-back position and its keyed target,
  every frame. Pass: a few cm.
- The report's headline numbers differ from clip to clip.

## 1. Centre of mass and balance (XCoM)

Segment masses (fraction of body mass) and COM positions (fraction of the segment's length from its proximal
end), adult male, de Leva:

| segment | mass % | COM % from proximal |
|---|---|---|
| head + neck | 6.9 | 59.8 |
| trunk | 43.5 | 44.9 |
| upper arm | 2.7 | 57.7 |
| forearm | 1.6 | 45.7 |
| hand | 0.6 | 79.0 |
| thigh | 14.2 | 41.0 |
| shank | 4.3 | 44.6 |
| foot | 1.4 | 44.2 |

- `COM = Σ m_i · p_i / Σ m_i`, where `p_i` is lerp(proximal joint, distal joint, COM %). Add held or worn objects
  with real mass (a shield, a heavy helm, a carried chain) at their own positions.
- `v` = the COM's velocity (central difference between frames, in m/s). For an in-place clip, add the ground speed.
- `ω0 = sqrt(g / l)`, with `l` = leg length or COM height (~1.0 m gives `ω0 ≈ 3.1 s⁻¹`).
- `XCoM = COM + v / ω0`, projected on the ground.
- Support polygon: the convex hull of the contact points (heel, ball, toe tip, both sole edges) of every foot whose
  sole is within ~2 cm of the ground.
- Pass: the XCoM is inside the polygon grown by 2 cm, in every frame with a foot down. The only exceptions are
  frames declared as steps, falls or flight.
- Gait: read only the lateral component, against the stance foot's outer border.
- Stepping out of a lunge is capture-point dynamics. With the front foot off, the XCoM held over the rear foot
  closes the COM in exponentially (time constant `1/ω0 ≈ 0.31 s`).

## 2. Planted feet (foot slip)

- Contact points: heel, ball and toe ON THE SOLE (a fixed offset in the foot or toe bone's space, 2-4 cm below the
  joints).
- A foot is planted in a frame when its contact point is within `h` of the ground (~2 cm). For an in-place clip,
  correct each position by `+ travel_velocity · t`, where `travel_velocity` is the speed over the ground the clip
  represents.
- For each stance (a run of planted frames): slip = the largest horizontal distance of the contact point from its
  position at the stance's first frame. Measure over the WHOLE stance, not per frame: a slow drift of 1 mm/frame
  passes a per-frame test and reads as sliding.
- Pass: slip ≤ 1 cm per stance (viewers notice from ~2 cm). No contact point below the ground (−5 mm tolerance).
- Pivots on a heel or ball: exclude the pivoting point and check the one it turns about.

Script: `../scripts/foot_slip.py`.

## 3. Kinetic chain order (strikes)

- Angular speed per frame, for pelvis, chest, upper arm, forearm and hand:
  - **trunk segments**: the magnitude of the whole rotation from frame to frame;
  - **limbs**: the swing of the segment's AXIS only (its roll carries no tip speed).
- `q` and `−q` are the same rotation: read an angle past 180° the short way. Sign flips otherwise show up as
  290-350° "spikes".
- Pass: the frame of each segment's peak is non-decreasing, pelvis ≤ chest ≤ upper arm ≤ forearm ≤ hand.
- For a thrust (a linear chain), compare peak LINEAR speeds of hip → shoulder → elbow → wrist → fist instead. The
  fist's fastest frame is the one before contact.

## 4. Ranges of motion

- Per joint and per frame: the joint's angle about each anatomical axis (flexion, abduction, rotation), as its
  child bone's rotation relative to its parent's rest frame.
- Pass: inside the body's own range table (or the AAOS table in the skill) with a margin (~5-10°). A skinned
  body's range is often smaller than the bone's (soft tissue).

## 5. Deformation

**Edge strain** (script: `../scripts/edge_strain.py`):
- For every edge of the evaluated (deformed) mesh: `ratio = posed length / rest length`.
- Count edges with ratio > 1.35 (stretched) or < 0.60 (squashed), per region (assign each vertex to the bone with
  its largest weight) (check this).
- Pass: near zero at the shoulder, elbow, hip and knee. A rig without clavicles counts hundreds per clip at the
  shoulder (check this).

**Limb cross-section**:
- Slice each limb segment's skin at a few stations along its bone, perpendicular to it.
- At each station: mean distance from the bone axis, posed / rest.
- Pass: ≥ 0.90. Below that, a twist is wrung (the candy-wrapper effect).
- Edge strain does not see a wrung limb: its edges barely change length. With a ~90° forearm turn on one twist
  bone, linear blend skinning keeps cos 45° ≈ 71 % of the radius half-way. Spread the turn on more twist bones
  (`rig.md`).
- The slice next to the shoulder stays low (~0.75) with the arm raised back. That is the armpit's fold, not a twist.

## 6. Head aim

The head's forward axis against the direction to the look target. Pass: within ~25° in strikes and acting beats.

## 7. Continuity (solved choices)

Two measures:
- **A solver's chosen angle** (where a solver picks among roots: a knee's turn off its pole, an elbow pole searched in
  steps): that angle frame to frame, a loop's last frame against its first. Expect ≤ ~1-2°/frame in a walk, up to
  ~6°/frame in a strike's fast push (check this). A jump means it changed root.
- **Each bone's whole turn per frame** (roll included), with a loop's closing frame against its first. In a gait the
  arm bones stay under ~5°/frame (check this); tens of degrees is a hop. Strikes are not bounded by this number.
- Two near-equal choices let a solver hop. Give the clip its pole explicitly rather than retune.

## 8. Appeal

The weapon's tip (or the striking hand) is sampled per frame. Speed is read BETWEEN frames: at 24 fps a heavy
blow's last two frames are the contact.
- **Peak into the impact**: the tip's maximum speed falls in the interval ending at the impact frame or the one
  before.
- **Wind-up hold**: tip speed < 20 % of the peak for ≥ 3 consecutive frames at the wind-up's top.
- **No dead stop**: after the impact, tip speed ≥ 25 % of the peak for ≥ 3 frames.
- **Arcs**: no direction change > 60° between consecutive frames while the tip moves fast (> ~30 % of the peak).
- **Line of action**: in profile, the polyline support ankle → pelvis → mid-back → neck base bends ≥ 12° one way at
  each key pose (check this). Leave the head out; it looks at the target.
- **Silhouette**: render the key poses from the game camera in flat black, body and weapon on separate masks. Pass:
  weapon pixels overlapping body pixels ≤ 15 % of the weapon's (check this).

## 9. Body-specific checks

From `natural-motion.md`:
- **Froude number of a walk**: `Fr = v² / (g·L)`, near 0.25.
- **Heavy start or stop**: the root's speed ramps over ≥ 6 frames.
- **Flight**: the COM's path in the air fits a parabola with g = 9.81 m/s² (residual ≤ 1-2 cm), with constant
  horizontal speed.
- **Joint rhythms**: shoulder, lumbar/hip and neck/head ratios at the key poses.
- **Gaze onset order**: eyes ≤ head ≤ trunk ≤ feet.

## Looking (after the numbers)

A number without a look is not a check, and a look without a number is not either.
- **Every clip**: from the game camera and from the side, with a stand-in weapon on the grip.
- **Close-ups**: shoulder, elbow, hip and knee.
- **Key poses**: a black silhouette sheet.
- **Formats**: GIF, a slowed GIF, and a video file (many phones play no GIF).
- **Locomotion**: film it travelling over a floor with readable texture, from the game's follow camera and from a
  fixed camera it crosses. A follow camera over a blank plane cannot show whether it walks.
- **Dressed characters**: film in the engine when the 3D tool's preview mis-draws alpha-cut gear.
- **Hands**: look at them in close-up, never only in the full-body sheet.

## Sources

- **Dynamic balance (XCoM)**: Hof, Gazendam & Sinke 2005, "The condition for dynamic stability" (J Biomech 38); Hof
  2008 (the XCoM in gait).
- **Segment parameters**: de Leva 1996 (adjusted Zatsiorsky-Seluyanov), as tabulated by Adolphe et al. 2017; Winter,
  *Biomechanics and Motor Control of Human Movement*.
- **Ranges of motion**: AAOS normal values (goniometer.io).
- **Scapulohumeral rhythm**: Physiopedia; orthopaedic references on the shoulder girdle.
- **Gait and pelvis**: pelvic rotation in gait (pubmed 11239313); walk-pose breakdowns for animators.
- **Kinetic chain**: kinetic-chain disruption review (PMC9219320); striking and throwing biomechanics.
- **Skinning and twist**: Jacobson & Sorkine, stretchable and twistable bones.
- **Appeal**: Game Anim (the 12 principles in video games); Animworks (silhouette); GDKeys (anatomy of an attack);
  Thomas & Johnston's 12 principles.
- **Foot sliding perception**: Pražák, Hoyet & O'Sullivan 2011.
