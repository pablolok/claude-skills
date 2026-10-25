---
name: writing-architecture-docs
description: Use when a piece of work must be designed before it is written — a large feature, a rework, a defect that crosses several layers, a multi-phase job — or when the question is "how is it built today", "what shape must it take", "why this and not something else". Any project, any language. The diagram mechanics are NOT here — they are in the mermaid-diagrams skill.
---

# Architecture documents

An architecture document answers three questions, in this order: **how it is built today**, **what shape it must
take**, **why that one and not another**. Without the third it is not a design, it is a description — and a
description makes nobody take a decision.

The file sits next to the work's spec:

```
<docs>/<work-name>/
  spec.md          the report, the requirements, the point evidence
  architecture.md  this
  diagrams/        NN-name.mmd + NN-name.svg
```

## The project's conventions come first

What this skill gives — section names, the citation of an entry, folder names, the notes written into a document —
are **defaults**. Before writing, read how the project already does it: its existing architecture documents, its
backlog register's preamble (and the **.claude/backlog.json** the backlog skill's gates read), its CLAUDE.md or
AGENTS.md. The document is written **in the project's language**, its sections named in the project's terms, its
entries cited in the project's format; the structure below (the questions, their order, what each section holds)
stays. A project that declares nothing gets the defaults.

## ⚠️ Two documents, two places, two lives

The first question — **how it is built today** — does not live as long as the other two, and keeping them in one
file makes them rot together. When the area is also **described stably elsewhere** (a living document in the
project's architecture folder — `docs/architecture/` by default, the backlog's `architectureDir` — the one that
answers "how does X work"), the two split like this:

| | where | what it holds | when it changes | when it dies |
|---|---|---|---|---|
| **the code as it is NOW** | `docs/architecture/<name>.md` | the current shape, the **measured** defects with their evidence at `file:line`, the invariants, and **the map `defect / closed by / state`** | **when the code it describes changes** | never — it outlives the entries that cite it |
| **the architecture being CHANGED** | the document the work already has — `spec.md`/`plan.md`/`report.md` — with `diagrams/` beside it | the target shape with its diagram, the phases, which defects it touches, the acceptance criterion | when the plan changes | with the work: it goes to `archive/` |

⚠️ **The split is between the two PLACES, not inside the work's folder.** There, merge: an `architecture.md` next to
a `plan.md` that already has "The design" and "Acceptance" duplicates instead of splitting. A new file name is added
only when it answers a question the others do not.

**The defect map lives in the stable document**, not in the work's: an entry's folder goes to `archive/` when the
entry closes, and would take with it the only place that says **which defects nobody is closing** — exactly the ones
no open work can keep. The work's document keeps one line: which defects *this* work touches.

The reason is that the first file **outlives** the work and the second does not. A stable architecture document that
carries the phases of an entry closed months ago is one nobody trusts any more; and an acceptance criterion parked in
a file headed for `archive/` vanishes exactly when it is needed to verify the work.

From this follows the more useful rule of the two: **the acceptance criterion is written in the migration's document,
and points at the architecture document.** Not "when done, the code will do X" — which nobody can check — but
*"updating `architecture/<name>.md` must produce these transformations: the two-column table becomes one column,
defect D3 leaves the open defects, the document's title no longer holds"*. **If the update does not produce them, the
work is not done**, however the code looks. It works only because the target is a file **someone else maintains**:
that is the reason the two are kept apart, not a consequence of it.

If the area has **no** stable document, the three questions stay in one file — the split is for when there is
something to split, not for symmetry.

## When it is needed, and when not

| needed | not needed |
|---|---|
| the work touches several layers, or redraws them | the change has an obvious implementation |
| the defect is **structural** (it comes back if you patch it) | it is a point bug: the spec is enough |
| there is a real alternative to reject | there is only one road |
| the work ships in several phases | it is one commit |

The line with the spec is sharp: **the spec carries the facts, the architecture carries the shape.** The report, the
requirements and the point evidence live there; here they are linked, not repeated.

## ⚠️ The tail of a LIVING document: four sections, always the same

For the stable documents in the architecture folder, and the part forgotten first — because it is the only one that
speaks not about the code but about **who keeps it**. At the end, in this order:

| section | what it holds | what it asks the reader |
|---|---|---|
| **Open defects** | numbered items `D<n>`, each with its evidence at `file:line` | *"this must be done"* |
| **Declared limits, and what they cost** | **measured and accepted** consequences of the design, which nobody will close | *"this is the price, and here is how much"* |
| **Defect owners** | `D<n> / closed by / state` | the only place that shows **what nobody is closing** |
| **Who worked on it** | `<entry> / what it left in the code` | the story lives here, **one line per entry** |

These are the default names. A project names them in its own language and terms — take the names its existing
architecture documents use. When the project runs the `backlog` skill's gates, which look for these sections, its
names are declared in **.claude/backlog.json** (`words`: `openDefects`, `owners`, `contributions`, and the owner
column's `ownerColumn`), so the gates find them; the document never bends to the defaults. An entry is cited in the
project's format; under the backlog gates that is `[[BKLG-NNN]]`, the form they read as a citation.

The first two under one heading make the area read as **half broken**: a defect to close and an accepted limit do not
ask the same thing. And a limit **is not deleted** when it is decided not to close it — the measurement behind the
decision would vanish, and in three months someone proposes again the remedy already rejected.

A number **leaves** when the **CODE** changes, and **moves** between the first two when its *nature* changes, not its
weight (rule 3: numbers are never recycled).

⚠️ **There is no "Closed defects" section**: it is how the story climbs back in through the window — a closed item
reads as current state. What an entry closed is **one row in "Who worked on it"** (rule 4).

The same holds for the **empty** section: *"None"* under "Open defects" is information — it says there is no pending
work on the area, not that nobody looked.

## The skeleton

Five sections. Each exists for a question; if a question has no answer, the section is removed, not filled. The
titles are the questions, written in the document's language.

| # | section | must contain |
|---|---|---|
| 1 | **How it is built today** | the diagram of the current layers, the **numbered structural defects** (D1…Dn), and **the count** |
| 2 | **The founding decision** | the real options side by side, the rejected ones **with their cost**, and the choice |
| 3 | **The target architecture** | the diagram of the new shape, how the layers talk (a numbered list), the components in UML, the critical path |
| 4 | **Design decisions** | the table `# / decision / choice / why`, **what does NOT change**, **the main risk** |
| 5 | **Phases** | the table `phase / what it delivers`, and which phase first gives the user back what they reported |

When there are two files, section 1 **is not duplicated**: the numbered defects live in the stable document (they are
measured properties of today's code, and close when the code changes), and the migration's document refers to them
with a **`defect / closed by / state`** table. That table is also where *what is missing* shows: defects with no work
to close them are marked, not left implicit.

## Document quality

Before drafting or changing an architecture document, read
[document quality](references/document-quality.md): proven numbered defects, measured claims,
reference ownership, decision tables and updates to existing diagrams. Those rules apply to the
document being changed, not to an unrelated sweep of every architecture document.

## Diagrams: one per question

| the section's question | type | how |
|---|---|---|
| how it is built today / the target shape | `flowchart TD` | one `subgraph` per layer, the arrows say who calls whom |
| which options there were | `flowchart LR` | one branch per option, a `classDef` to mark the chosen and the rejected |
| which pieces it is made of | `classDiagram` | `<<interface>>` on the contracts, the relations between the classes |
| how the critical path runs | `sequenceDiagram` | `alt`/`else` for the two worlds (online / offline) |

One diagram per question: two diagrams that say the same thing mean the question was one. **The diagram carries the
structure, the prose carries the numbers** — a label that wants a sentence is prose in disguise.

**From three diagrams up, live blocks do not show** — the VS Code preview cancels the render in progress and leaves
empty boxes, with no error. Above that threshold the sources live in `diagrams/*.mmd` and the document embeds the
SVGs. Procedure, validator and renderer: the **mermaid-diagrams** skill. The document opens with the note that says
why — written in the document's language, like the line under each image; the project's own wording, when its
documents already carry one, wins over this default:

```markdown
> The diagrams are **SVGs pre-rendered** from the sources in `diagrams/*.mmd`, not live mermaid blocks: the VS Code
> preview cancels the render in progress on every update. Details in the `mermaid-diagrams` skill.
```

and under each image goes the line that makes the `.mmd` the source of truth:

```markdown
![What it shows](./diagrams/01-name.svg)

<sub>Source: [`diagrams/01-name.mmd`](./diagrams/01-name.mmd). Regenerate with `node scripts/mermaid.mjs render <the-diagrams-folder>` — see the `mermaid-diagrams` skill.</sub>
```

## Common mistakes

| mistake | how to spot it | what to do |
|---|---|---|
| it describes instead of deciding | no rejected option, no cost | section 2, or the document was not needed |
| it repeats the spec | half a page of the report | link the spec |
| defects as a bug list | "an `await` is missing in X" | it is a bug: spec or backlog, not here |
| the diagram explains | labels a sentence long | the sentence goes in the prose, the diagram stays structure |
| a decorative diagram | it answers no question of the table | remove it |
| the story of the fix, or dated correction blocks, stay in the document | past-tense paragraphs ("it was broken", "closed by [[BKLG-…]] because…"), several `> Corrected on …` | rule 4: rewrite the present right; the story goes into the entry, one line stays in "Who worked on it" |
| the frame tells the WORK, not the code | headings like "the case that started all this", "what does NOT change" (in a stable document), "axis A: OPEN" | the content is often fine where it is: change the **frame**. A measured case is a **worked example of the rule** ("the gate at work, with the numbers"), not the origin of an entry; invariants are **properties the code keeps**, not promises; a state is "they diverge", not "OPEN" |
| phases that list files, or prose updated over an old diagram | "F2 — changes to network.ts"; the picture says the old thing | rules 8 and 9: write what a phase delivers; regenerate the `.mmd` in the same pass |
