# Pre-Implementation Review

Use this skill before coding to decide the right design for the planned work: its responsibilities, the pattern
that expresses each, who owns each one and the seams between them. Reuse, testability and low duplication follow
from that design; they are not the starting point.

## What It Checks

- **derivability first**: whatever the change stores or inherits (a field, a cache, a snapshot) holds only what
  cannot be derived, measured on real data
- the responsibilities hidden in the request, the pattern and owner of each, and the seams that make them testable
- **hard fails**: a concrete member's name branched on in shared code is rejected, and the behaviour moved to the member
- what already implements a responsibility (reuse or extend), derived from the design
- duplication and design-smell risks: repeated widgets, rules, numeric codes, semantic literals, ambient reads
  (time, randomness, config), component-local styling and hardcoded colours
- where each new or moved file belongs (its folder, its layer, the direction of its dependencies)

## Typical Trigger

Use this when a request is still in the reasoning or planning phase, especially for:

- UI features that may repeat across screens
- shared backend or service logic
- validators, mappers, request builders, or orchestration flows
- repeated semantic string literals that should probably become shared constants, resources, or configuration
- refactors whose design should be decided before any code is written

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install pre-implementation-review@pablolok-skills --scope user` (every project) or
`--scope project`. A hook that gates on this skill sees the name
`pre-implementation-review:pre-implementation-review` when it runs from the plugin: match the part after the last
colon.

## In a Task Workflow

Run the review at the start of each task, once the task is picked and before tests or implementation begin.

If the review changes the intended implementation boundary, identifies reusable abstractions that deserve explicit
tracking, or reveals additional consumer/test work, update the task's plan before coding starts.
