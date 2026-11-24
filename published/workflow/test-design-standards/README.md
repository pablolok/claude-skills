# Test Design Standards

What a good test is made of, in any language: what it exercises, how it is built, what it doubles and where it sits
in the suite. Use it whenever writing, changing or reviewing tests. It layers on `clean-code-standards`, whose item 10
keeps the assertion rules; the red-green TDD loop belongs to a TDD skill and is not restated.

## What It Checks

- a bug fix that starts from a test reproducing the bug, red for the reported reason
- behaviour tested through the public seam, one behaviour per test, named for it, with its setup in view
- determinism and isolation: no clock, sleep, network, unpinned randomness, run order or leftover state
- what to double (only what the unit does not own) and what never to mock
- every boundary, state and error path the code distinguishes, at the lowest level that can observe it
- timing-sensitive tests run alone, flaky tests fixed or visibly quarantined, snapshots reviewed rather than
  blindly updated
- what to hunt for when reviewing tests

## Where It Sits

Apply it together with `clean-code-standards` and the language layer (`csharp-oop-standards`,
`typescript-react-standards`, …), which sets the framework and the coverage bar. `pre-implementation-review` designs
the seams that make the tests possible; `verification-gates` runs the suite and reads its totals.

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install test-design-standards@pablolok-skills --scope user` (every project) or `--scope project`.
Install `clean-code-standards` with it: this skill assumes the core. A hook that gates on this skill sees the name
`test-design-standards:test-design-standards` when it runs from the plugin: match the part after the last colon.
