# Savvy Flow on an OpenSpec project

Read this when the project root has an `openspec/` folder (or `openspec context --json` resolves a root), and in a
new project when the user picks OpenSpec. OpenSpec owns **what** is built and the record of it (the change, its
spec deltas, its task checklist, the archive); Savvy Flow owns **how** it is built (tiers, workers, review). The two
meet in `tasks.md`.

Never run OpenSpec's own apply workflow (`/opsx:apply`, the `openspec-apply-change` skill) inside the flow: it has one
agent implement every task, which is the job of the workers. Its propose and archive workflows are used as below.

## When the plan is an OpenSpec change

- **A change is the plan** for anything that changes behaviour: a new capability, a change to a requirement, a
  breaking change, an architectural shift, a performance or security change of visible behaviour.
- **No change** (an ordinary plan, as in section 1) for: a bug fix that restores behaviour the specs already
  require, typos, formatting, comments, dependency bumps that change no behaviour, config, tests for behaviour that
  already exists. Say in the plan you present that it is not a change and why, in one line.
- **An active change already covering the task** is continued, not duplicated: `openspec list --json`, then
  `openspec status --change <id> --json`. Its unticked tasks are the remaining plan.

## Planning (section 1, orchestrator only)

1. Write the change yourself, following the project's `openspec-propose` skill (in `.claude/skills/`), or, without it,
   `openspec new change <id>` and `openspec instructions <artifact> --change <id> --json` for each artifact in
   order (proposal → specs → design → tasks). Planning is never delegated; a wide code search for it may go to an
   Explore agent with `model` set, as usual.
2. **`tasks.md` is cut for the workers.** Each `## N. <group>` is one worker task of the plan: one topic, one tier,
   grouped as section 1 step 3 says (small same-topic same-tier work in one group). Its `- [ ] N.M` lines are the
   steps of that brief, each saying how it is verified, as OpenSpec asks. Order the groups by dependency; a group
   that waits on another says so in its first line ("after 2"). Each group carries the tests and docs its own work
   calls for (OpenSpec 2: no final "tests" or "docs" group; a last group holds integration checks only). Steps that
   need the archive go as plain bullets under `## Workflow follow-up` at the end, never as checkboxes. Mark a done
   line `- [x]` only: OpenSpec reads `[~]`, `[-]` and `[]` as unfinished.
3. **Tiers stay out of the files.** `tasks.md` is the project's record, read by OpenSpec and the backlog dashboard;
   the tier of each group goes in the plan you present and in the progress bar, never in the change.
4. `openspec validate <id> --strict` must pass before the plan is presented.
5. **Present the change and wait for the user's approval** before the first worker starts: the change id, the
   proposal's Why in one line, the capabilities touched, and the groups as the numbered plan with tier and
   dependencies. This is OpenSpec's planning boundary: a change is a contract the user signs off. The user may waive
   it for the session ("go ahead without asking"); then section 1 step 4's rule applies again.
6. **Progress bar**: one bar task per `## N.` group, its `title` = `N. <group name>` exactly, so the panel, the
   Agent `description` and `tasks.md` read alike.

## Briefs (section 4)

- Point at the change instead of restating it: `openspec/changes/<id>/proposal.md`, `design.md` when it exists, the
  delta specs the group implements (`openspec/changes/<id>/specs/<capability>/spec.md`, the requirement names), then
  the group's task lines **verbatim** with their numbers.
- The definition of done includes the delta's **scenarios** the group covers: each `#### Scenario` (WHEN/THEN) is a
  check the worker runs or shows.
- **Workers never edit `tasks.md`, the proposal, the design or the specs.** One writer (you) keeps the checklist true
  with parallel workers in one tree. A worker that finds the spec wrong or incomplete stops and reports it.
- A Codex brief names these files by path as well; Codex reads `AGENTS.md` and `.agents/skills` by itself, but the
  change is passed explicitly like any other context.

## Review (section 5)

- Check the diff against the group's task lines **and** the scenarios of the requirements it implements; a scenario
  not demonstrated is a defect.
- **On accept, tick the group's lines** in `tasks.md` (`- [x]`) in the same commit as the task's code. A line done
  only in part stays unticked and the group is not accepted.
- A gap found in the change itself (a missing scenario, a wrong requirement, a design decision that did not hold) is
  fixed **in the change first** (you edit proposal/design/specs/tasks, re-run `openspec validate <id> --strict`),
  then the work is re-briefed. Never let the code drift from the specs silently. A change of scope is the user's
  call: ask, as for any re-plan.

## Close (section 6)

1. Every task line ticked, `openspec validate <id> --strict` green, the full verification run once.
2. **Archiving is the user's call** (OpenSpec archives after the change is deployed or accepted): offer it in the
   close report. On a yes, archive with the project's `openspec-archive-change` skill or `openspec archive <id>`,
   which merges the deltas into `openspec/specs/` and moves the change to `openspec/changes/archive/`; commit that.
3. **Backlog** (when `BACKLOG.md` exists): the change has an entry whose `Doc` links its `proposal.md`; the dashboard
   reads the change's groups as the entry's phases, so ticking `tasks.md` is all the progress there is to keep. Open
   the entry at planning time if none exists; close it after the archive, its history line linking the archived
   proposal.

## New project (section 1a) with OpenSpec

Ask in the one batch of section 1a step 2 whether to use OpenSpec (recommend it when the `openspec` CLI is
installed). With OpenSpec:

- After `git init`: `openspec init --tools claude` (add `codex` when the Codex tier is signed in), non-interactive.
- **`docs/SPEC.md` is replaced by**: the stack, conventions and constraints in `openspec/config.yaml` under
  `context:` (short: it is shown to every artifact), and the MVP as the first change (`add-mvp` or a name from the
  request) with its proposal (goals, non-goals as What Changes), the capability specs as ADDED deltas, and
  `design.md` for the architecture, data model and integrations.
- **`docs/PLAN.md` is replaced by** that change's `tasks.md`; group `## 1.` is always the scaffold (Light or Medium,
  nothing in parallel with it).
- `CLAUDE.md` points at `openspec/` (config, the active change) instead of SPEC.md and PLAN.md; `filemap.md` as usual.
- Approval (step 8) is the approval of the change; a resumed session continues from the unticked lines of
  `tasks.md`.
