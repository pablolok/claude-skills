---
name: character-animation
description: Animate a human or biped game character so the motion is physically plausible and good to watch — the kinetic chain from the ground up, balance by the extrapolated centre of mass, planted feet, joint ranges, the shoulder girdle, gait, timing, appeal, telegraphs and impact frames, the order to build a clip in and the numeric checks it must pass. Use for any biped clip (idle, walk, run, strike, shot, hit reaction, death) or rig change, and before export.
---

# Character animation — the whole body, measured

A strike is not an arm moving. Every joint takes part, the weight moves over the feet, and the skin deforms
cleanly. This skill gives the principles, the order to build a clip in, and the checks that prove a clip
has them. Rig: Blender, authored with IK and constraints, baked to plain FK bones for any engine
(`references/rig.md`). Engine-side details: `references/engine-notes.md`.

## 1. The kinetic chain

- Power comes from the ground up. The rear foot pushes (ground reaction force), the pelvis turns, then the trunk,
  the shoulder girdle, the shoulder, the elbow, the wrist and the weapon.
- **Proximal to distal**: each segment starts, peaks and brakes BEFORE the next. The braking of the big segment
  whips the smaller one.
- The pelvis turns AHEAD of the chest (pelvic-thoracic separation: the core stretches like a band, then recoils).
  Hips and trunk give about half the energy of an overhead blow. In a straight punch the rear leg gives ~38 %, the
  trunk ~37 % and the arm ~24 %. An arm on its own is weak and reads fake.
- A thrust is a LINEAR chain: the forearm keeps its direction and travels, so read the joints' linear speeds, not
  their angular ones (`references/thrust.md`).

## 2. Balance — the extrapolated centre of mass (XCoM)

- The centre of mass (COM) is computed from segment masses (table in `references/checks.md`). Add anything held
  or worn that has real mass.
- A body at rest is balanced when its COM projects inside the support polygon of the loaded feet. A MOVING body
  is balanced when its **XCoM** does: `XCoM = COM + v / ω0`, with `ω0 = sqrt(g / l)` and `l` = leg length
  (or COM height). For a ~1 m COM height, `ω0 ≈ 3.1 s⁻¹`. A static check flags every step as a fall; the XCoM
  check shows the real ones.
- In a walk, read the XCoM side to side only, against the stance foot's OUTER border. Walking is a fall forward and
  toward the midline that each step catches. Read against the inner border, a sound walk fails.
- Weight shift: on one leg, its hip rises and that side's shoulder drops (contrapposto). The hips lead any push;
  the chest never drags the body.
- **To lift a foot, put the weight over the other one first.** Move the pelvis there (6-10 frames), hold it until
  the lifted foot is down, then move on. A guard stance about hip-width apart makes this possible.

## 3. Planted feet

- A foot that bears weight does not move. Viewers notice foot sliding from about 2 cm.
- Contact points are ON THE SOLE (heel, ball, toe), not at the joints 2-4 cm above it. The sole has a width
  (~9 cm at the ball for an adult man).
- Generate or pin the feet every frame of a stance (keys only at the poses let a planted foot drift). In an in-place
  clip the ground moves back under the feet: a planted foot travels, and a swing foot LANDS, at the ground's speed.
- To pivot a foot, keep both feet down, step first, then pivot. Key a pivot every frame (between keys the ankle cuts
  the arc and the heel slides).

## 4. Ranges of motion

Use the body's own anatomy study when there is one; otherwise the clinical table (AAOS, degrees):

| joint | range |
|---|---|
| shoulder | flexion 180, extension 60, abduction 180, rotation 90 ext / 70 int |
| elbow / forearm | 0-150 / pronation 80, supination 80 |
| wrist | flexion 80, extension 70, radial 20, ulnar 30 |
| hip | flexion 120, extension 30, abduction 45 |
| knee / ankle | 0-135 / dorsiflexion 20, plantar 50 |
| trunk | rotation ~45, flexion ~80 |

Keep clips well inside. A body's own flesh (a belly on the thighs, a heavy arm) stops a joint before the bone does,
so measure that body's range on its rig and use it. Judge a borrowed clip against the body it plays on.

## 5. The shoulder girdle

- The arm rises with the scapula and clavicle. Past the first 30°, the scapulohumeral rhythm is ~2:1
  (glenohumeral : scapulothoracic). At full elevation the clavicle elevates up to ~15° and rotates back 30-50°.
- A rig without clavicle bones cannot raise the shoulder: the deltoid stretches and the armpit tears. Drive the
  clavicle from the arm's elevation: one third of the elevation past 30°.

## 6. Gait

- Four poses per step: **contact** (heel strikes, legs widest), **down** (weight lands, knee bends, lowest),
  **passing** (the free leg passes the stance leg), **up** (stance leg on its toes, highest).
- The pelvis rotates ~±4° and drops ~±5° on the swing side (6-11° range). It shifts sideways toward the stance leg.
  The shoulders counter-rotate the pelvis, the arms swing opposite the legs, and the body bobs a few cm.
- The feet land near the midline: step width ~10 cm walking, ~5 cm running. The pelvis is lowest in double support
  and highest at mid-stance; in a run it is the other way round.
- A run has a flight phase, a forward lean of ~10°, and knees and elbows bent more. Heel-toe roll needs a toe bone.
- Size the timing to the body (Froude number, `references/natural-motion.md` item 1). The arms in a walk:
  `references/walk-arms.md`.

## 7. Timing

- Phases: **anticipation** (wind-up), **action**, **follow-through**, **recovery**.
  Action is fast (the swing's peak speed at ~60-70 % of its arc); in follow-through the body brakes and the
  weapon carries on.
- At 30 fps: a light swing 6-12 frames, a heavy swing 12-24, a whole heavy attack 45-80. A heavy overhead blow
  with its recovery: about 40 frames at 24 fps (check this).
- Timing carries weight: the same poses read heavy or light by their spacing alone; a heavy body needs time to
  start, stop and turn.
- Block the weight first (hips, spine, feet, shoulders, head), the arms and fingers after. The head stays steady
  and looks at the target, counter-rotating the trunk. Overlap: the parts settle after the body stops.

## 8. Appeal — beautiful, not only right

- **Strong key poses first** (anticipation extreme, point of no return, impact, follow-through). Each reads as ONE
  line of action through the body, is asymmetric (no twinning: shift a hip, bring a foot forward, tilt the
  shoulders) and is pushed (deeper wind-up, bigger lean, longer reach).
- **Silhouette from the GAME camera**: the weapon never overlaps the body, the limbs stay off the trunk, and there
  is negative space between them. Test it with a pure-black render.
- **Spacing**: the weapon slows into the wind-up's top and holds there (a moving hold: a few cm of creep, never
  frozen), then goes fast with its peak speed AT the impact, and brakes over several frames (a blade that stops
  dead looks light).
- **Arcs**: hands and the weapon's tip travel on curves. A kink in a path reads as a glitch.
- **Overlap**: the head, the off arm and a shield settle a few frames after the body. The recovery never snaps back.
- **Effort and state** show in the pose (strain, a wound, exhaustion): `references/natural-motion.md` item 10.

## 9. Telegraphs and impact frames

- An enemy's anticipation must be long and distinctive enough to react to. Allow the player's reaction time
  (~0.25 s), plus the dodge, plus a margin: about 0.3 s minimum. Make heavier attacks longer. Give enemies a longer
  anticipation than the player character.
- **The impact frame belongs to the clip.** Author it with the clip, export it as an event on the clip
  (`references/engine-notes.md`), and have the game land damage on that event. Never type a wind-up time into code
  beside the clip.
- If a clip is quicker than its attack type's minimum wind-up, play it slower rather than cut it. Never cut a clip
  before its follow-through: hold the attack state for the clip's length.
- For a hit reaction, the impact frame is frame 0: no anticipation, reflexes 2-3 frames later
  (`references/hit-reactions.md`). Hitstop is 2-6 frames at 24 fps.

## 10. The order to build a clip in

1. **Plan**: one sentence (what it does, why); the phases with frames and where the weight is in each; the key
   poses (from the scene's script when it plays in one); one line per item of `references/natural-motion.md`; the
   movement's research note, read first (a new movement gets its note before its first key).
2. **Block the body**: pelvis position and rotation per key; the feet planted or stepping, as world targets; the
   spine split (lumbar ~40 %, thoracic ~60 % of a turn); the head's look target.
3. **Arms on the body**: the girdle (§5), hand targets and weapon aim, a natural elbow pole; the chain OFFSET in
   time, pelvis → chest → arm → hand a frame or two apart.
4. **Solve and bake**: legs IK to the feet, arms IK to the hands, baked to the FK bones; then the checks (§11).
5. **Tune from the checks**: keep each clip's numbers (key poses, timings, amplitudes) in one data table the
   builder reads, so one call rebuilds and reports. A failing check names a joint and an amount: change that
   number by that amount. When fixing one check breaks another, or past ~5 hand edits of a clip, script a sweep of
   the free numbers against all the checks and take the best row.

## 11. The numeric checks

A clip fails if any check fails. Formulas, inputs and thresholds are in `references/checks.md`; the thresholds
marked there "check this" come from one rig.

1. **Bake sanity**: the played-back hand within a few cm of its key every frame; numbers that differ clip to clip
   (identical numbers mean the solve read the rest pose).
2. **Balance**: the XCoM inside the loaded feet's polygon (+2 cm) in every non-flight frame.
3. **Feet**: a planted foot's total slip over its stance ≤ 1 cm; no sole under the ground.
4. **Chain order** (strikes): peak angular-speed frames pelvis ≤ chest ≤ upper arm ≤ forearm ≤ hand.
5. **Ranges**: every joint inside its range, with margin.
6. **Deformation**: skin edges stretched > 35 % or squashed < 60 % near zero at shoulder, elbow, hip, knee; limb
   cross-sections ≥ 90 % of their rest radius (a wrung twist).
7. **Head**: forward axis within ~25° of the look target in strikes.
8. **Continuity**: no bone turning tens of degrees in a frame (a flipped pole); a loop's ends equal.
9. **Appeal**: tip speed peaking into the impact frame; a wind-up hold (< 20 % of peak for ≥ 3 frames); ≥ 25 % of
   peak for ≥ 3 frames after the impact; no kink (> 60° turn in a frame at speed); each key pose's line of action
   bending ≥ 12° one way; weapon/body silhouette overlap ≤ 15 %.

Then look: renders from the game camera and the side, close-ups of the joints, a black silhouette sheet, and how to
film them (`references/checks.md`, "Looking").

## 12. The acting set a character needs

- **Core**: idle plus a variant, locomotion with its speed matched in play (no sliding), each attack split into
  anticipation / action / recovery, a hit reaction, a death.
- **Acting set** (cutscene characters): look up, point, recoil, beckon, raise a held light, a talking idle.
- **Events**: the Impact event on the impact frame, a footstep event on every footfall.
- **Runtime aim and feet**: a head/chest aim rig driven by targets and two-bone foot IK, checked in a cutscene
  still (the speaker looks at what they talk about) and on a slope.
- **Faces** (humans): jaw and eye bones or blink/shout shape keys, readable at the close-up lens.
- **Armour and build change the bake, not the clip**: the same keys baked within a joint-limit profile
  (`armor-rigging` skill) or a posture offset; check the blow still lands on its frame.

## 13. Per-movement references

Read the note for the movement before planning it. A new movement gets its own note first: numbers with sources,
key poses, a frame plan, and the faults that make it look fake. Look at photos and video of the real movement, from
the views a coach uses, and render the same views side by side.

| file | covers |
|---|---|
| `references/natural-motion.md` | what a particular body changes: size, ranges, rhythms, gaze, load, flight, effort |
| `references/strike.md` | an overhead or diagonal sword blow: the whip, the grip, stepping into and out of a lunge |
| `references/thrust.md` | a one-handed spear thrust at a low target |
| `references/bow-shot.md` | a longbow shot: stance, draw, anchor, release |
| `references/hit-reactions.md` | flinch, stagger, knockdown: timing anchors and balance strategies |
| `references/walk-arms.md` | the arms and the relaxed hand in a walk |
| `references/styled-gait.md` | a body that must not move like an average person (a hunched skeleton warrior) |

Also: `references/checks.md` (every check), `references/rig.md` (bones, twist, grip, joints, skinning).

Scripts (untested, see the bundle README): `scripts/foot_slip.py` (check 3) and `scripts/edge_strain.py`
(check 6, the first half).

## Open

- Add notes for movements not yet covered: a two-handed weapon, an unarmed combo, a climb, a vault, a heavy-body jump.
- Thresholds measured on one rig (stretch 35 % / 60 %, line of action 12°, overlap 15 %) need more rigs.
- Scripts for the balance (XCoM), chain-order and appeal checks.
- A quadruped or multi-legged companion skill (support polygons, gait patterns).
- Unreal-side verification of `references/engine-notes.md`.
