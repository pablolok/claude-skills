# Writing Architecture Docs

How to write the design document of a piece of work that has to be designed before it is written — a large
feature, a rework, a structural defect across layers, a multi-phase job — and the stable "how it is now" document
of an area.

## What It Holds

- **The project's conventions first**: the document is written in the project's language, its sections named and
  its entries cited the way the project already does; the skill's names and formats are the defaults.
- **Three questions, in order**: how it is today, what shape it must take, why that one and not another.
- **Two documents, two places, two lives**: the stable doc in the architecture folder (`docs/architecture/` by
  default) describes the code as it is now and owns the defect map; the work's own doc carries the target, the phases and the acceptance criterion, and
  is archived with the work.
- **The skeleton** (five sections) and **the tail of a living doc** (open defects, declared limits, who owns each
  defect, who worked on it).
- **Nine rules**: defects structural, numbered and proven at `file:line`; counts measured; a closed defect leaves the
  doc; the past lives in the backlog entries; a rejected alternative with its price; decisions in a table; "what does
  not change" and the main risk; phases by what they deliver; the diagram updated in the same pass as the prose.
- **One diagram per question**; the diagram mechanics (validator, renderer, `node scripts/mermaid.mjs render …`)
  are in the `mermaid-diagrams` skill.

## Where It Sits

The `backlog` skill opens the entry and its doc folder; this skill shapes the design doc in it; `mermaid-diagrams`
validates and renders its diagrams.

## Installing

`claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install writing-architecture-docs@pablolok-skills --scope user`.
