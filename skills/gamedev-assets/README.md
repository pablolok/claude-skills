# Game development — assets

`gamedev-assets` bundles Claude Code skills for making 3D game assets from concept art and matching them to it.
They are written for Blender plus any engine, with short Unity and Unreal notes where the engines differ. Tools are
named by role. The current options are listed with their licence caveats as options to check, not as endorsements.

```bash
claude plugin install gamedev-assets@pablolok-skills --scope project
```

Inside a session the skills are `gamedev-assets:concept-to-asset`, `gamedev-assets:concept-match-loop` and
`gamedev-assets:anatomy-study`.

## Scope

In scope:
- creatures, characters, bosses, worn gear and props made from concept images;
- reference images, image-to-3D, assembly, topology, UVs, bakes, paint, rig, deformation checks and export;
- the loop that matches a model to its concept before anyone reviews it;
- the anatomy a body is built and animated from.

Out of scope for now: environment kits, foliage, VFX, UI art, and animation authoring beyond the deformation and
range checks. See each skill's Open list.

## Skills

| skill | use it when | references |
|---|---|---|
| `concept-to-asset` | turning concept art into a game-ready model | `reference-images.md`, `image-to-3d.md` (with the tool table), `bodies.md`, `surface.md`, `rig-deformation.md`, `garments.md`, `export.md` |
| `concept-match-loop` | a model is being made or fixed against its concept, before review | `views-spec.md`, `metrics.md`, `judge.md` (the prompt and the rubric) |
| `anatomy-study` | before modelling, rigging or animating a body | `human.md` (the worked study) |

## How they fit together

```
anatomy-study ──(joints, ranges, checklist)──┐
                                             v
concept art ──> concept-to-asset: plan pieces → references → shapes → assembly
                                  → topology/UVs/bakes/paint → rig → export
                                             │
                                             v
                     concept-match-loop: views spec → render the shipping LOD → sheet + numbers
                                  → close-ups → judge → fix at the source → repeat
                                             │
                     two rounds without progress: back to concept-to-asset's sources
                                             │
                                             v
                                       the art owner's review
```

- `concept-to-asset` builds the model, and runs `concept-match-loop` at its verify step.
- `concept-match-loop` sends a stalled piece back upstream to a new reference or take in `concept-to-asset`. It
  never tunes a bad source further.
- `anatomy-study` feeds both: joint places and ranges to the rig and clips, and the checklist to the close-ups.

## Principles shared by the three

- **The reference is the brief.** Find the reference the work is measured against now, and name the exact file.
- **Research the method first.** Most asset kinds have a standard studio technique. Find it and write it down with
  its sources before the first build.
- **Numbers for placement, a list of visible differences for shape and look.** Neither one alone is enough.
- **Fix at the source**, isolating the channel (shape, normal map, base colour) that carries a defect.
- **An independent judge**, calibrated on the cases reviewers caught before, and blind when choosing between two
  versions.
- **Single-case evidence is written as "check this"**, not as a rule.

## Status

The method was built on a few creatures and one human skeleton. The scripts it relied on are not included: the
skills describe each check so it can be rebuilt. The version lives in this plugin's `metadata.json`, one for all
three skills.

## Contributing

Edit `skills/gamedev-assets/skills/<skill>/` in the claude-skills repository and open a PR; publishing follows the
repository's `skill-publisher` flow, once for the bundle. Keep the skills generic: no project, character or person
names, neutral examples. Contributions are welcome, especially:
- reference scripts for the checks;
- non-humanoid anatomy studies;
- prop and environment routes;
- Unreal import notes;
- a rubric for hard-surface assets.
