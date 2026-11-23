# Game development — cinematics

`gamedev-cinematics` bundles generic skills to write a cinematic scene before building it, implement
its accepted intent in passes, and maintain story coherence. The methods support different genres, art styles,
teams, and engines. Unity and Unreal notes identify equivalent responsibilities without prescribing a codebase.

```bash
claude plugin install gamedev-cinematics@pablolok-skills --scope project
```

In Antigravity (`agy`), which has no marketplace: clone this repository and run `node bootstrap/antigravity-plugins.mjs` (on macOS, double-click `bootstrap/install-antigravity.command`). It lists the plugins in `~/.gemini/config/plugins.json`; run it again to update. See the repository README, section "Antigravity (Gemini)".

Inside a session the skills are `gamedev-cinematics:scene-script`, `gamedev-cinematics:cutscene-direction` and
`gamedev-cinematics:story-coherence`.

## Skills

| Skill | Use | Output |
|---|---|---|
| [scene-script](skills/scene-script/SKILL.md) | Before building or rebuilding an authored scene | Header, causal beats, screenplay, overhead, shot cards, timed lines, scored review, lock |
| [cutscene-direction](skills/cutscene-direction/SKILL.md) | Build a locked script and verify its presentation | Four pass locks, runtime contracts, dense frame review, audiovisual and lifecycle evidence |
| [story-coherence](skills/story-coherence/SKILL.md) | Define or check narrative content | Story bible, knowledge/setup ledgers, coherence findings, propagation checks |

## How they fit together

Each skill works independently; read its `SKILL.md` and follow the linked references when the workflow calls for
them. When combining them, check story constraints before scripting, lock the script before construction, and
return script-level discoveries from the build to a reviewed revision.

Supply the available story model, space/captures, intended experience, and relevant build context.
The skills choose host-project storage and existing tools; no bundled validator, capture utility, engine plugin,
or sibling bundle is required. A manual check must be identified as manual.

Examples of suitable requests:

- Write and review a boss entrance before staging it in the engine.
- Build the accepted reveal in passes and compare every shot with its card.
- Check whether a speaker can know a fact on each reachable branch.

## Scope of the generic methods

Keep timing, reading speed, lens examples, and sampling intervals as starting checks that require calibration.
Use designated review roles and existing authority rather than assuming a particular team structure.
Map runtime responsibilities onto current systems instead of introducing required class names.
Keep capture and approval evidence distinct from implementation claims.

The story workflow is included because facts, knowledge, continuity, and setup/payoff remain useful without
any particular setting, protagonist, voice, or language.

The version lives in this plugin's `metadata.json`, one for all three skills.

## Contributing

Edit `skills/gamedev-cinematics/skills/<skill>/` in the claude-skills repository and open a PR; publishing follows
the repository's `skill-publisher` flow, once for the bundle. Keep the skills generic: no project, character or
person names, neutral examples. Open work:

- Contribute neutral script/build examples and small engine contract examples.
- Calibrate dialogue reading and branching-story checks with diverse languages and audiences.
- Confirm distribution licensing and any applicable attribution requirements.
