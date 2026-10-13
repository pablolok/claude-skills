---
name: test-design-standards
description: What a good test is made of, in any language. Use whenever writing, changing or reviewing tests — a bug fixed from a test that reproduces it, behaviour through the public seam, one behaviour per test, deterministic and isolated (no clock, sleep, run order or shared state), doubles only for what the unit does not own, every state and error path, the right level, timing tests run alone, flaky tests fixed or quarantined, never silenced. Layers on clean-code-standards; not the TDD loop.
---

# Test Design Standards — the shape of a test and of a suite

What a good test is made of, in **every** language: what it exercises, how it is built, what it doubles, where it
sits in the suite. It layers on `clean-code-standards`, whose item 10 ("Tests for new logic") owns the assertion
rules — an absence check also asserts the thing happened, bounds on both sides, the test seen red first, each state
built for real; apply them as written there. The red-green loop itself belongs to a TDD skill and is not restated
here. The framework and the coverage bar come from the language layer or the project.

## Checklist (always apply when writing, changing or reviewing tests)

1. **A bug fix starts from a test that reproduces it**, through the path the user hit (the same entry point, the same
   input shape), and that test fails on the current code **for the reported reason** — not on an import error, a
   missing fixture or an unrelated assertion. A red for the wrong reason proves nothing about the fix.
2. **Test behaviour through the unit's public seam**, never its implementation: no calls to private members, no
   assertions on the order internals are called in, no reading the source text. A refactor that keeps behaviour keeps
   the tests green; one that turns them red was tested on its wiring, not its contract.
3. **One behaviour per test, named for it.** The name states the behaviour and its condition ("when the order is
   empty, the total is zero"), so a red names the defect without opening the test. Two behaviours in one test hide
   the second whenever the first fails.
4. **Arrange, act, assert, visibly.** The setup a reader needs to understand the case is in the test; shared fixtures
   carry only incidental setup (a connection, a clock, a temp folder). A fixture that hides the input under test is a
   defect: the reader cannot see why the expected value is right.
   A parity test between a wrapper and the function it calls is tautological — it passes when both are wrong. Pin
   literal expected values (computed by hand, with the reason) for each case instead.
5. **Deterministic.** No dependence on wall-clock time, sleeps, real network, unpinned random seeds, locale or time
   zone, filesystem listing order, hash-map or set iteration order, or the order the tests run in. Time, randomness
   and generated IDs come in as injected collaborators (`clean-code-standards` item 3) and are fixed in the test.
   Waiting is on a condition with a bound, never a fixed sleep: a sleep is too long on a fast machine and too short
   on a loaded one.
6. **Isolated.** Each test builds its own state and cleans it up — temp directories, environment variables, globals,
   singletons, the working directory — and restores what it borrowed. Every test passes alone, in any order, and in
   parallel unless explicitly marked otherwise; a test that passes only after another one is testing the other one.
7. **Double only what the unit does not own**, and what is slow or non-deterministic (network, clock, external
   services, the filesystem when it is not the subject). Never mock the unit under test or a value object. Prefer a
   fake with real behaviour (an in-memory store) over a mock scripted call by call, which restates the implementation.
   A double of a seam changes with the seam, in the same change: a stale double keeps a broken contract green.
8. **Every boundary and every state the code distinguishes.** For each input: empty, single, many, the edges and the
   invalid cases the code treats differently. Each error path the code has gets a test that asserts the error's type
   or meaning (which argument, which record), not merely that something raised: the wrong error passes "raises".
9. **The lowest level that can observe the behaviour.** Most tests are unit-level; a few end-to-end tests prove the
   real wiring. A test that needs the whole stack to check a pure rule is at the wrong level: slow, brittle, and its
   red points nowhere.
10. **Timing-sensitive tests run alone.** Performance budgets, timeouts and rate checks are marked as such and run
    outside the parallel suite, where load from other tests turns them red without a defect.
11. **A flaky test is a defect.** Reproduce it — alone, repeated, under load — then fix the cause, or quarantine it
    visibly with a tracked reason and an owner. Never retry until green in silence, never delete it to get green,
    never loosen its assertion until it passes: each hides the defect the flake was reporting.
12. **Test code is code.** The same naming and clarity bar as production code, but explicit repetition beats clever
    abstraction when it keeps each test readable on its own. No logic in a test (loops, branches, computed expected
    values) that could itself be wrong — except table-driven cases, each case named so a red names its row.
13. **Snapshot and golden tests only for output that is genuinely a whole artifact** (a rendered report, a generated
    file). A change to the snapshot is reviewed like code, never accepted with a blind update: an updated snapshot
    asserts whatever the code now does, the bug included.

## When reviewing tests

Read each test as its red would read: does the name say what broke, and does the setup show why the expected value
is right? Then hunt for:

- assertions on private members, call order of internals, or source text (item 2);
- a sleep, `now()`, an unseeded random, a real network call, or an iteration over an unordered collection (item 5);
- state left behind: an environment variable set and not restored, a global changed, a temp folder never removed,
  a test that fails when run alone (item 6);
- a mock of the unit under test, or a double whose seam has moved on (item 7);
- an error path with no test, or one asserting only that something raised (item 8);
- a retry wrapper, a skip with no reason, a loosened tolerance, a deleted test in the diff (item 11);
- a snapshot updated in the same change as the code, with no reviewed diff of the snapshot itself (item 13).

## Relationship to the other skills

- `clean-code-standards`, item 10: the assertion rules every test here still obeys.
- The language layer (`csharp-oop-standards`, `typescript-react-standards`, …): the framework, its idioms, and the
  coverage bar.
- `verification-gates`: running the suite and reading its totals, and what a red timeout means before calling it.
- `pre-implementation-review`: designing the seams (injected time, randomness, collaborators) that make these tests
  possible before any code exists.
