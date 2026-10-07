# Verification Gates

Use this before handing code work back as done: the required automated gates are green — tests, builds, compilers,
bundlers, linters, static analysis — and nothing was silently removed. It confirms green evidence rather than
assuming it, in any stack.

## What It Checks

- who runs the gates: the agent where the project expects it, the user where the project says so — and a gate
  counts as passed only on real evidence
- the gates that cover the changed code paths, with the expected gates per stack
- design-constraint gates beyond the tools, and where each new file landed
- remediation: what to do when a gate is red

## Where It Sits

The "verify clean" back-half of `clean-code-standards`: plan clean (`pre-implementation-review`) → write clean
(`clean-code-standards` and its language layer) → **verify clean**.

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install verification-gates@pablolok-skills --scope user` (every project) or `--scope project`.
A hook that gates on this skill sees the name `verification-gates:verification-gates` when it runs from the plugin:
match the part after the last colon.
