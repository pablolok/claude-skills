# Hit reactions

[src] = published or measured; [derived] = computed or recommended. At 24 fps, 1 frame = 42 ms.

**A hit reaction starts on its impact frame.** There is no anticipation: the first frame is the push, and the
reflexes come 2-3 frames later.

## Timing anchors

**Reflexes.**
- Automatic leg and trunk responses: 90-130 ms after a push (~2-3 frames). The first frame is passive [src].
- Protective arm reaction: 88-150 ms (~2-4 frames). The arms fly before any step [src].
- Head lag: the head stays behind the thorax 50-80 ms (1-2 frames), then snaps into extension [src].

**The recovery step** (lean-and-release at 13-15 % body weight) [src]:
- foot-off at 306 ms (7 frames);
- swing 168 ms (4 frames);
- contact at ~11 frames;
- full restabilisation 1.9 s (~46 frames).

The maximum recoverable lean is ~32°, with knees ~5° in no-step responses [src].

**Strategies** [src]:
- A small push gets an ankle strategy: the body tips rigid.
- A larger or faster push gets a hip strategy: trunk one way, hips the other.
- Past a threshold, a step. Faster pushes step with the COM nearer the ankles.
- People step before the COM reaches the edge of the feet.
- Sideways: a crossover of the unloaded leg (35 %) or side-steps (28 %).

**Hitstop.** Classic brawlers freeze 6 frames at 60 fps (100 ms); platform fighters 8-15 frames at 60 fps
(133-250 ms). That is ~2-6 frames at 24 fps [src]. Shake the victim sideways with a shrinking amplitude, blend into
the damage pose, and keep the attacker moving.

## Balance (XCoM) [derived]

- COM ~1.0 m high, so `ω0 ≈ 3.1 s⁻¹`.
- Foot ~0.27 m long: toe 0.20 ahead of the ankle, heel 0.06 behind.
- A step is needed past ~0.45 m/s forward, ~0.35 m/s backward and ~0.45 m/s sideways.
- The same impulse gives a ~75 kg lightly equipped body 1.0× Δv, and a body with 30-50 kg of armour ~0.6×. A hit that
  makes the light body step leaves the armoured one in its ankle or hip strategy.

## Variants

| tier | use | length |
|---|---|---|
| light flinch (additive) | a minor hit; the default for a heavily armoured body | 8-12 frames |
| stagger (full body, one recovery step) | a medium hit | 20-30 frames |
| leg buckle / knockdown | a heavy hit to the legs | 36-60 frames, plus a get-up clip |

- Directions: front, back, left and right, plus a low (leg) variant. A small, low attacker is closer to a trip than
  a push.
- Mirror left and right, and make 2-3 variations per tier.
- A flinch never cancels a stagger. Anything with a step is full body.

## Key poses

**Stagger, frontal hit to the trunk** [derived]:

| frames | what happens |
|---|---|
| f0-1 | impact, no anticipation: the pelvis goes back 6-10 cm, the trunk flexes 15-25° (hip strategy), the knees soften 10-15° (COM down 2-4 cm) |
| f0-2 | hitstop, with a fading sideways shake |
| f1-3 | the head lags 1-2 frames, then snaps 10-20° further |
| f2-4 | the free arm abducts 30-60°; the weapon hand KEEPS its grip; the weapon lags 1-2 frames and swings through |
| f7 | foot-off, only if the XCoM leaves the base: a 25-40 cm step the way of the push |
| f11 | contact, knee 15-25°; the trunk overshoots 3-5° |
| f12-30 | a slow-out into a NEW stance on the new feet; never snap back to the start pose |

**Light flinch.** Trunk 6-12°, head 8-12° with a 1-frame lag, shoulders up, pelvis 2-4 cm. No step; recovery in 6-8
frames.

**Hit to a leg.**
- The hit leg's knee and hip flex 30-60° (withdrawal: up and back). The other leg stiffens and takes the weight.
- The trunk folds over the hit leg, the head a frame behind, the arms out holding on.
- The pelvis drops 5-15 cm toward the hit side.
- On one leg, the body falls toward the hit side. Declare those frames as flight for the balance check.
- The foot comes down ~11 frames in, 12 cm out and back. Then the settle.
- The weight goes over the other foot BEFORE the foot steps back to the stance.
- If the foot goes, lower the other foot fast, or plant a held spear's butt for a wider base.

## Fake vs good

**Fake**:
- the same clip every time;
- every part starting and arriving together;
- snapping back to the exact start pose;
- a linear recovery;
- sliding or frozen feet;
- a big reaction hiding weak timing;
- a heavy-looking reaction still playing after the character may act.

**Good**:
- an instant response;
- strong contrast between the impact pose and neutral;
- the head and weapon lag, then overshoot;
- a slow settle.

**From a high camera**, put the amplitude in the ground plane: the pelvis shift, the lean, the arms and weapon wide,
the step. Vertical drops and head pitch foreshorten.

## Heavy vs light

**Heavily armoured.** 0.6× Δv; armour limits the range and roughly doubles the energy cost [src]. It gets:
- an additive flinch (trunk 3-6°, head ~5°, no step);
- a stagger only from big hits;
- a recovery 30 % longer;
- a longer hitstop (poise or hyper-armour).

**Lightly equipped** (an archer). A full stagger on medium hits, the bow arm flung, maybe two steps.

**In between** (a spear soldier). The spear helps their balance.

## Sources

- **Hit reactions in games**: nikoff.cc hit-reaction guide; gameanim.com (12 principles; anatomy of a hit reaction);
  GDC 2019 "Evolving Combat".
- **Hitstop**: fighting-game design writing on hitstop and hitlag.
- **Balance and stepping**: Mille et al. 2003 (J Neurophysiol 10.1152/jn.00974.2002); PMC5144705; bioRxiv
  2021.01.18.427144; Maki & McIlroy 1997 (step strategies); PMC5142842 (arm latencies); Hof 2008 (XCoM in gait).
- **Head lag**: JOSPT 2016.6846.
- **Armour energy**: Askew et al. 2012.
