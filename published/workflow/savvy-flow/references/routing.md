# Routing by capability

The tier (SKILL.md section 3) sets how hard the task is. When two families could take it at that tier, the capability
the task depends on picks the family. The ratings below come from public evaluations; each carries its source and
date, so a new model generation says what to check again. "Observed in use" is evidence from real flows, and wins over
a benchmark where they disagree.

## The capabilities

| Capability | What it means | Measured by |
|---|---|---|
| Reasoning and debugging | finds a cause no one has named yet | FrontierCode, HLE, scientific terminal tasks |
| Repository engineering | understands, changes, tests and refactors a large codebase | SWE Atlas, DeepSWE |
| Interface design | visible product polish: layout, hierarchy, finish | WebDev Arena (human preference) |
| Creative writing | narrative, dialogue, prose | Arena creative writing (human preference) |
| Vision | reads images, charts and renders correctly | MMMU-Pro, chart reasoning |
| Constraint retention | keeps every instruction across many revision rounds | MultiChallenge |
| Agentic execution | finishes terminal and multi-tool work | Terminal-Bench |
| Cost | price per token; per finished task is what matters | vendor price lists |
| Long context | reliable over very long inputs | weak evidence: one narrow 25–64K benchmark |
| Honesty | reports blockers and unfinished work truthfully | no cross-vendor measure: unknown for every model |

## The ratings (2026-11, models of that date)

S strong, G good, W weaker within this pool, U unknown. Letters name the sources at the end.

| Model | Reason | Repo | Design | Writing | Vision | Constraints | Agentic | Cost |
|---|---|---|---|---|---|---|---|---|
| Fable 5.2 | S [A] | S [F] | S [G] | U | S [A] | U | S [A] | W [A] |
| Opus 5.5 | G [A] | S [F] | S [G] | S [H] | G [A] | U | G [B] | W [M] |
| Sonnet 5.5 | G [B] | G [F] | S [G] | G [H] | G [B] | U | S [B] | G [B] |
| Haiku 5.5 | G [C] | W [F] | W [G] | W [H] | W [C] | G [I] | W [C] | S [C] |
| Codex Luna (GPT-6) | U | W [F] | W [G] | W [H] | W [C] | U | W [C] | S [M] |
| Codex Terra (GPT-6.1) | G [E] | W [F] | G [G] | U | S [E] | G [I] | G [E] | G [E] |
| Codex Sol (GPT-6.1) | G [D] | G [F] | G [G] | G [H] | G [E] | S [I] | G [D] | G [D] |
| Codex Astra (GPT-6) | S [A] | G [F] | G [G] | G [H] | S [A] | U | S [A] | W [M] |
| Gemini Flash (gemini-3.8-flash) | U | U | U | U | U | U | U | U |
| Gemini Argon (gemini-4-argon) | U | U | U | U | U | U | U | U |
| Gemini Neon (gemini-4-neon) | U | U | U | U | U | U | U | U |
| Gemini Hydrogen (gemini-4-hydrogen) | U | U | U | U | U | U | U | U |
| Gemini Carbon (gemini-4-carbon) | U | U | U | U | U | U | U | U |

The Gemini rows stay U until a source is read for them or "Observed in use" has evidence; until then a Gemini
family is picked for a second opinion from another family, because the user asked for it, or for its share when the
user asked to balance the families (below), not for a rating. U means unmeasured, not weaker.

Numbers behind the main rules: SWE Atlas Fable 80.5, Opus 77.4, Astra 69.4, Sol 65.9 [F]; Arena creative writing
Opus 1517, Astra 1451, Sol 1449 [H]; Terminal-Bench 4.0 Sonnet 70.6, Opus 66.4 [B]; MultiChallenge Sol 81.95, Terra
74.20, Haiku 67.67 [I]; Sol matches Astra on DeepSWE at about a fifth of the cost [D].

## The rules

At the tier the task needs:
1. An ambiguous bug that needs exploration → Fable (with the user's yes), else Heavy.
2. A broad refactor, explaining or testing a large codebase → Opus (Careful or Heavy) before Codex.
3. Standard code under a tight Claude budget → Codex Sol for delicate work, Terra for standard work.
4. Terminal-heavy implementation (builds, scripts, CLIs) → Sonnet is a serious first choice at Medium; while the
   session has quality skills, code that is not purely mechanical stays at Careful or a relay (`SKILL.md`, section
   "Quality skills").
5. Visible polish (a screen, a layout) → Fable or Opus; never a lean tier.
6. Narrative, dialogue, game or story text → Opus.
7. Many revision rounds that accumulate constraints → Codex Sol.
8. Images read together with desktop actions → Codex Terra is fast and good; judging a render against a reference
   stays with the orchestrator.
9. Cheap narrow work → Light (Sonnet) or Codex Luna; Haiku leads Luna on terminal work [C].
10. A second opinion comes from another family, in the direction where the families differ: Codex Sol or Gemini
    Hydrogen checks a Claude implementation for edge cases and scope (both, for a high-risk diff); Opus checks a Codex
    or Gemini implementation for design and fit with the codebase.
11. Whatever model writes it, "done" means execution evidence: no model's honesty is measured against another's.

## Balancing the families

When the user has asked to balance work across the families — in words in this flow, or as a standing default in
their instructions — every signed-in family takes its share of the plan's tasks, not only the second opinions. A flow
that sends nearly every task to Claude while Gemini or Codex has room is the failure this section exists for.

1. **Calibrate by tier.** The same difficulty maps across families: Light ↔ Gemini Flash ↔ Codex Luna; Medium ↔
   Gemini Argon ↔ Codex Terra; Careful ↔ Gemini Hydrogen (Neon for a long review pass) ↔ Codex Sol; Heavy ↔ Gemini
   Hydrogen ↔ Codex Sol. The top tiers (Fable, Astra, Carbon) stay plans only, each on its own yes.
2. **Capability first, then balance.** A rule above that names a family for a measured strength keeps it (an
   ambiguous bug → Heavy, visible polish and narrative → Opus, accumulating constraints → Sol). Every other task —
   standard and delicate implementation, tests, scripts, mechanical edits, investigations with a clear brief — may go
   to any family at its tier. An unrated (U) Gemini intensity takes those tasks like the others, and its first tasks
   of a kind become evidence for "Observed in use".
3. **Share by headroom.** Read the `budget` summary for every family before the split. Give the self-contained tasks
   so the families' weekly projections at reset come out close to one another, each at or under 100 %: the family with
   the most room takes the most. A family projected over 100 % takes nothing costly until it fits; a window marked
   `stale: true` is an old reading, so read it again (the `budget` tool rereads Gemini) before planning on it, and
   never take an old or reset window as full.
4. **Keep topics whole.** One family per topic (one worker's context is not rebuilt in another family): balance
   across topics, not inside one.
5. **Say the split.** The plan you present gives the tasks per family (for example `Claude 3 · Gemini 3 · Codex 1`)
   and one line for a signed-in family that gets none, with the reason (a capability rule, its budget, a vendor rule).
6. **Review across.** Each family's implementation is reviewed by another family (rule 10), so a balanced plan also
   balances its reviews.

## Observed in use

Each line: what was seen, when, on which exact model ids (the agent files' aliases move to new models), and what to do
about it. Add to it at the close of a flow; delete a line a newer observation contradicts, and re-check a line whose
models have since changed before relying on it.

- 2026-11 (claude-opus-5-5 as Careful): captures through an editor's MCP server (a scripted take, then the comparison
  sheets) ran right on Careful but cost about 5 USD each for work that was a recipe.
- 2026-11 (claude-sonnet-5-5 as Tools, first trial): one recipe of 13 numbered steps ran as written. It covered two
  exports through a script, an editor launched by its launcher, a scripted take replayed for two arms and waited on with
  a log watcher, the editor closed by PID, then the sheets. The worker reported the one count that differed from the
  recipe (45 files, not 35: masks the recipe had not counted) instead of acting on it. It took about 5 minutes and about
  1 % of the 5-hour window, against about 4 % for a Careful capture of the same size. Write the expected output of each
  step from a previous run of the same take, not from memory: a wrong count in the recipe is a false stop.

- 2026-11-24 (gemini-4-neon-medium, gemini-4-hydrogen-high, gemini-4-argon-medium, one sample each, read-only, no
  file edits): a short review of three buggy Python functions. Neon at medium and Hydrogen at high listed the same
  bugs (37 s and 18.5k tokens against 36 s and 23.6k); Argon at medium found the main ones with no thinking
  tokens (18 s, 14k); Neon at high took 220 s and 26.3k tokens for the same list. On a small function to
  write, all three were correct. Neon is placed beside Hydrogen at Careful size, effort medium, not above it: one
  sample shows no gain in findings. Re-check with a larger task before giving it its own rung.
- 2026-11: Codex Terra implemented standard engine-editor work correctly, but two of three tasks came back with
  breaches of the named code standards (logic in static classes, the same order kept in three places by position).
  Name the standards' `SKILL.md` in the brief, list the most likely breaches in it, and plan one return round.
- 2026-11: Codex stopped and reported when the brief contradicted the project's documentation, as told. Keep the
  "stop and report on anything unexpected" line in every Codex brief, and name in it what is expected: Codex also
  stopped on an editor's start-up console notices and on a tool-bridge diagnostic seen on every start, and on a call of
  its own that validation refused (a required argument left out). The brief lists the known baseline entries and says
  that a call of its own refused by validation is fixed and sent again, not a stop.
- 2026-11: a relay passed a brief whose first lines addressed the relay; Codex read them as its own orders (it tried to
  start Codex). Write a Codex brief with the worker's task in its own section, and the relay passes only that section.
- 2026-11: a project whose hooks require Skill calls before a code edit blocks the lean tiers (Light, Medium have no
  Skill tool): a Medium worker stopped without editing. Code in such a project goes to Careful or above, or to Codex
  (its edits are not Claude Code tool calls); the lean tiers keep running checks and reading.
- 2026-11: Codex's Windows sandbox (`unelevated`) cannot start programs outside the workspace (an editor, the agent
  CLI, test worker processes: Node's test runner needs `--experimental-test-isolation=none`) nor read system
  information through CIM (memory, process command lines). Its `.git` is read-only: a `git add` fails on the index
  lock, so a brief that asks Codex to commit loses the commit. A suite that creates temporary folders in the tree can
  stall there on a folder it may not read. The relay or the orchestrator runs the suites and commits, or an MCP
  server outside the sandbox offers the rest as narrow tools.

## Sources

[A] https://www.anthropic.com/claude-fable-and-mythos-5-2 (2026-11-09) ·
[B] https://www.anthropic.com/claude-sonnet-5-5 (2026-09-28) ·
[C] https://www.anthropic.com/claude-haiku-5-5 (2026-10-07) ·
[D] https://openai.com/index/introducing-gpt-6-1-sol/ (2026-09-29) ·
[E] https://openai.com/index/introducing-gpt-6-1-terra/ (2026-10-26) ·
[F] https://labs.scale.com/leaderboard/swe-atlas (2026-11; its judge is GPT-6.1 Sol) ·
[G] https://arena.ai/leaderboard/code/webdev (2026-11-11) ·
[H] https://arena.ai/leaderboard/chat/text/creative-writing (2026-11-11) ·
[I] https://labs.scale.com/leaderboard/multichallenge (undated, read 2026-11-12) ·
[M] https://developers.openai.com/api/docs/models (undated, read 2026-11-12).

Caveats: several ratings of OpenAI models come from Anthropic's comparison charts (one vendor rating another); public
data names Luna and Astra at GPT-6, not 6.1; scaffolds differ between benchmarks, so scores of different benchmarks
are never combined; none of them measures a model under a project's own skills and sandbox — that is what
"Observed in use" is for.
