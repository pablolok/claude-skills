# Natural for THIS body — the checklist a clip is planned and judged against

A movement reads natural when it respects the body making it: its size and mass, the ranges its own flesh allows,
the rhythms its joints share, what it holds, gravity, and its state. The skill gives the human basics; this list
adds what a particular body changes.

Use it at step 1 of the clip order: the plan names what each item means for this clip. Use it again when judging the
clip. Read it for every body that is not an average adult: a giant, a heavy or wounded body, a creature on two legs.

## 1. Size and mass set the timing

**Fact.** Timing is what carries weight: the same poses read heavy or light by their spacing alone, and a heavy body
needs time and force to start, stop or turn. Bodies move alike at the same Froude number, `Fr = v² / (g·L)`
(L = leg length; preferred walk ≈ 0.25, walk-run transition ≈ 0.5). Speeds therefore scale with √L and times with
√(L/g).

**In the clip.** Time a big body's clip from its leg length, not from a person's frame counts: cycle and step times
× √(L / L_ref). Its accelerations are gentle, its stops spread over frames, and its starts are led by a lean.

**Check.** The walk's Fr (v and L from the rig) is near 0.25. A heavy start or stop ramps the root's speed over ≥ 6
frames, never in one step.

## 2. Its own flesh stops a joint before the bone does

**Fact.** Soft-tissue approximation stops joints early: belly on thigh, calf on thigh, biceps on forearm.

**In the clip.** Take ranges from the body's own measured range table, never from the clinical one. A heavy body
kneels with its trunk upright or its knees apart; it never folds a hip to the textbook 120°.

**Check.** Every joint is inside the body's measured range. Re-pose a pose that goes past it; don't force the skin.

## 3. Joints share a movement in fixed rhythms

**Fact.**
- Shoulder: humerus : scapula ~2 : 1 past 30°.
- Bending forward: the lumbar spine leads early (lumbar : hip ≈ 1.9 at 0-30°), the two are equal at 30-60°, and the
  hips lead late (≈ 0.4 at 60-90°). There is more lumbar under a load.
- Twisting: lumbar ~40 %, thoracic ~60 %.
- Head: neck and skull split a nod about 60 / 40.

**In the clip.** No joint does a shared movement alone. A bow from the waist is spine first, then hips; a reach
overhead lifts the clavicle; a look down bends neck and head together.

**Check.** Each pair's ratio at the key poses against these numbers.

## 4. The eyes lead, the body follows

**Fact.** A gaze shift under ~20° is eyes only; beyond that the head joins. A big turn goes eyes → head → trunk →
feet, about 0.5 / 0.6 / 0.7 / 1.1 s for a 180° turn to an unseen target. A predictable or heard target can start the
head first.

**In the clip.** A turn or a look starts at the eyes (or the head, for a body with no visible eyes), the trunk
follows a beat later, and the feet come last. At the end the body re-centres under the head.

**Check.** The onset order eyes ≤ head ≤ trunk ≤ feet at every look or turn.

## 5. What it holds is part of its mass

**Fact.** A carried or swung object (a helmet in the hand, a chain, a heavy shield) adds to the centre of mass. The
body counter-leans and keeps its feet under the joint centre. Neutral balance with a heavy load reads as no load.

**In the clip.** The balance check uses body + held object. A heavy object pulls the trunk back to counter it and
widens the stance. Letting it go releases the lean, and the body rocks the other way.

**Check.** The COM includes the object's mass at its place, and the counter-lean is visible at the key poses.

## 6. Going down is braked, coming up is pushed

**Fact.** Lowering (a kneel, a crouch, a landing) is muscle braking against gravity: it slows into contact, and the
effort shows in the compression. Rising shows the push.
- Kneeling: weight onto the front leg, the rear leg steps back on its toes, and the body lowers under control (knee
  over toes) onto the rear knee.
- Standing up: weight forward onto the front foot first, then the push.

**In the clip.** Plan the weight path of every change of level. A body that drops at gravity's speed is a collapse;
use one only when the story says so (a stun, a death).

**Check.** The pelvis's vertical speed slows into each contact. No change of level happens with the weight off the
leg doing it.

## 7. In the air, physics owns the body

**Fact.** Without contact, the centre of mass follows a parabola (g = 9.81 m/s²) and the angular momentum stays
constant whatever the limbs do. Viewers spot horizontal-speed errors and added accelerations most.

**In the clip.** Solve a leap or a jump, don't key it: the take-off speed sets the arc and the airtime. A twist in the
air comes from tucking, not from nothing.

**Check.** The COM's flight path fits a parabola (residual ≤ 1-2 cm), with constant horizontal speed in the air.

## 8. Soft tissue follows through

**Fact.** Belly, chest, jowls and a heavy beard lag the bone and settle after it stops. Secondary motion that reacts
instantly reads fake.

**In the clip.** Give a heavy body spring (jiggle) bones on its soft masses, baked into the clip or simulated in the
engine. They lag 2-4 frames and settle over a few cycles.

**Check.** At a stop the soft masses overshoot and settle. A fat body is never rigid.

## 9. A planted foot does not slide — at all

**Fact.** Viewers notice foot sliding from about 21 mm.

**In the clip.** Generate or pin the feet every frame while they are loaded.

**Check.** A planted foot's total slip across its stance is ≤ 1 cm, not only per frame.

## 10. Effort and state show in the body

**Fact.** Under strain the body braces and the antagonists tense: the motion slows, there is a tremor at the limit,
and the breath is held then released. A wounded, exhausted or grieving body moves with that state: shorter steps,
a guarded side, a slower recovery.

**In the clip.** The plan names the character's state and its load, and the key poses show both.

**Check.** Read the key poses: does each pose say what it costs?

## Sources

- **Timing and weight**: Lasseter, *Principles of Traditional Animation Applied to 3D* (SIGGRAPH 1987); Animation
  Mentor (heavy lifts, effort in impacts).
- **Dynamic similarity**: Alexander & Jayes 1983; Minetti 2001; Donelan & Kram 1997.
- **Lumbopelvic rhythm**: Esola et al. 1996; Frontiers in Sports 2020 review.
- **Gaze**: Andrist et al. 2012 (head-eye coordination for virtual characters); studies of segment latencies in
  large gaze shifts.
- **Carried mass**: Animator Island (animation physics); AnimSchool (animating force).
- **Flight**: Shapiro & Lee, *Practical Character Physics for Animators*; Reitsma & Pollard 2003 (perceptual metrics
  for ballistic motion).
- **Soft tissue**: Spring Decomposed Skinning (Eurographics 2025).
- **Foot sliding**: Pražák, Hoyet & O'Sullivan 2011 (perceptual evaluation of footskate cleanup).
