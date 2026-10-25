---
name: typescript-react-standards
description: The TypeScript/React-specific layer on top of clean-code-standards. Use whenever writing, refactoring, or reviewing TypeScript, React, or Node/Deno code. Assumes the language-agnostic core of clean-code-standards and adds only the TS/React idioms, tooling, and quality gates.
---

# TypeScript / React Standards — TS/React layer

**The universal core lives in the `clean-code-standards` skill and applies
in full to every TypeScript/React task.** This skill adds only what is TS/React-specific. When
writing TS/React, apply both: the core sets the design discipline (single responsibility, injected
collaborators, no god objects — including the "many capability interfaces on one unit is still a
monolith" insight — Tell-Don't-Ask, no module-level business logic, strong typing over magic
values, literal centralization, reuse audit, fail-fast inputs, no warning suppression); the items
below make it idiomatic TypeScript and React.

## TypeScript conventions

1. **No `any`.** Implicit or explicit `any` is a violation. Use `unknown` at untyped boundaries and
   **narrow**; type external data with a parser/schema, not a cast. Keep `tsconfig` `strict` (and
   `noUncheckedIndexedAccess`) — don't weaken it to make code compile.
2. **Model finite states as unions, not magic values.** Discriminated unions / string-literal
   unions for statuses, modes, kinds, results — the core's "strong typing over magic values" in TS.
   Handle them with an **exhaustive `switch`** whose `default` hits a `never` (`assertNever`), so a
   new case is a compile error, not a silent fallthrough.
3. **Errors as values where it aids control flow.** A `Result<T, E>` / tagged union for *expected*
   failures; throw only for the truly exceptional. Never swallow — no empty `catch {}`, no
   discarding a rejected promise. Handle or propagate intentfully. An error meant for a caller
   across a framework boundary (a tool handler, an RPC, an API route) is thrown as the type the
   framework forwards — many pass on only their own error class and redact the rest — and its test
   asserts that class, not only the message. Tell "no longer authorized" (401/403, a session that is
   gone) from a transient failure: the caller's next step differs.
4. **Immutability by default.** `readonly` fields, `ReadonlyArray`, `as const` for literal tables;
   don't mutate props, arguments, or shared state. Return new values.
5. **Casts and `!` are assertions that bypass the checker — avoid them.** No non-null `!` to silence
   the compiler, no `as` to force a shape. Narrow with type guards instead. A cast is allowed only at
   a documented boundary fixed by an external protocol (and commented as such).
6. **Fail-fast at the seam with a schema.** Parse external input (network responses, storage, route
   params, user input) into typed values at the boundary (e.g. `zod`), don't trust-and-cast deep in a
   call path. Reject missing/invalid config at startup.
7. **ES modules + `import type`.** Type-only imports for types; no `namespace`, no CommonJS in app
   code. Export the types neighboring modules consume (the core's interface-seam rule in TS).
   A platform function received as a dependency (`fetch`, a timer, `crypto`) is called detached
   (`const { fetch: fetchFn } = deps`) or injected already bound (`fetch.bind(globalThis)`), never as
   `deps.fetch(…)`: edge runtimes reject the wrong `this` ("Illegal invocation"), Node does not.

## React conventions

For React components, hooks or state, read [React conventions](references/react-conventions.md)
before the first relevant change. TypeScript-only scripts do not need that reference. The universal
core owns responsibilities and test invariants; this layer owns TypeScript and React idioms.

## Quality gates (TS/React)

15. **TDD with Vitest** (+ Testing Library for components). Deterministic tests for new logic; test
    doubles for injected collaborators/hooks; assert **behavior**, not implementation. Pure logic
    extracted to libs is tested directly — favor that over testing through the DOM.
    A double of a platform API keeps the contract the runtime enforces — a fake `fetch` written as a `function` that
    throws when `this` is neither `undefined` nor `globalThis` — or the test passes on code the runtime rejects.
    A test helper with a default (`open(average = SAMPLE)`, `({ average = SAMPLE } = {})`) turns an explicit
    `undefined` into the default, so a "still loading" / "missing" case silently tests the happy path: when
    `undefined` is a state under test, read it with `"average" in options ? options.average : SAMPLE`.
    When a change alters what a shared seam passes or receives (a hook's callback gaining an argument, a call gaining
    a field), first find the tests that double that seam or assert that call — mocks that invoke it the old way,
    `toHaveBeenCalledWith` expectations, tests that read the source text — and update them in the same change; run
    those before the full suite, where each one found late costs a whole run.
    In a component's test, a third-party composite widget it merely uses (a searchable list in a popover, a date
    picker) is doubled with a native control: under test a choice made on it with one click is lost intermittently,
    and the widget has its own tests.
16. **Typecheck + lint clean.** The project's TS build (e.g. `tsc -b`, *not* `tsc --noEmit` if the
    build uses project references) and ESLint pass with **no** errors or warnings.
17. **No warning suppression.** No `@ts-ignore`, no bare `@ts-expect-error`, no `eslint-disable`, no
    `any`-cast to dodge a diagnostic. Fix the underlying type/lint issue. The one allowed exception is
    a justified, **commented**, locally-scoped `// @ts-expect-error <reason>` at a real external
    boundary.

## When reviewing / refactoring

Run the core review lens first (responsibilities confined to their module, no god objects /
module-level business logic / magic values / duplicated orchestration / hidden global construction),
then the TS/React specifics: hunt `any` and unchecked casts/`!`, fat components holding domain logic,
effect misuse and stale/`disable`d dependency arrays, duplicated hook logic that should be one hook,
non-exhaustive unions, and suppressed diagnostics. Prefer the **smallest** behavior-preserving change
that moves a responsibility to its rightful module; verify with `tsc` + ESLint + Vitest.
