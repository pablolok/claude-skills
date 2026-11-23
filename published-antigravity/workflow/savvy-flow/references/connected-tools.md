# Connected tools

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

### Connected tools

A connected tool is anything the session drives beyond files and the shell: an MCP server for an editor, a browser, a
design or 3D tool, a device. Which ones exist depends on the user's setup; the rules below hold for any of them.

**Route by the kind of work, not by the tool.**
- *Mechanical*: run a ready recipe and return what it produces (a capture, an export, a check, a set of screenshots).
  It goes to Tools (`savvy-tools`), or to Codex Luna or Terra when Codex has that tool (`references/codex.md`).
- *Investigation or repair inside the tool*: find why it renders wrong, fix a broken scene or page, write a new
  recipe. It goes to Careful or Heavy (or Sol).
- *Judgment from what the tool shows*: does it match the reference, does it look right. It stays with you (section
  5); the worker returns the artefacts.
- Light and Medium cannot take any of these: their lean tools have no connected tools. Check the agent type's tool
  list before launching.

**Write the brief for the model that runs it.**
- *A capable tier* (Heavy, Careful, Sol) gets the goal, the constraints, the guards and the checks; it plans the steps
  itself and recovers from surprises.
- *A cheaper tier* (Tools, Luna, Terra) gets a recipe, because it follows what is written and improvises badly when a
  step surprises it:
  - the exact steps, in order: which calls or which script, with their arguments;
  - for each step, the output it must give, so a different one is recognised as a stop;
  - how a long job is started (from the app's own scheduler or a script, never one blocking call longer than the
    tool's timeout) and the end signal it is waited on (a log line, a file), with one background wait;
  - the resource guards (free memory, one instance, what to close and how) and what to do when one trips: stop and
    report, never work around it;
  - the artefacts to return (paths, numbers, logs), and no verdicts.
- **A recipe that repeats becomes a script in the project.** Once the same steps have run twice, have a capable tier
  turn them into one command (a script or the tool's own batch mode). Then any tier, even Light, runs it with the
  shell, and the connected tool is used only for what a script cannot reach.
- The first run of a new recipe on a cheaper tier is a trial: read its report against the recipe, step by step, before
  giving it the next one. A step it got wrong is a line the recipe lacked: add it there.
- **This split holds for the models it was observed on.** The agent files name model aliases (`sonnet`, `opus`), and
  an alias moves to a new model by itself. Record each observation of how a tier handled a recipe in
  `references/routing.md`, "Observed in use", with the exact model ids it ran on. When a tier's model changes, its next
  recipe is a trial again, and an observation made on the old model is checked before you rely on it: a newer model
  may need less recipe, or a different one.
