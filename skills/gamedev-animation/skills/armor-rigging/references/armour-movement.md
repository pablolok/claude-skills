# Armour and movement — how much it restricts, and how to bake it

The restriction depends on the armour, and it is baked from the same clips, never authored as custom clips per
armour.

## 1. How much real plate restricts

**One measured case.** One trained fighter in a mid-15th-century foot-combat harness of 39.8 kg; check this before
treating it as general.

| joint | unarmoured → armoured | note |
|---|---|---|
| shoulder flexion | 128 → 62 | partly a sewn mail gusset; ~30 recoverable with a better fixing |
| shoulder abduction | 149 → 84 | the arm stops about horizontal |
| shoulder extension | 35 → 17 | |
| shoulder rotation, adduction | about unchanged | |
| elbow flexion/extension | 109 → 72 | the riveted couter |
| wrist flexion / extension | 29 → 7 / 24 → 11 | the gauntlet |
| trunk bending | 61 → 59 | |
| trunk rotation | 81 → 73 | |
| hip flexion/extension | 99 → 75 | knee bent: 93 → 73 |
| hip abduction | 60 → 30 | |
| hip rotation | about unchanged | |
| knee | 130 → 100 | |
| ankle | slightly more | |

- The mean loss was 19.9°.
- The GAIT ranges (hip, knee, pelvis, trunk) were unchanged, and the trunk stayed very mobile.
- Standing up from lying down was easy.

**Energy.** 30-50 kg of field armour costs 2.1-2.3× the net energy of walking and 1.9× running (limbs swinging the
armour, restricted breathing).

**Mail and gambeson.** No measured medieval data. Modern military body armour loses 6-27°, mostly in trunk flexion
and side bend, because the front and back plates sandwich the thoracic spine.

## 2. What games do

**Shipped games** found no per-joint armour limits. They use scalars:
- roll or dodge clip sets by equipment-load tiers (for example ≤ 25 / 26-50 / > 50 %, or < 30 / 30-70 / ≥ 70 %, with
  the heavy roll's recovery ~2×);
- movement-speed, stamina and noise penalties by armour weight;
- per-class speed.

**Tools that can hold per-joint limits:**
- **Unreal**: Control Rig Full-Body IK (per-bone stiffness 0-1, per-axis limits, preferred angles); an Apply Limits
  node; Pose Driver (RBF correctives, e.g. clavicle/scapula → pauldrons).
- **Unity**: Animation Rigging (Twist Correction, Multi-Rotation; no rotation limit); third-party IK with rotation
  limits (warned as less stable); Humanoid muscle limits (per-avatar, Humanoid rigs only).

**Rigging rigid plates** (rigging forums and talks on helper joints):
- each plate 100 % on one bone;
- couter, poleyn and pauldron on helper bones driven by ~half the joint's rotation (clamped, with an up vector);
- tassets driven from the thigh;
- plates overlapping, with a soft under-layer (mail or cloth) at every gap;
- one merged skinned mesh at export.

## 3. Recommendation

1. **Helper bones always.**
2. **Armour-specific bakes of the same clip specs.**
   - An armour profile gives per-joint limits (and stiffness).
   - The solver redistributes the motion to the clavicle and trunk when a joint is capped.
   - Zero hand animation per armour. Hand targets are still reached, or flagged as unreachable.
   - Unreal's Full-Body IK is the runtime version of the same model.
3. **Runtime clamps only as small safety clamps** (a wrist in a gauntlet). Big runtime clamps break weapon arcs and
   contacts.
4. **On top**, scalars like the shipped games use: playback speed, recovery time and locomotion speed from an armour
   weight.

## 4. Starting limits

| armour | limits |
|---|---|
| plate | shoulder flexion/abduction ~90-95°; elbow ~100° usable; hip flexion −25 % (~75-80°); hip abduction ~30°; knee ~100°; trunk rotation −10 %; trunk flexion −5 %; wrist ~50 % |
| mail over a gambeson (inferred) | shoulder −10-15°; trunk flexion −10-20 % |
| cloth | anatomical |

## 5. What a bake within a plate profile changed on one character (check this)

- **Joint extremes**: shoulder 135° → 95°, elbow 113° → 100°, knee 112° → 100°, trunk 30° → 27°.
- **The heavy blow**: it still landed on its frame at the same tip speed (28.6 m/s). The wind-up fist sat 10 cm lower
  (the blade over the shoulder, not overhead), and the tip was 17 cm higher at the impact (the gauntlet's wrist).
- **Balance and feet**: as in the base clips.

## Sources

- **Restriction data**: Jaquet et al. 2016, Historical Methods 49(3) (range of motion in a 15th-century harness).
- **Energy cost**: Askew, Formenti & Minetti 2012 (energy cost of walking in armour).
- **Modern body armour**: DTIC AD1028746; Military Medicine 188(9-10) e3102.
- **Engine tools**: engine documentation for Control Rig FBIK, Apply Limits and Pose Driver; Unity Animation Rigging
  and muscle definitions.
- **Rigging rigid plates**: polycount threads on skinning armour pieces and pauldrons; Parks, GDC 2005 "Helper Joints".
