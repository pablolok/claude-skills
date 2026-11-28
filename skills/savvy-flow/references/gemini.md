# The Gemini tier

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

### The Gemini tier

Code and context go to another vendor, Google, under the user's own Google sign-in to the Antigravity CLI (`agy`),
on the plan that sign-in carries (its "Gemini Models" group, with its own 5-hour and weekly windows). Claude and
Gemini work together the way Claude and Codex do: you orchestrate, Claude workers and Gemini relays take tasks of the
same plan, and Gemini gives second opinions. Use it for a second opinion, for a self-contained task the user wants done
on Gemini, or to move work off the Claude limits when the user asks; never move work there on your own to spare Claude.
When the user has asked to balance the families (in words, or as their standing default), Gemini takes its share of
the plan at each tier by the rules of "Balancing the families" in `references/routing.md`: calibrated tier for tier
(Flash ↔ Light, Argon ↔ Medium, Hydrogen ↔ Careful and Heavy, Neon for a long review pass), split by headroom.
- **Pick the intensity like a Claude tier**, the cheapest that gets it right: Flash (`gemini-3.8-flash`, effort low)
  for mechanical work, Argon (`gemini-4-argon`, medium) for standard work, Hydrogen (`gemini-4-hydrogen`, high) for
  delicate or unfamiliar work and for second opinions, Neon (`gemini-4-neon`, medium) beside Hydrogen for Careful-sized
  work where a longer pass on edge cases is worth the wait, Carbon (`gemini-4-carbon`, high) for plans only, each
  launch on the user's explicit yes recorded with `decide` (`tier: "carbon"`), exactly as for Fable and Codex Astra.
  Neon takes low, medium, high and xhigh; on 2026-11-24 (`gemini-4-neon-medium`) it found the same bugs in a short
  review as `gemini-4-hydrogen-high` in about the same time (37 s against 36 s) with fewer tokens (18.5k against
  23.6k), while `gemini-4-neon-high` took 220 s for the same list: keep it at medium unless the brief asks for more.
  A brief names a model or an effort only when the user asked for one.
- **Second opinions come from another family.** A Claude implementation is checked by Codex Sol or Gemini Hydrogen,
  whichever is signed in; a high-risk diff (security, data loss, a migration, concurrency) by both, each read-only and
  in parallel, and you weigh where they agree and where they differ. A Gemini implementation is checked by Opus
  (Careful) for design and fit with the codebase, as a Codex one is.
- **Mixing families in one plan.** Each task carries its family and intensity in the plan you present, a Gemini task
  marked as such before it is delegated. Group by topic as usual: one family per topic, so one worker's context is
  not rebuilt in another family. Tasks of different families run in parallel only on disjoint files or in separate
  worktrees, as any parallel workers (section 4).
- The relay (`savvy-gemini-<intensity>`) runs `agy -p` with stream-json output and returns what Gemini did, checked:
  - an implementation runs with `--sandbox` and a settings file that denies the git commands that change state, in a
    tree no other worker is writing (alone, or in its own worktree), with Gemini told not to commit: it leaves the
    commit message, and the commit follows the review;
  - a second opinion runs read-only, with `--sandbox` and settings that deny every file write (`write_file(*)`), the
    git commands that change state (also `git rm`, `git mv`, `git apply`, `git am`) and the destructive shell commands
    (`rm`, `mv`, `cp`, `chmod`, `dd`, `truncate`, `tee`, `sed -i`, …), and allow nothing more: Gemini runs the tests
    and read-only commands (`git diff`, `git log`, `git status`, listing, reading) in the sandbox, which also keeps
    `.git` read-only. Rules match a command by its leading words, so a shell redirect, an interpreter or a `$(...)`
    line can still write a file: the relay saves `git status`, `git diff` and `HEAD` before the run and compares them
    byte for byte after it, and any difference is a finding it reports, never something it restores (an ignored test
    cache is fine);
  - a follow-up on the same topic continues the conversation (`--conversation <id>`) instead of starting cold: keep the
    conversation id in the registry row;
  - never `--dangerously-skip-permissions`, and never `--mode auto`.
- **A refused action does not fail the run.** `agy -p` exits 0 with `SUCCESS` when a tool was denied: the refusal shows
  only as a step in `ERROR`, as `denied_actions` in the result and as a notice on stderr, and a soft denial ends the
  turn, often with an empty response. The relay reports each one; read them before accepting the task.
- **Gemini does not load Claude Code's skills or `CLAUDE.md`.** It reads `AGENTS.md`, `GEMINI.md` and the skills in the
  project's `.agents/skills` by itself; a skill from `.claude/skills`, a user folder or a plugin reaches it only when
  the brief names its `SKILL.md` by absolute path ("Before starting, read and follow …"), and so does a `CLAUDE.md`
  the task depends on.
- Its report ends with the run's tokens and the Gemini plan windows (`agy -p /usage`, which calls no model). Pass them
  on in your close report.
- Its work gets the same adversarial review as any other tier.
- **Gemini has its own connected tools.** It reaches an MCP server only when the Antigravity CLI's own configuration
  declares it (`agy mcp list`), whatever the Claude session has. Check before routing a connected-tool task to a relay;
  a server Gemini lacks is added there on the user's yes, never by a worker.

### The Antigravity Claude and GPT tier

The Antigravity sign-in also serves third-party models on a quota of their own: the `/usage` group "Claude and GPT
models" (Claude Opus 5.5, Claude Sonnet 5.5, GPT-OSS 120B on 2026-11-28), with a 5-hour and a weekly window apart from
"Gemini Models". The progress tool budgets it as its own family, budget family `agy`, read from the same relay status
files and the same `agy -p /usage` as Gemini; a window that has not started reads `reset_time` `1970-01-01T00:00:00Z`
and counts as unused. Its relays run exactly as the Gemini relays do (the same preflight, settings, sandbox, status
writer and checks), one model each:
- **`savvy-agy-opus`** (`claude-opus-5-5`, effort high; it takes low, medium and high, no xhigh): Careful-sized work
  with a clear approach, and Opus's check of a Codex or Gemini implementation for design and fit (rule 10 of
  `references/routing.md`), moved off the Claude plan's windows. Heavy-sized investigation stays with Heavy: there is
  no xhigh here.
- **`savvy-agy-sonnet`** (`claude-sonnet-5-5`, effort medium; low for Light-sized work): Medium-sized work.
- **`savvy-agy-gpt`** (`gpt-oss-120b`, effort medium, its only one): Light-sized mechanical work (edits, boilerplate,
  running and reporting checks). It is an open-weight model with no rating here: no reviews, no second opinions and no
  delicate code until "Observed in use" has evidence.

Rules of the tier:
- **The quota is small for Claude models.** Measured on 2026-11-28 with one trivial task (read a file, answer in a
  word): `claude-opus-5-5` high, 14.4k tokens, moved the 5-hour window by 3.3 % and the week by 1.6 %;
  `claude-sonnet-5-5` low, 12.3k tokens, by 1.4 % and 0.7 %; `gpt-oss-120b` medium, 9.5k tokens, by 0.04 % and 0.02 %.
  That is about 440k Opus tokens or 900k Sonnet tokens per 5-hour window as agy counts them (input and output,
  cache reads apart), and the week holds about two such windows, so it is the binding limit. One Careful-sized task,
  which often reads a few hundred thousand tokens, can take most of a window: give this tier short, self-contained
  tasks sized by that cost, one Opus task at a time, never long loops, and keep GPT-OSS for the bulk of mechanical
  work. Its percent headroom is not comparable to the other families' when balancing (`references/routing.md`).
- **Same family as Claude.** Opus and Sonnet through agy are Anthropic's models: their check of a Claude worker's
  diff is not a second opinion from another family (that stays Codex Sol or Gemini Hydrogen). They move load off the
  Claude plan and off Gemini's windows, nothing more.
- **When to use it.** For its share when the user has asked to balance the families, by headroom like any other
  family (the `agy` family's own windows at or under 100 %); when the Claude plan's or Gemini's windows are tight and
  the user has asked to move work off them; or when the user asks for it. Never move work there on your own to spare
  Claude.
- **Budget gate.** Agy Opus and Agy Sonnet are the costly tiers of family `agy`: under `within`, its `ask` verdict
  holds them back until the user decides, as for the other families (`/savvy-budget agy …`).
- **Skills and instructions.** Through agy, Claude models do not load Claude Code's skills or `CLAUDE.md` either: the
  brief names each `SKILL.md` by absolute path, as for Gemini.
- Its report ends with the run's tokens and the "Claude and GPT models" windows. Pass them on in your close report;
  its work gets the same adversarial review as any other tier.
