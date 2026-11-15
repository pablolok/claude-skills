---
name: anatomy-study
description: Use before modelling, rigging or animating a body (a human, an animal, a monster, a skeleton, a mutated or stylised species) — reason from its skeleton first. Build or read a per-species study (proportions as shares of a reference length, bone by bone, joint by joint with pivots and ranges of motion, posture and ground contact, a measurable checklist), declare the style's exaggerations, and judge rigs and borrowed clips against it.
---

# Anatomy study

Part of the `gamedev-assets` bundle. Building the body is `concept-to-asset`; matching it to the
concept is `concept-match-loop`.

Reason from the body's own skeleton before modelling, rigging or animating it: where its joints really are, what
each joint can do (hinge or ball, which axes, how far), and what touches the ground. Bodies built on a borrowed rig's
joints put cuts and bends mid-bone and clips through impossible poses; a modeller who knows the anatomy sees the
mistake at once. Even a humanoid can have a skeleton quite different from a human's, and starting from that skeleton
also shows whether the animations make sense.

## Two files per species

| file | holds | read by |
|---|---|---|
| `<species>.md` (the study) | proportions; bone by bone (each end, what it meets, the usual drawing mistakes); joint by joint (type, where the pivot sits on the bones, its axes, its range); posture and ground contact; a checklist of measurable lines; sources | the modeller, the rigger, the animator |
| `<species>.json` (the numbers) | joint places as shares of the reference length, trunk heights, cage sizes, ranges of motion, each tagged with its section in the study | the build (the joints a body is built on), the clip checks (the ranges) |

[references/human.md](references/human.md) is the worked example: an adult human, with sources.

## Making a study for a new species

Start from the human study's structure. For every bone and joint, answer from sources: comparative anatomy for an
animal, the human study plus the change for a mutation. Never from memory or from the concept alone.
1. **Bones**: which, how many, each end's shape and what it rests on. A tibia ends in a flat plafond, not a ball; a
   horse stands on one toe per leg.
2. **Joints**: hinge, ball, saddle, pivot or gliding; where the pivot sits on the bones (the ankle's axis runs
   through the talus under the malleoli's tips, not on the dome's top); which axes; how far, in degrees.
3. **Proportions**: as shares of one reference length (standing height, withers height, body length), so they scale
   to any size.
4. **Posture and contact**: what touches the ground at rest and in each gait.
5. **Checklist**: lines a script can measure on the model and its clips (a height, a ratio, an angle, a count), each
   with its tolerance.

Mark every value derived rather than read from a source (`est.`, with how it was derived), and every value taken
second-hand (a table quoting a primary source you haven't read).

## Style is declared, never drifted into

List what the concept exaggerates as style: a bigger skull, thicker bones, big feet, a wider pelvis. Everything else
follows the study. When a declared exaggeration moves other landmarks (a bigger skull with the top of the head kept
at the same height pushes the body down), judge the limbs by their **ratios** (thigh : shank, upper arm : forearm :
hand), not only by absolute heights.

## Using the study

- **Building**: a shared rig keeps its bone names and clips, but every joint is moved onto the one measured on this
  body's concept and checked against the study. Shape from anatomy, size from the concept.
- **Prompting**: a part with known anatomy is asked for by its structures (a foot: the heel pitched, the medial arch,
  a big toe of two thick phalanges, the lesser toes of three lying close), and the take is measured against the
  study before use.
- **Rigging**: put each pivot where the study does (a rig's upper-arm head is the shoulder joint's centre, not the
  top of the shoulder). Give each anatomical joint its own bone when a clip needs its motion (an ankle hinge plus a
  subtalar axis), rather than carving room for a roll on one hinge.
- **Checking a body**: walk the checklist item by item on the rest pose's renders and numbers. A missing kneecap
  shows up as an item, not as a vague "something is off at the knee".
- **Animating**: a clip borrowed from another body is judged against the study. Every joint it bends must exist in
  this body, bend that way, and stay within its range. Compare the clips' measured extremes per joint with the study's
  ranges after every bake.
- **Free and loaded ranges**: a joint bearing weight goes further than its free range (a planted ankle in a lunge
  bends well past its unloaded dorsiflexion). Judge a planted foot on the loaded range and a foot in the air on the
  free one.

## Ranges for a game body

Keep clips inside the conservative clinical column (for humans, the AAOS values). The measured-population column
shows what real people reach and is for extremes only. Knees and elbows never hyperextend more than about 10°; no
wrist or ankle twists about the limb's long axis (that turn belongs to the forearm or the leg).

## Open

- The method has been taken through one species (an adult human, male, 1.8 m). A quadruped, a winged body and a
  non-vertebrate (an insectoid, a tentacled body) are open: a contributor should write one and say what the
  structure missed.
- A female and a child variant of the human study (proportions differ; the carrying angle already does).
- The numbers file's schema: write it down so tools across projects read the same keys.
- Reference scripts: checklist measurement on a rig, and per-joint clip extremes against the study's ranges.
- Ranges of motion for stylised bodies (cartoon squash and stretch): when the study should give way to the style.
