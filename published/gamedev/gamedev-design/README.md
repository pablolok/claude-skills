# Game development — design

`gamedev-design` bundles generic Claude Code skills to set a presentation quality bar, review playable design from
evidence, and design UI from purpose through a selected concept. Apply them across genres and engines; adapt targets
to the player, platform, accessibility needs, production stage, and chosen style.

```bash
claude plugin install gamedev-design@pablolok-skills --scope project
```

Inside a session the skills are `gamedev-design:quality-bar`, `gamedev-design:game-design-review` and
`gamedev-design:ui-screen-design`.

## Skills

| Skill | Use | Output |
|---|---|---|
| [quality-bar](skills/quality-bar/SKILL.md) | Plan polish or judge player-visible/audible work | Channel checks, concept/build comparisons, still and motion evidence, remaining deviations |
| [game-design-review](skills/game-design-review/SKILL.md) | Diagnose play, feel, learning, AI, pacing, or difficulty | Evidence-ranked findings, local rubric scores, concrete changes, verification and playtest plan |
| [ui-screen-design](skills/ui-screen-design/SKILL.md) | Design or redesign a screen, overlay, panel, or HUD element | Purpose/content brief, selected concept, side-by-side critique, interaction and accessibility checks |

## How they fit together

Each skill is independent; read its `SKILL.md` and follow the references needed for the task. Use quality-bar
beside a focused design workflow when the whole delivered piece needs a presentation review; the cinematics bundle
is optional.

Supply the intended experience, relevant concept or style reference, available playable evidence, target
devices, and important constraints. Without playable access, identify the review as provisional.
The workflow does not require a particular capture tool, image service, issue tracker, or repository layout.

Examples of suitable requests:

- Compare a melee attack's timing, contact, sound, and recovery against its intended weight.
- Review an encounter for onboarding, readable threats, alternate solutions, and pacing.
- Design a death screen from purpose and alternatives, select a concept, then build and critique it.

## Scope of the generic methods

Treat AAA as consistent delivery of an intended style, rather than realism or effect density.
Use rubric totals to compare like-for-like reviews; do not present them as validated population metrics.
Distinguish actual observations, tester statements, measured behavior, simulation, and code-only hypotheses.
Treat numerical probes as targets to calibrate. Keep deliberate exceptions and unresolved gaps visible.

The version lives in this plugin's `metadata.json`, one for all three skills.

## Contributing

Edit `skills/gamedev-design/skills/<skill>/` in the claude-skills repository and open a PR; publishing follows the
repository's `skill-publisher` flow, once for the bundle. Keep the skills generic: no project, character or person
names, neutral examples. Open work:

- Contribute neutral concept/build and playtest examples across genres and art styles.
- Calibrate metrics for accessibility profiles, input devices, multiplayer, and delivery platforms.
- Confirm distribution licensing and any applicable attribution requirements.
