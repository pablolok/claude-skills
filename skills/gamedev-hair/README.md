# Game development — hair

`gamedev-hair` bundles Claude Code skills for making realistic hair and beards for games as strands: groomed in a
DCC (Blender hair curves, or Houdini or XGen), drawn in any engine (notes for Unity URP and Unreal), judged against a
reference image set.

```bash
claude plugin install gamedev-hair@pablolok-skills --scope project
```

Inside a session the skills are `gamedev-hair:strand-groom`, `gamedev-hair:strand-rendering` and
`gamedev-hair:hair-reference-review`.

Status: written from one long grey beard taken from cards to strands, one working head-hair groom, and the published
methods they used. Where the evidence is a single case, the skills say "check this" and give numbers as starting
points. Each SKILL.md ends with an **Open** list: those are the questions contributors are asked to refine.

## Scope

- In: head hair, beards, moustaches and other facial hair as strands for close shots; the decision strands vs cards
  vs meshes by distance; the groom's structure, growth, collision, audit and export; the engine's ribbons,
  anti-aliasing, per-strand value and cost; the review against a reference.
- Out (for now): simulation, card atlas authoring for distant LODs, fur and stubble (shells and fins), hair
  physics in gameplay, stylised hair that should match its painting stroke for stroke.

## Skills

| skill | use it for |
|---|---|
| `strand-groom` | building or fixing a groom from a reference: parts per zone with a design table, roots, parents grown against a skin SDF, locks, waves, children, direction from the reference (an orientation field), beard parts, the audit, the export |
| `strand-rendering` | drawing the groom in an engine: strands or cards by pixels, camera-facing ribbons with a width clamp and a prefiltered edge, the shimmer measure, per-strand tone and silver, occlusion and the under-layer, scripted value sweeps, cost, Unity and Unreal notes |
| `hair-reference-review` | judging either against the reference: calibrated views, masks, one gauge at one density, the look rows and their noise floor, sheets and the judge by eye, the defects list, the stop rule |

## How they fit together

```
reference images + cameras + masks
        |
        v
  strand-groom  ---- DCC renders ---->  hair-reference-review  (groom rows, by eye)
        |                                       ^
        |  export (per part, read back)         |
        v                                       |
  strand-rendering ---- engine stills/films ----+  (look rows, shimmer, cost)
```

- `hair-reference-review` is the judge for both: the groom is reviewed in the DCC for shape, flow and mass, then in
  the engine for the look, because offline renders are kinder than the engine.
- A piece stops after two failed attempts and goes back to evidence, in every skill.
- If the `gamedev-assets` bundle is installed, its `concept-match-loop` covers the general match loop (views spec,
  sheets, independent judge); `hair-reference-review` adds the hair-specific rows.

## Layout

```
gamedev-hair/
  skills/
    strand-groom/            SKILL.md, references/{design-table, growth-and-collision, orientation-field,
                                                   beard-parts, audit}.md
    strand-rendering/        SKILL.md, references/{ribbons-and-coverage, strand-value, sweep-method,
                                                   cost, engine-notes}.md
    hair-reference-review/   SKILL.md, references/{measures, defects-list}.md
```

The version lives in this plugin's `metadata.json`, one for all three skills; each SKILL.md frontmatter carries
`name` and `description` only.

## Contributing

- Edit `skills/gamedev-hair/skills/<skill>/` in the claude-skills repository and open a PR; publishing follows the
  repository's `skill-publisher` flow, once for the bundle.
- Keep the skills generic: no project, character or person names, neutral examples ("a grey beard", "a long
  ponytail").
- Write a lesson where it acts, as an instruction with a one-line reason; no lessons or history sections.
- One case is "check this", several are a rule. Replace single-case numbers with ranges when you have more.
- Unreal users: the Unreal notes in `strand-rendering` are the least tested part of the bundle.
