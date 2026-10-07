---
name: verification-gates
description: Use before declaring code work done / handing it back — verify that the required automated gates are green across any stack (tests, builds, compilers, bundlers, linters, static analysis) and that nothing was silently removed. Applies to changed code in any language. Confirms green evidence rather than assuming it; who RUNS the gates depends on the project (some environments have the user run them). This is the "verify clean" back-half of clean-code-standards.
---

# Verification Gates

Use this before sending code work to the user as "done". The goal is to never hand back work while
required verification is still red, noisy, or unrun — and to catch accidental regressions. It's the
back-half of the `clean-code-standards` skill's cycle: plan clean →
write clean → **verify clean**.

## Who runs the gates

Confirming a gate is green is not the same as running it yourself. **Respect the project's rules on
who runs builds/tests.** In some environments (e.g. a code-only machine with no local stack, or a
repo whose instructions say not to run builds on your own initiative) the *user* runs the gates on
their side and pastes results back. In that case:

- Do not force-run a build/test the project says you shouldn't.
- State exactly which gates must be green and ask the user to run them, or point to the evidence.
- Only treat a gate as passed when there is real evidence — never assume.

Where you *are* expected to run gates, run them and read the output before declaring done.

## What to verify (changed code paths)

1. The required automated gates were **identified from the repository** (docs, scripts, CI config,
   explicit instructions) — not guessed.
2. Each required gate was actually run (by you or the user), or its absence is called out.
3. Required **tests** passed.
4. Required **linting / type-checking / static analysis** passed.
5. Any required **build / compile / bundle / package** step succeeded.
6. Build/compile/bundle/lint/static-analysis output is **warning-free**, unless the repo or user
   documents an allowed warning exception.
7. Warning-free status came from **fixing the underlying issue**, not from suppressing diagnostics
   (pragmas, blanket ignore settings, `.editorconfig` severity downgrades, suppression attributes,
   or equivalents) — unless the repo documents a justified, locally-scoped exception. (Generated EF
   migration files under `Migrations/` are an allowed exception when the suppression stays confined
   to that migration code.)
8. Removals, disabled behaviors, deleted branches, or stripped configuration introduced by the change
   are **justified by the request** — not accidental regressions.

## Rules

- Determine the changed areas and their stacks from the modified files and repo structure.
- Derive the expected commands from project docs, scripts, CI conventions, or explicit instructions.
- Treat **missing evidence as a violation** — don't assume a check passed because no failure was
  mentioned.
- Treat warnings in required build/compile/bundle/lint/static-analysis output as violations unless
  explicitly allowed.
- Treat suppressions that hide required diagnostics as violations (except the EF `Migrations/` case
  above).
- For compiled/bundled codebases, require a successful, warning-free build before "done".
- For mixed-stack changes, require the relevant gates for **each** affected stack.
- Inspect the diff for removals or behavior-reducing edits. If code, markup, styling, config,
  conditionals, or data mappings were removed, confirm the request actually asked for that. Treat
  **unexplained removals as regressions** — blocking even when tests and builds are green.
- If the correct verification command is genuinely unclear, report that as a **blocking gap** instead
  of inventing a command.
- To learn whether a failing gate predates the change, run it on a separate checkout (a worktree, or the gate
  pointed at the base commit) — never by stashing the working tree: a plain stash and pop drops what was staged,
  and the next commit silently leaves files out. Before committing, read the staged list against the files changed.

### Expected gates by stack (examples)

- **C# / .NET:** solution/project build, tests, analyzers, warning-free compiler output.
- **Frontend (Angular/React/Vue/…):** project-standard build, tests, lint, framework diagnostics.
- **Scripts (PowerShell/Python/shell):** relevant tests plus lint/static analysis where defined.
- **Library/package changes:** packaging or import-validation steps when treated as release gates.

## Design-constraint gates (not just automated tools)

Green tests/build/lint do NOT clear the work by themselves — a change can be fully green and still
have landed a design violation the tools don't check. Before "done", also verify the design
constraints the project treats as binding, and treat a violation as **blocking**, same as a red test:

- **No concrete member-name branch in shared/multi-member code.** For any shared/strategy/registry/
  component file the change touched, scan the diff (and grep the touched shared modules) for a concrete
  family-member name used as a branch or flag — a member literal (provider/source-type/channel/tenant/
  plan…) in an `if`/`switch`/`?:`, or a per-member boolean (`xIsMember`). Finding one is a **blocking
  violation**: the behaviour belongs to the member (strategy/metadata) with a generic seam + registry
  dispatch in the shared code (and a generic default member when none is specified), per
  `pre-implementation-review`'s Hard-fails. Do not hand back green work that added one. (A quick grep
  for the family's known member names across the shared files the diff touched confirms each hit is
  data/registration, not a branch.)
- More generally, re-check the standing design constraints for the touched layer (layering — no direct
  data access in presentation/handler code; model constants for domain literals; injected collaborators
  for time/randomness/config; no `any`/warning-suppression). These are verified by reading the diff, not
  by a tool — the tool being green is necessary, not sufficient.

## File-placement gate — where the new files LANDED, and what each folder now contains

**No automated gate can see this one.** Lint, type-checkers, and tests are all indifferent to which
folder a file sits in, so a misplaced file passes every check and is found only by a human reading the
tree — by which time moving it is expensive and the folder's name has stopped describing its contents.
That makes placement a verification step, not a matter of taste, and it is the counterpart to
`pre-implementation-review`'s `File Placement` section: the review decided where each file should go,
and this gate checks where it actually went and what the surrounding folders now hold.

Before "done", for every file the change **created, moved, or renamed**:

1. **One responsibility per file, and the filename states it.** A name needing "and", or a `utils`/
   `helpers`/`misc` name, means the responsibility was never decided.
2. **Its folder's name still describes every file in it.** List the folder's contents and ask what the
   name claims. Then classify each entry as *an instance of that concept* or *merely related to it*.
   Related-but-not-an-instance is the accretion smell — a folder named for one concept collecting
   vocabularies, orchestrators, adapters, and constants that merely touch it. This is the exact defect
   that reached 11 files in a 4-file folder before a human noticed.
3. **Shared contracts sit ABOVE the layers that share them**, never inside one of them — otherwise the
   other layer imports an implementation folder to learn an interface.
4. **Nothing outside an implementation folder reaches INTO it for data.** If a non-implementation
   imports a constant from an implementations folder, that constant belongs in its own module. (Real
   instance: a presentation adapter importing a MIME constant from an implementation's private helper.)
5. **The dependency direction is still acyclic.** Where files import upward out of their folder, verify
   each upward target is a leaf. State the check, don't assume it.

Treat a violation as **blocking, but proportionate**: the fix is a move plus an import rewrite, which
is cheap right now and only gets dearer. A pure move must not change behaviour — so prove it did not
by showing the test count is **identical** before and after, which is the signal that distinguishes a
move from an accidental edit.

If a folder was already accreted before this change, say so explicitly and propose the split rather
than adding to it silently.

## Remediation

1. If all gates are green (with real evidence) **and the design-constraint gates pass**, the work may
   be handed to the user.
2. If any gate is red, noisy, unrun, or shows an unexplained removal, **resolve or clearly surface it
   first**. Do not downgrade a blocking violation into a soft suggestion.
