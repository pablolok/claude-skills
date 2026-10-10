---
name: clean-code-standards
description: A language-agnostic clean-code / OOP quality bar. Use whenever writing, refactoring, or reviewing code in ANY language — enforces single-responsibility, injected collaborators, Tell-Don't-Ask, no god objects, no business logic in static/global scope, strong typing over magic values, centralized literals, a reuse audit, fail-fast inputs, and no warning suppression. This is the universal core; per-language skills (e.g. csharp-oop-standards) layer their own idioms on top of it.
---

# Clean-Code Standards — language-agnostic core

How code is written, in **every** language. The non-negotiable core is that design stays clean
regardless of stack: code in a language that is not the project's usual one shows the same
discipline when opened. Applies to production code, refactors, and reviews.

Per-language skills (`csharp-oop-standards`, `typescript-react-standards`, and any future language
layer) assume everything here and add only their own idioms, syntax, and tooling. When a language layer exists, apply it **on top
of** this core, not instead of it.

## The one rule everything serves

**Every responsibility is handled by its own responsible module.** When the language is
object-oriented, that module is a class; in other paradigms it's the equivalent unit (a module,
package, function group). A unit that *takes on many unrelated capabilities* — even if each is
hidden behind a clean interface/protocol (e.g. one thing that is "the SQL, the HTTP, the shell, the
logger" all at once) — is still a god object. Clean-looking facades over a monolith don't count.

The fix is **one collaborator per capability, passed in from outside**; the orchestrator only wires
and delegates.

Smell test: if extracting an interface/abstraction didn't move the *implementation* out of the big
unit, the refactor isn't done.

## Core checklist (always apply, any language)

1. **Single Responsibility / SOLID (or its paradigm equivalent).** One reason to change per unit.
   Prefer composition over inheritance. Split god objects into focused collaborators. Watch for a
   unit implementing several capability interfaces itself — the classic hidden monolith.
2. **Tell-Don't-Ask encapsulation.** Push behavior to the thing that owns the data; don't pull state
   out to decide externally. Expose intentful operations, not raw getters for callers to orchestrate.
3. **Injected collaborators, no hidden construction.** Runtime collaborators come in from outside
   (constructor injection, function parameters, or the language's idiomatic seam) — never a hidden
   global/`new`/singleton reached for deep in a call path. This is the mechanism that makes
   responsibilities testable and swappable; it's what enables rule #1.
4. **No business logic in static/global scope.** Domain rules and orchestration must not live in
   static classes, free-floating globals, or module-level mutable state. Static/module-level scope is
   for constants and pure, stateless helpers only.
5. **Strong typing over magic values.** Prefer enums / named typed abstractions over raw numbers or
   strings for finite states, categories, statuses, modes, results. An unexplained magic value is a
   maintainability violation — unless an external protocol fixes it at that boundary.
6. **Literal centralization.** Repeated or semantically meaningful literals (strings, numbers,
   keys) belong in a shared constant, resource, typed wrapper, or config boundary. Leave a literal
   inline only when it's truly local/one-off or fixed by an external protocol at that call site.
7. **Reusability audit.** The same mapping / validation / orchestration / UI-support pattern written
   more than once is a violation unless there's a clear bounded-context reason. Prefer the narrowest
   reusable abstraction (shared function/service, typed helper, base unit, composition) — written
   once and adapted. Do **not** over-generalize a genuinely one-off case.
8. **Fail-fast inputs & configuration.** Validate inputs and config at the boundary / at startup, not
   lazily deep in a call path. Reject injected collaborators that are null/missing at the seam.
9. **Logging via an abstraction.** Business-logic tracking goes through an injected logger / event
   sink (its own responsibility) — never scattered raw stdout/console writes. A dedicated log or
   UI-event sink is fine; ad-hoc prints for tracking are not.
10. **Tests for new logic.** Deterministic automated tests for new behavior, using test doubles for
    injected collaborators; assert behavior, not implementation. (Concrete coverage targets and the
    test framework are set by the per-language layer or the project.) A check that something bad is absent
    (no error, nothing torn, no overflow) also asserts the thing happened at all: an empty or inert input passes
    every "nothing bad" check — one such check stayed green for a day on output that did nothing. A lower bound
    ("more than N results") passes on duplicated output too: bound it on both sides or assert what must not be
    there (a split that cut every part twice still passed "more than 10 pieces"). Write the assertion first and
    watch it fail on the current code: a test that was never red proves nothing about the fix. Code that tells
    states apart (present / missing / broken) is tested on each state built for real, the broken one included: a
    platform's existence check can report a broken link as present.
11. **Leave borrowed state as found.** Code that changes shared state to do its work (a mode, a setting, a
    selection, a global) records every property it touches and restores each one — not only the values it
    measured with: a probe that switched a mode and reset just the values left everything after it inert.
12. **No warning suppression to dodge diagnostics.** Don't silence a required analyzer/linter/compiler
    warning with inline pragmas, blanket ignore settings, suppression attributes, or severity
    downgrades. Fix the underlying issue. Documented, justified, locally-scoped exceptions only.
13. **Environment-agnostic code.** No assumptions baked in that break on another OS/environment —
    e.g. hardcoded path separators, absolute machine paths, or locale/encoding assumptions. Use the
    platform's path/locale abstractions. Console output included: a script's prints stay ASCII (or set the
    stream's encoding) — a non-ASCII arrow in a status line crashed a script on a legacy Windows code page
    after its work was done.
14. **Structure mirrors responsibilities.** Folder/package layout reflects what modules *own* —
    group by domain, colocating a unit with its collaborators; add a dedicated seam folder (e.g.
    `Interfaces/`) only when the project convention uses one. Don't organize by technical-type noise
    alone.

## When reviewing / refactoring

State the responsibility each unit should own, then check whether the code actually confines it
there. Call out god objects, static/global business logic, magic values, duplicated orchestration,
and hidden global construction. Prefer the **smallest change** that moves a responsibility to its
rightful module without breaking behavior — zero-regression refactors, verified incrementally. A helper
extracted for a new consumer — or a parameter, flag or default added to an existing function for a new caller — is
proven on the **old** consumers too, in the same piece of work: run each one's real path once and compare its output,
not only the new one's (a flag's old branch left unrun is where the next full run fails, far from the change).

Before reorganizing files into folders, check whether the language couples folders to
namespaces/imports. When decoupled (e.g. C# file-scoped namespaces + SDK-style glob project files), a
move is pure filesystem — zero code change, verify with a build. When coupled (Java packages, Python
modules, TS path imports), a move renames every reference — do it with tooling, not by hand.

## Relationship to the other skills

- **Before writing:** `pre-implementation-review` applies this same judgment *ahead* of code —
  plan for reuse and ownership so duplication never lands.
- **While writing:** this skill, plus the matching per-language layer (`csharp-oop-standards`, …).
- **After writing:** `verification-gates` confirms build/test/lint are green and nothing was
  silently removed before the work is handed back.

Same principle, three moments: **plan clean → write clean → verify clean.**
