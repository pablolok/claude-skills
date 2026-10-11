# Diff Self-Review

Use this before every commit and before handing work back as done, and when accepting another agent's diff: read
the real diff — staged, unstaged and untracked — and trace every hunk to the stated ask, so nothing changes
behaviour that nobody asked for. Each unasked change is reverted or declared in the hand-back.

## What It Checks

- the intent, written first: the ask and the behaviours that must not change
- the whole diff, read as it is, every hunk classified as required, a necessary consequence, or unasked
- the deltas that look harmless: defaults, signatures, error text, ordering, conditions, swallowed errors,
  versions, leftovers
- the old name or value of each changed public thing, searched for across the repository
- a hand-back that states what changed, what did not, and every unasked change kept

## Where It Sits

After the gates: `verification-gates` confirms the work is green and nothing was silently removed; this skill
confirms the green change does only what was asked. It is not a bug hunt (a code review does that) and not the
design (`pre-implementation-review`).

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install diff-self-review@pablolok-skills --scope user` (every project) or `--scope project`.
A hook that gates on this skill sees the name `diff-self-review:diff-self-review` when it runs from the plugin:
match the part after the last colon.
