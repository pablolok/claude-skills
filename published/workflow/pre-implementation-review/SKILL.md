---
name: pre-implementation-review
description: Use BEFORE writing code, patching files, or scaffolding UI/backend changes — decide the RIGHT design first (responsibilities, the design pattern that expresses each, ownership, seams); reuse, testability and low duplication then follow as consequences. Trigger during reasoning and planning, especially when a change introduces new responsibilities, collaborators, shared services, UI patterns, validators, or orchestration logic. This is the "plan clean" front-half of clean-code-standards.
---

# Pre-Implementation Review

Use this skill before implementation starts. **The goal is the right design, not reuse.** Decide the
correct responsibilities, the design pattern that expresses each, the ownership boundaries, and the
seams — *during planning*, before code exists. When the design is right, **reusability, testability,
and low duplication follow as consequences.** Chasing reuse directly produces the opposite: premature
or wrong abstractions (a forced "generic" thing that fits nobody). Same judgment as the
`clean-code-standards` skill — one responsibility per module, the right pattern for the problem — but
*ahead* of writing.

Do NOT start from "what can I reuse?"; start from "what are the responsibilities here, and what is the
correct shape for each?". A well-placed responsibility is *naturally* reused because it has one clear
job and a clean interface. The order matters: design → then discover existing implementations of that
design (reuse/extend) → then, only if none, build it.

## Required outcome

Before writing code, produce a short implementation-readiness note that answers, in this order:

1. **Responsibilities** — what distinct jobs does this change involve? (e.g. a decision/rule, a data
   read/write, an external call, orchestration, presentation.) Name them separately.
2. **Pattern per responsibility** — what design pattern expresses each cleanly? (strategy, repository,
   gateway/anti-corruption, adapter, factory, pure decision/policy, composition root, observer,
   command, value object…). Pick the pattern the responsibility *is*, not the fanciest one.
3. **Ownership & seams** — which module owns each responsibility, what interface it exposes, and how
   collaborators are injected (so the pieces are independently testable).
4. **Reuse (derived)** — given those responsibilities/patterns, what already implements one of them
   (direct reuse or extend), and what must be built new? This falls out of steps 1–3.
5. **Duplication / regression risk** — what to avoid during implementation.

## Review workflow

1. Identify the feature or change, and **decompose it into responsibilities** (step 1 above). Most
   "one thing" requests hide 2–4 responsibilities (a rule + a persistence + a call).
2. For each responsibility, choose the **pattern** that expresses it and the **owner** module + its
   interface. Prefer pure decisions (no IO) for rules, a repository for data access, a gateway for
   external services, a composition root that injects.
3. **Then** search the codebase for existing implementations of those responsibilities/patterns, and
   group findings into:
   - **direct reuse** — a stable abstraction already fills that responsibility
   - **extend existing abstraction**
   - **create new** — no existing owner for this responsibility
   - **safe to implement locally** — truly isolated, unlikely to recur
4. Flag duplication / design-smell risk early:
   - repeated UI widgets (dropdowns, pickers, menus, cards, dialogs, filters)
   - repeated business rules, mappings, validators, request builders, orchestration flows
   - a single module doing several responsibilities (a god handler mixing rule + IO + presentation) →
     split by responsibility, don't reuse-as-is
   - repeated or implicit numeric state/category/status codes that should become named enums / typed
     abstractions
   - repeated or semantic string literals that should become shared constants, resource keys, typed
     wrappers, or configuration inputs — **treat literal-centralization as a project rule, not a
     nice-to-have: a value that names a domain concept (a provider/status/kind/route token) MUST be
     proposed as a named constant in its canonical home, even when the change only *reads* the value
     once.** "It's just one string, copied from the old code" is the rationalization this catches; a
     verbatim-preserving extraction is exactly where a stray literal slips in.
   - **ambient / non-deterministic reads done inline** — the current time (`new Date()`, `Date.now()`),
     randomness (`Math.random()`, `crypto.randomUUID()`), env/config, the network clock — must go
     behind an **injected interface** (a `Clock`/time provider, an id generator, a config port), never
     an inline call, whenever the module's output depends on the read (a persisted timestamp, an
     expiry, a generated id). Inline = non-deterministic and untestable; an injected collaborator is a
     seam production wires to the real impl and tests wire to a fake. Propose the interface up front.
   - repeated component-local CSS or SCSS (or any styling) that should become shared primitives, design
     tokens, utilities, or theme rules
5. Recommend the **narrowest** design that assigns each responsibility one clear owner — without
   over-generalizing. The right seam is reusable *because* it is right, not because you aimed for reuse.
6. Define the ownership boundary before implementation:
   - where each responsibility's module lives
   - the consumer locations
   - the tests that should exist alongside each piece (a pure decision is tested without IO)

## Derivability — ask it FIRST, and answer it with a measurement

**Before any other question**, for every field, table, cache, snapshot, or sync mechanism the change
would introduce *or inherit*: **what does it hold that cannot be derived from what is already there?**

Answer with a **query against real data**, not an estimate. Then:

- **"Nothing"** → do not store it. Derive it. The mechanism is the defect, and every bug it produces
  will look like a new bug and get *repaired* instead of removed.
- **"Only the exceptions"** (a user decision, a manual override — something no rule can recompute) →
  store **only the exceptions**, never the whole state. A stored full state that is 99% derivable is
  the same defect with a smaller blast radius.
- **"A lot"** → store it, and say in the note what keeps the two copies from diverging.

This is the highest-leverage question in the review, because a stored derivable value is **a second
place where the truth can differ**. The cost never appears at the moment of the choice; it appears
months later, as work that should not have existed.

⚠️ **The measure is EFFICIENT, not SHORT** — and they are often opposites. Deleting a mechanism is a
big diff today and the cheapest path overall; patching around it is a small diff today and pays
forever. Count the work that will not have to exist, not the lines you are about to touch. A change
that removes a stored copy is *supposed* to look bigger than the patch it replaces.

Three rules that make it bite:

- **It applies to mechanisms you INHERIT, not only ones you add.** Touching a snapshot without asking
  what it holds is the same mistake made standing still. "It was already like that" is the
  rationalization this kills.
- **It applies to tools and checks too**: a validator, a linter or a report that needs another component's values (a
  formula's constants, a limit, a lookup table) reads them from that component's source or exports, never a restated
  copy — a restated constant is a check that passes against a system that has already changed. The set of files a
  check judges is such a value: read it from the version control the CI checks out, not a disk walk with a
  restated skip list (walked, a check passed on the machine that had the ignored files and failed in the CI).
- **It applies HARDEST while fixing a defect in such a mechanism** — the blindest moment, because
  repairing feels like progress. If the fix is "recompute the stored copy on a trigger / a button / a
  save hook", STOP: that is the mechanism defending itself. Ask whether the copy should exist.
- **It runs backwards too: ask it of what the code OVERWRITES** (an upserted row, a last-wins retry, a refreshed cache).
  If the replaced value is the only record of *why* something happened, every pass destroys evidence: keep the
  exception (what was discarded, with its duration and reason), not the whole history.
- **Measured example**: a table storing a schedule's history held 276 rows, none carrying a user decision, none the
  matching rule would not rebuild from the ledger — around it had grown a write path, a known defect, a panel and a
  repair button. **One query months earlier would have said it should be a query.**

## Hard fails (a design the review MUST reject, not merely "note")

These are not soft smells to mention — if the change would introduce one, the review's verdict is
**reject the design and name the correct owner**, before any code is written. Say so explicitly.

- **A concrete member-name branch in shared/multi-member code is a HARD FAIL.** When a module is
  shared across a family (providers, source-types, payment methods, channels, tenants, plan tiers…),
  it must **name no concrete member** — no `if (x === "<memberName>")`, no `switch (member)`, no
  per-member boolean flag (`xIsMember`), no member-keyed literal buried in a helper. The behaviour that
  differs by member **belongs to the member** (a strategy method / per-member metadata the member
  self-declares), and the shared code **asks the member** (dispatch by a registry the members
  populate). If you catch yourself writing a concrete member's name in shared code, STOP: the
  responsibility is misplaced. Treat "it's just one `if`, copied from the old code / it's the quick fix
  / it's urgent, I broke it" as the exact rationalization this rule kills. It applies even to a
  one-line tweak and **especially** when fixing a regression you just introduced.
- The test for "is this shared code?": more than one member reaches it, OR it lives in a shared/
  strategy/registry/component file rather than in that one member's own module. If yes, a concrete
  member name in it is the fail.
- The fix is always the same shape: move the differing behaviour into the member (method or metadata),
  give the shared module a generic seam (interface + registry dispatch), and — when a member is
  absent/unspecified — a **generic default member** (e.g. a null/manual/none implementation), never a
  special-case branch in the shared code.

## Decision rules

- **Before rebuilding or replacing something, find who uses it and look at it there.** Search for every reader of
  it; nothing reads it → remove it, don't rebuild it. Something does → inspect it in that context first: a defect
  that only shows where it is used (wrong orientation, an overlap) belongs in the rebuild's scope.
- **The field's standard method before your own.** When the change enters a problem the project has not solved before
  and the industry solves a known way (a rendering or modelling technique, a sync protocol, a scheduling algorithm),
  find that method first — a short research with sources — and design from it. Home-made attempts fail one at a time
  for reasons the standard method already answers; three tries were spent that way before one search named it.
  Then list what the method assumes about the thing it is applied to and check each against this project: a
  method written for a whole object, applied to one of its separately built pieces, breaks where the pieces meet
  (a motion meant to bend the whole moved one piece off the static one it stood on). **Probe the chosen tool on the
  hardest case at the target size before planning around it**: a tool can have a floor or a ceiling its docs don't
  state (an automatic remesher would not go below ~30× the budget of the smallest parts, whatever its settings).
  The same before a long run judged by one total (a sum under a cap, a full rebuild): try each part's target with
  the real tool first — a table of budgets written on paper failed a 3-minute build three times on parts the tool
  could not bring that low.
- **Never read an input back from what the operation itself writes.** If a job decides which records
  to process by a field it then overwrites (e.g. "unprocessed = status is empty", then it sets the
  status), its second run reads its own output and skips or reprocesses the wrong ones. Take the input
  from its source (an explicit flag or list the job never touches), so running it twice gives the same
  result. The same trap the other way: a setup that walks only what it has not handled yet (the items still
  unmapped, unlinked, unconverted) never revisits what it set up before, so a changed rule silently skips them —
  a re-run setup walks everything it owns, its own earlier output included, and reads the current set from the
  source: its earlier output kept as input also carries entries the source no longer has (stale mappings from an
  older version failed a setup that walked its own map) — drop what it owns, then rebuild from the source. A
  builder that names what it makes drops its earlier output first too: where a name clash renames the newcomer
  silently (a `.001`, a `(1)`), the next steps found the old outputs by name and shipped them.
  A **fallback** runs on the original input too, never on the failed attempt's output: a repair applied to what the
  stuck first try left produced a broken shape that passed its own count.
  A retry or fallback that **did not measure** never replaces an outcome that did (the verdict is the last attempt that
  produced an answer, the others are kept beside it), and a retry the remaining budget cannot finish is not started.
- **A write decided from reads that refresh independently is conditioned where it lands.** When client code
  decides to write by combining reads that come back separately (a summary and a settings record, two cached
  queries), one can be newer than the other, and the decision can undo a change the user just made (an automatic
  value overwriting one just set by hand). Put the precondition in the write itself — a compare-and-set on the fields
  the decision relied on (`WHERE auto = true AND status <> 'archived'`) — and do not decide while any of the reads is
  refetching; the client-side guard alone is not enough. A unit test that resolves the reads in a fixed order cannot
  see it: a refreshed summary arriving before a stale settings record rewrote a value just fixed by hand, silently.
- **Explain a measurement from the control flow that produced it, never from the arithmetic of its numbers.** Numbers
  that add up (100 + 30 = 130) fit more than one story. Read the code each one passed through — what is retried, cut or
  skipped — and when two stories fit, take the measurement that tells them apart before either is written down.
- **A step that deletes or rewrites by a rule is bounded to where the rule is meant, and its output looked at.**
  A cleanup that removes whatever a test touches (near a moving part, matching a filter) finds far more than the
  case it was written for when the inputs change: unbounded, one removed half of an unrelated part and left its end
  floating. Name the region or set it may act on, and show what it removed before keeping the result.
- **A check, computation or export whose result depends on an ambient mode establishes that mode itself.** A global
  setting (a display or preview mode, a simulation state, a locale, a flag) is set for the run and restored after,
  never inherited from whatever the caller left: inherited, a validator ran against the inert state and passed
  everything (0 % defects; forced to the real state, 16 %), an exporter would have written every animation as the
  rest pose, and a bake whose rays saw every visible object in the scene turned a map 83 % black — all without an
  error. A check that reports the same result for every variant it is given is measuring
  nothing — treat that as a finding, not a pass. The same for a **tool's own default** the output passes through (an
  importer's threshold, a library's limit): it is a choice made for you — measure it at the real use (left at its
  default, an importer drew the coarse model at the very distance the user sees it).
- **Name the frame every measured input lives in.** A value measured in one frame — a pose, a coordinate space, a
  colour space, a unit, a sample's conditions — and used in another gets one explicit conversion, in one place.
  Placed in the frame it was measured in, a piece was right in the reference and wrong wherever it is actually
  seen; calibrated against a transformed view (a tone-mapped image) instead of the source values, a correction
  distorted what it was meant to fix. State in the note, per input, where it was measured and where it is used.
  The same for what a moving thing accumulates over time (a trail, a history, a running sum): keep it in the frame
  that moves with it — kept in the outer frame, a jump of its owner is drawn as a streak.
- **Select by the property that defines the role, never by position.** "The first item / the first
  config entry / `items[0]`" holds only while the order does; when the collection changes, the code
  silently picks something else. Name the property that makes it the right one (its type, a key, the
  largest, the one with the field set) in the note. Being *listed* is not that property: where every member lists
  the same references (each part of a model listing all its bones), "the one that references X" matches them all —
  select by what actually binds it to X (its weights, its owner field), and check the pick on real data. Being
  *named* is not being *done* either: a trigger read from free text (a shell command, a log line) matches only the
  part that acts — a quoted message or a here-document that names the command runs nothing (a hook matching the
  whole command text fired on a commit message that quoted it).
- **Find by name only with the owner's name for it.** A shared helper that looks something up by a conventional name
  (a part called "main", a field called "id") takes the name from the member that owns that vocabulary, and says so
  when it finds nothing — a lookup that silently did nothing hid that one member names the part differently.
- **A default or setting shared by every member of a family** (every request, record, view, render window, timeout):
  first list the members that already do that job their own way, **and the kinds of member the family has**, and
  decide each before writing. Applied on top, the default doubles what a member had tuned (usually the member
  declares itself the exception, and the default leaves it alone); and a value calibrated on one kind of member
  says nothing about another kind until it is measured there. The same check runs the other way when a **member
  joins** later: list the behaviours the family applies to every member and decide each for the newcomer.
- Prefer separating a rule/decision (pure, no IO) from the data access (repository) and the external
  call (gateway) — even inside "one" function. Mixed responsibilities are the smell, and splitting
  them is what makes each reusable.
- Prefer reusing or extending existing code when a stable abstraction **already owns that
  responsibility**; don't bend an abstraction that owns a *different* responsibility just to avoid new code.
- Prefer enums or typed named constants over raw numeric codes when the value set is finite and part of the domain;
  named constants over semantic literals; time, randomness and config injected — as the review workflow's step 4
  says, each surfaced in the note.
- Prefer shared styling primitives, design tokens, or utility layers over the same CSS repeated across components,
  and themeable semantic color tokens over hardcoded product colors.
- Do not wait for duplication to land in code if the responsibility clearly recurs.
- **Do not force a generic abstraction for reuse's sake.** If the use case is truly isolated, a
  correct local implementation beats a premature "reusable" one. Reuse that isn't a consequence of a
  shared responsibility is speculation.
- Favor explicit inputs/outputs and small extension points over oversized generic frameworks.

## File placement — decide the FOLDER, by domain, before writing

A responsibility with the right pattern can still land in the wrong **folder**, and that is the
failure this section exists for: nothing catches it. Lint, types, and tests are all indifferent to
where a file sits, so a misplaced file survives every gate and is only ever found by a human reading
the tree — usually months later, when the folder no longer tells anyone what lives in it.

The characteristic shape is **accretion**: a folder named for one concept (`tiers/`, `handlers/`,
`validators/`) starts collecting things that merely *relate* to that concept — a shared vocabulary
both sides read, an orchestrator, a presentation adapter, a constants module. Each addition is
individually defensible and the folder's name becomes a lie by degrees (measured: a `tiers/` folder of 11 files,
4 of them tiers; a presentation adapter importing from it to learn a constant no tier owned).

So for **every file the change creates or moves**, state in the note:

1. **Its one responsibility**, in a short phrase. A file needing "and" is two files.
2. **The folder that owns that responsibility**, and *why that one* — what the folder's name claims,
   and whether this file is an instance of it or merely related to it.
3. **Its layer relative to its neighbours**: does it sit *above* the folder it serves (a contract both
   sides read), *inside* it (one implementation among peers), or *beside* it (a sibling concern)?
4. **Direction of dependency** — what it imports and what imports it. Then check the folder stays
   **acyclic**: if files inside a folder import upward, the upward targets must be leaves.

Two rules that follow, and are worth applying mechanically:

- **A contract shared by two layers belongs ABOVE both, never inside one of them.** Parking it inside
  one layer forces the other to import an implementation folder to learn an interface.
- **Pure data/vocabulary that no single implementation owns gets its own module.** The moment a
  non-implementation has to reach into an implementation folder for a constant, the constant is in the
  wrong place.

If the change reveals a folder that has already accreted (its name no longer describes its contents),
say so and propose the split — a move is cheap while the work is open and expensive later.

## Output format

Return a concise planning note with these sections (design first, reuse derived):

- `Derivability` — for every stored thing the change adds **or touches**: what it holds that cannot be
  derived, and the **measurement** that says so. Write "n/a — nothing stored" when nothing is stored;
  never omit the section, because omitting it is how the question stops being asked.
- `Responsibilities & Patterns` — each job + the pattern/owner that expresses it
- `Recommended Approach`
- `Reuse (Direct / Extend / New)` — what falls out of the responsibilities above
- `File Placement` — per new/moved file: responsibility, owning folder + why, layer, dependency
  direction. Flag any folder that has accreted.
- `Implementation Boundary` — owners, consumers, tests per piece
- `Risks To Avoid`

If a responsibility has no existing owner and won't recur, say so explicitly and justify the local
implementation.

## Boundary

- This skill runs **before** code changes; it does not replace implementation or post-change checks.
- Once implementation proceeds, write to the `clean-code-standards` bar (plus the matching
  per-language layer), and use `verification-gates` (or the project's compliance audit) afterward to confirm the
  result is green and regression-free.
- The `File Placement` decisions above are **checked on the way out** by `verification-gates`'
  file-placement gate — it verifies where the files actually landed and what each folder now contains.
  That pairing is the point: no automated tool can see folder organisation, so placement has to be
  decided here deliberately and re-read there explicitly, or it is never verified at all.

## Multi-task plans: review per TASK, gate once at the END

- **This review runs before EVERY task** of a planned sequence, not once for the plan — a plan's design
  section does not substitute for it ("the design is already written down" is the rationalization). Scope it to
  that task: the responsibilities it introduces, what owns them, the boundary it must not cross — a short note.
  Exception: a task with no behaviour effect (a rename, a comment, formatting).
- **`verification-gates` runs ONCE, at the end**: per task only the tests covering it; the full sweep where the
  program is whole — earlier only if a task touches what the covering tests can't see (a shared type, a build
  config, a public interface).

The shape, in one line: **review → build → covering tests → (next task) … → gates once at the end.**
