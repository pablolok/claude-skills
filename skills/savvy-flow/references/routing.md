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

Numbers behind the main rules: SWE Atlas Fable 80.5, Opus 77.4, Astra 69.4, Sol 65.9 [F]; Arena creative writing
Opus 1517, Astra 1451, Sol 1449 [H]; Terminal-Bench 4.0 Sonnet 70.6, Opus 66.4 [B]; MultiChallenge Sol 81.95, Terra
74.20, Haiku 67.67 [I]; Sol matches Astra on DeepSWE at about a fifth of the cost [D].

## The rules

At the tier the task needs:
1. An ambiguous bug that needs exploration → Fable (with the user's yes), else Heavy.
2. A broad refactor, explaining or testing a large codebase → Opus (Careful or Heavy) before Codex.
3. Standard code under a tight Claude budget → Codex Sol for delicate work, Terra for standard work.
4. Terminal-heavy implementation (builds, scripts, CLIs) → Sonnet is a serious first choice at Medium.
5. Visible polish (a screen, a layout) → Fable or Opus; never a lean tier.
6. Narrative, dialogue, game or story text → Opus.
7. Many revision rounds that accumulate constraints → Codex Sol.
8. Images read together with desktop actions → Codex Terra is fast and good; judging a render against a reference
   stays with the orchestrator.
9. Cheap narrow work → Light (Sonnet) or Codex Luna; Haiku leads Luna on terminal work [C].
10. A second opinion comes from the other family, in the direction where the families differ: Codex Sol checks a
    Claude implementation for edge cases and scope; Opus checks a Codex implementation for design and fit with the
    codebase.
11. Whatever model writes it, "done" means execution evidence: no model's honesty is measured against another's.

## Observed in use

Each line: what was seen, when, and what to do about it. Add to it at the close of a flow; delete a line a newer
observation contradicts.

- 2026-11: Codex Terra implemented standard engine-editor work correctly, but two of three tasks came back with
  breaches of the named code standards (logic in static classes, the same order kept in three places by position).
  Name the standards' `SKILL.md` in the brief, list the most likely breaches in it, and plan one return round.
- 2026-11: Codex stopped and reported when the brief contradicted the project's documentation, as told. Keep the
  "stop and report on anything unexpected" line in every Codex brief.
- 2026-11: a relay passed a brief whose first lines addressed the relay; Codex read them as its own orders (it tried to
  start Codex). Write a Codex brief with the worker's task in its own section, and the relay passes only that section.
- 2026-11: a project whose hooks require Skill calls before a code edit blocks the lean tiers (Light, Medium have no
  Skill tool): a Medium worker stopped without editing. Code in such a project goes to Careful or above, or to Codex
  (its edits are not Claude Code tool calls); the lean tiers keep running checks and reading.
- 2026-11: Codex's Windows sandbox (`unelevated`) cannot start programs outside the workspace (an editor, test worker
  processes: Node's test runner needs `--experimental-test-isolation=none`) nor read system information through CIM
  (memory, process command lines). The relay or the orchestrator does those, or an MCP server outside the sandbox
  offers them as narrow tools.

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
