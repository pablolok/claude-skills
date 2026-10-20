---
name: pre-implementation-review
description: Use BEFORE writing code, patching files, or scaffolding UI/backend changes — decide the RIGHT design first (responsibilities, the design pattern that expresses each, ownership, seams); reuse, testability and low duplication then follow as consequences. Trigger during reasoning and planning, especially when a change introduces new responsibilities, collaborators, shared services, UI patterns, validators, or orchestration logic. This is the "plan clean" front-half of clean-code-standards.
---

# Pre-Implementation Review

Use this before implementation starts. **The goal is the right design, not reuse**: decide the responsibilities, the
design pattern that expresses each, the ownership boundaries and the seams — *during planning*, before code exists.
Reusability, testability and low duplication follow as consequences; chasing reuse directly produces premature or wrong
abstractions. Same judgment as `clean-code-standards`, *ahead* of writing. Start from "what are the responsibilities,
and what is the correct shape for each?", never from "what can I reuse?". The order: design → find existing
implementations of it (reuse/extend) → only if none, build it.

## Required outcome

Before writing code, a short implementation-readiness note that answers, in this order:

1. **Responsibilities** — the distinct jobs (a rule, a data read/write, an external call, orchestration, presentation).
2. **Pattern per responsibility** — the pattern it *is* (strategy, repository, gateway/anti-corruption, adapter,
   factory, pure decision/policy, composition root, observer, command, value object…), not the fanciest one.
3. **Ownership & seams** — the owning module, its interface, how collaborators are injected (independently testable).
4. **Reuse (derived)** — what already implements one of them (reuse or extend), what must be new.
5. **Duplication / regression risk** — what to avoid during implementation.

## Review workflow

1. **Decompose into responsibilities** — most "one thing" requests hide 2–4 (a rule + a persistence + a call).
2. Per responsibility, the **pattern** and the **owner** + its interface: pure decisions (no IO) for rules, a repository
   for data access, a gateway for external services, a composition root that injects.
3. **Then** search the codebase for existing implementations: **direct reuse** · **extend existing abstraction** ·
   **create new** (no owner yet) · **safe to implement locally** (truly isolated, unlikely to recur).
4. **Flag duplication and design smells early** — read `references/design-smells.md` whenever the change adds UI, a
   rule or mapping, a domain value (a code, a status, a token), a read of time/randomness/config, or styling.
5. Recommend the **narrowest** design that gives each responsibility one clear owner, without over-generalizing.
6. Define the boundary: where each module lives, its consumers, the tests beside each piece (a pure decision is tested
   without IO).

## Derivability — ask it FIRST, and answer it with a measurement

**Before any other question**, for every field, table, cache, snapshot, sync mechanism or attribute copied onto a
queued or persisted record the change would introduce *or inherit* (a consumer that holds only an id reads the
attribute from the entity's owner; it does not widen the record to carry it): **what does it hold that cannot be derived from what is already there?** Answer with a **query against
real data**, not an estimate:

- **"Nothing"** → do not store it, derive it. The mechanism is the defect.
- **"Only the exceptions"** (a user decision, a manual override) → store **only the exceptions**, never the whole state.
- **"A lot"** → store it, and say in the note what keeps the two copies from diverging.
- **"Derived only while the rules stay fixed"** (replayed from a seed, a log, a recipe) → if the rules keep changing
  while the state must survive, store the state as the truth with versioned migrations; the replay stays a test.

**Read `references/derivability.md` whenever the change adds, inherits, repairs, overwrites or retires a stored copy,
guards against an input that "could" occur, builds from an old plan, or records what unmeasured paths emit** — the
rules that make the question bite.

## Hard fails — reject the design, don't merely note it

**A concrete member-name branch in shared/multi-member code is a HARD FAIL**: code shared across a family (providers,
channels, tenants, plan tiers…) names no concrete member — no `if`/`switch` on one, no per-member flag, no member-keyed
literal. The differing behaviour belongs to the member; the shared code asks it through a registry, with a generic
default member. The verdict is **reject the design and name the correct owner**, even for a one-line fix of a regression
you just made. Read `references/hard-fails.md` whenever the change touches code more than one member reaches.

## Decision rules

- Separate a rule/decision (pure, no IO) from the data access (repository) and the external call (gateway) — even
  inside "one" function.
- Reuse or extend only an abstraction that **already owns that responsibility**; never bend one that owns another.
- Prefer enums or typed named constants over raw numeric codes when the value set is finite and part of the domain;
  named constants over semantic literals; time, randomness and config injected — each surfaced in the note.
- Prefer shared styling primitives, design tokens, or utility layers over the same CSS repeated across components,
  and themeable semantic color tokens over hardcoded product colors.
- Don't wait for duplication to land if the responsibility clearly recurs; **don't force a generic abstraction for
  reuse's sake**. Explicit inputs/outputs and small extension points over oversized generic frameworks.

**Read `references/decision-rules.md`, at the rule, when the change:**

- takes an input another component or person owns that forces a worse result — put it to the owner;
- rebuilds or replaces something, closes a gap a document lists, shows existing data, or relies on a claim about an
  outside system — find its users first, probe the system;
- enters a problem the field solves a known way, or an approach stops converging — the standard method first;
- has a job, setup, builder, correction, fallback or retry read its own output, or records a negative as permanent;
- adds a capability to a port many consumers use — an extending interface, not the shared one;
- writes from reads that refresh independently — condition the write where it lands;
- adds a constraint to stored data, or a new (automatic) writer — every writer, every constraint;
- writes again after a write that succeeded, or offers a choice a write must accept — the follow-up never fails the
  first, the choice checked against the write's limits;
- explains or reports a measurement — from the control flow, read twice;
- deletes or rewrites by a rule or a script — bounded, its output looked at;
- depends on an ambient mode, a tool's default or an unmeasured value;
- uses a value measured in another frame (space, unit, projection, one side of a pair);
- selects an item by position, or by being listed, named or nearest;
- lists observed values or refusals (hosts, labels, ids, formats), or fixes a reported symptom from a cause read in the code;
- finds something by a conventional name;
- adds a default for a whole family, a member to one, or a condition that decides when something runs.

## File placement — decide the FOLDER before writing

No gate sees where a file sits. For **every file the change creates or moves**: its one responsibility, the folder
that owns it and why, its layer (above, inside or beside the folder it serves), its dependency direction (acyclic). A
contract shared by two layers sits **above both**; vocabulary no implementation owns gets its own module. Read
`references/file-placement.md` for the questions in full and the accretion smell.

## Output format

A concise planning note, design first, reuse derived:

- `Derivability` — for every stored thing the change adds **or touches**: what it holds that cannot be derived, and the
  **measurement** that says so; "n/a — nothing stored" when nothing is. Never omit it: omitting it is how the question
  stops being asked.
- `Responsibilities & Patterns` — each job + the pattern/owner that expresses it
- `Recommended Approach`
- `Reuse (Direct / Extend / New)`
- `File Placement` — per new/moved file: responsibility, owning folder + why, layer, dependency direction; any
  accreted folder flagged
- `Implementation Boundary` — owners, consumers, tests per piece
- `Risks To Avoid`

A responsibility with no existing owner that won't recur is said so, with the local implementation justified.

## Boundary

- This runs **before** code; then code meets the `clean-code-standards` bar (plus the per-language layer), and
  `verification-gates` (or the project's compliance audit) confirms it green — including its file-placement gate, which
  re-reads `File Placement`.
- **Multi-task plans: review per TASK, gate once at the END.** This review runs before EVERY task of a planned sequence
  (a plan's design section does not substitute for it — "the design is already written down" is the rationalization),
  scoped to that task; a task with no behaviour effect (a rename, a comment, formatting) is exempt. `verification-gates`
  runs ONCE at the end: per task only the covering tests; earlier full sweeps only when a task touches what they can't
  see (a shared type, a build config, a public interface). **review → build → covering tests → (next task) … → gates
  once at the end.**
