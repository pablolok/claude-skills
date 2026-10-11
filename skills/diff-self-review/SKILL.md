---
name: diff-self-review
description: Use before every commit and before declaring work done, and when accepting another agent's diff — read the REAL diff (staged, unstaged, untracked) and trace every hunk to the stated ask, so nothing changes behaviour that nobody asked for. Catches changed defaults, signatures, error text, ordering, conditions, swallowed errors, drive-by refactors and leftovers; each is reverted or declared in the hand-back. Intent tracing, not a bug hunt; verification-gates owns the gates and removals.
---

# Diff Self-Review

Green gates prove the code still passes its tests; they do not prove it does only what was asked. This skill closes
that gap: before a change is committed or handed back, read the diff that actually exists — not the memory of what
you meant to write — and trace every hunk to the ask. A behaviour change nobody asked for is reverted or declared.

## When

- Before every commit and every "done", after `verification-gates` — a green change can still carry an unasked one.
- When accepting a diff from another agent, a worker or a contributor — read their diff, not their report.

## The procedure

1. **Write the intent first.** The ask in one or two lines, and the list of behaviours that must NOT change.
   Without it there is nothing to trace against, and every hunk looks justified.
2. **Read the real diff, whole.** `git diff` for what is unstaged, `git diff --staged` for what will be committed,
   and every new untracked file (`git status --porcelain`, then read each one). Never a summary, never through
   `head`/`tail` — the hunk you cut off is the one you did not mean. A large diff is read file by file, but every file.
3. **Classify each hunk.**
   - (a) **required by the ask**;
   - (b) **a necessary consequence** — a caller updated for a changed signature, a test for the new behaviour;
   - (c) **unasked** — a refactor, a rename, a reformat, a drive-by fix, a cleanup, a debug leftover.

   Each (c) is reverted, or split into its own declared change, or kept only when the hand-back names it with its
   reason. An unasked hunk that slips in silently is the regression nobody will look for.
4. **Hunt the deltas that look harmless.** Each one changes what a caller, a test or a person sees:
   - defaults: parameter defaults, config values, feature flags, timeouts, limits, retry counts;
   - contracts: public signatures, return shapes, field names, serialized formats, CLI flags, exit codes;
   - text others match on: error types, user-visible messages, log lines;
   - ordering, sorting, rounding, encoding, time zone, locale;
   - conditions widened or narrowed: `<` for `<=`, an added `or`, a new early return, a reordered guard;
   - errors caught and swallowed that used to propagate, or a broader `catch` than before;
   - log levels changed, or a log removed that something alerts on;
   - dependency, lockfile or toolchain version changes;
   - permissions, file modes, environment variables read or set;
   - generated files, formatting churn, whitespace-only hunks that bury the real ones;
   - leftovers: debug prints, commented-out code, new TODOs, temp files, local absolute paths, secrets or tokens.
5. **Follow each change across files.** For every public symbol, default, flag or message the diff changed, search
   the repository for its OLD name or value: callers, docs, tests, configs, fixtures that still assume it. A rename
   the diff finished in one file and not in another is a break the tests may not reach.
6. **Write the hand-back in plain words.** What changed in behaviour; what was deliberately left unchanged; every
   unasked change kept, with its reason. Claim "no behaviour change" only when the classification left nothing in
   (c) unexplained and the deltas list is empty — otherwise list them.

## Accepting someone else's diff

The same procedure, on their actual diff (`git diff <base>...<branch>`, or the worktree they worked in). A report
that says "only X changed" is a claim to check, not evidence: the intent is the task you gave, and every hunk is
traced to it. What their report does not mention but the diff contains goes back to them, or into your hand-back.

## Checklist

- [ ] The intent is written: the ask, and what must not change.
- [ ] The diff was read whole — unstaged, staged and untracked — not summarised.
- [ ] Every hunk is (a), (b) or a declared (c); nothing unasked is silent.
- [ ] The harmless-looking deltas were checked, one by one.
- [ ] The old name or value of every changed public thing was searched for.
- [ ] The hand-back states what changed, what did not, and every unasked change kept.

## What this is not

- Not a bug hunt: a code review (`/code-review`) looks for defects; this checks the diff against the ask.
- Not the gates or the removals: `verification-gates` owns green evidence and unexplained removals.
- Not the design: `pre-implementation-review` decides the shape before code exists.
