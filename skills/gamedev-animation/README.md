# Game development — animation

`gamedev-animation` bundles Claude Code skills for game character animation, armour rigging and gear fitting. The
method is engine-agnostic:
- author and check in Blender (IK and constraints, baked to plain FK bones);
- export FBX to any engine;
- see the short Unity and Unreal notes where the engines differ.

```bash
claude plugin install gamedev-animation@pablolok-skills --scope project
```

Inside a session the skills are `gamedev-animation:character-animation`, `gamedev-animation:armor-rigging` and
`gamedev-animation:gear-fitting`.

## Skills

| skill | use it for |
|---|---|
| `character-animation` | any biped clip or rig change: the kinetic chain, balance by the extrapolated centre of mass, planted feet, ranges, the shoulder girdle, gait, timing, appeal, telegraphs and impact frames, the order to build a clip in, the numeric checks, the acting set, and research notes per movement |
| `armor-rigging` | plate armour: rigid plates per segment, joint caps and pauldrons on helper bones, overlaps and the under-layer, armour restriction as a bake profile, the range-of-motion proof |
| `gear-fitting` | dressing a bare body: fitting and skinning clothes, hiding covered skin by bone, rigid worn gear, held weapons, the clipping and clearance checks |

## How they fit together

1. `gear-fitting` fits the outfit.
2. `armor-rigging` rigs its plates.
3. `character-animation` makes and checks the clips that both run on.

## Layout

```
gamedev-animation/
  skills/
    character-animation/
      SKILL.md
      references/  checks.md  rig.md  natural-motion.md  strike.md  thrust.md  bow-shot.md
                   hit-reactions.md  walk-arms.md  styled-gait.md  engine-notes.md
      scripts/     foot_slip.py  edge_strain.py
    armor-rigging/
      SKILL.md
      references/  plate-fitting.md  fused-suit-split.md  armour-movement.md
    gear-fitting/
      SKILL.md
      references/  worn-gear.md
```

## Scripts — UNTESTED

`character-animation/scripts/` holds two small standalone Blender Python scripts. They were written fresh for this
bundle and have **not been run**. Review them, and try them on a known clip before trusting their numbers.

| script | check | notes |
|---|---|---|
| `foot_slip.py` | a planted foot's total slip over each stance ≤ 1 cm; no sole under the ground | contact points are given as (bone, offset in bone space); in-place clips take a travel velocity |
| `edge_strain.py` | skin edges stretched > 35 % or squashed < 60 %, per region; also plate stretch (> 2 %) | needs numpy (bundled with Blender); the Armature modifier must keep the vertex count |

Every other check is described in `character-animation/references/checks.md` (inputs, formula, threshold) so it can
be written in any tool.

## Conventions

- **"(check this)"** marks a number or rule measured on one rig or one reference. Confirm it on yours. Numbers with
  a source come from the literature listed at the end of each reference.
- **Examples are neutral**: a knight, a skeleton warrior, a heavy creature on two legs.
- **The version lives in this plugin's `metadata.json`**, one for all three skills. Frontmatter carries `name` and
  `description` only.

## Contributing

Edit `skills/gamedev-animation/skills/<skill>/` in the claude-skills repository and open a PR; publishing follows
the repository's `skill-publisher` flow, once for the bundle. Each SKILL.md ends with an **Open** list: gaps and
unconfirmed numbers that contributions are welcome on, and a run of the two scripts on a known clip is the first of
them. Keep each SKILL.md to about 200 lines and put detail in `references/`. Write instructions, not a diary.
