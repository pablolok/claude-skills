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
   discarding a rejected promise. Handle or propagate intentfully.
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

## React conventions

**The layered separation (view / view-model / domain / data) is the goal — it's standard React, not
an import from another framework.** React gives you a function that returns markup and imposes no
layers, so the separation is DISCIPLINE, not framework. Idiomatic React reaches the same clean split
an MV\* framework gives you, via four layers (an MVC/MVVM app maps onto them 1:1 — a familiar lens,
nothing more):

- **View** — a **presentational component**: props in → JSX out → events out. No data access, no
  domain logic, no multi-step orchestration.
- **View-model / "controller"** — a **custom hook** (`useX`): owns the view state (`useState`/`useEffect`)
  and the actions the view calls, and delegates to the domain layer. This is where a fat component's
  logic belongs.
- **Domain** — **pure functions / domain services** in a domain module (e.g. `src/lib/`; collaborators injected):
  rules and orchestration, no React, no JSX.
- **Data** — a two-sublayer STACK, not one thing: a **cache/resource hook** (e.g. TanStack Query's
  `useQuery`/`useMutation` — the React-idiomatic piece) sitting **over** a raw data-access module
  (a per-table repository / api client — the only place the DB/HTTP call lives). The hook's query function
  calls the raw module; the hook owns caching + invalidation, the module owns the query. They stack,
  they don't compete. "Repository" is a DDD import, not React vocabulary — legitimate for a single
  per-entity call site + testability, but the React layer on top of it is the query hook.

The numbered rules below are the specifics of that separation.

8. **No business logic in components.** Domain rules and orchestration live in **pure functions**
   (a domain module) or **custom hooks**, never inside JSX or event handlers. A component that computes
   domain logic is a god object — components orchestrate and render, they delegate the thinking.
9. **Custom hooks are the reuse seam** (core rule #7 + Tell-Don't-Ask). Duplicated data-fetching,
   derivation, or side-effect logic across components → extract a `useX` hook, don't copy-paste.
10. **Render is pure.** No side effects, mutation, or I/O during render. Side effects go in
    `useEffect` with **correct, exhaustive dependencies** — never disable the deps lint to hide a
    missing dependency; fix the effect.
11. **Props/context are the injection seam.** Collaborators and data come in as props/context, not
    reached from module globals inside the component. Keep prop lists focused — a component needing a
    dozen props is doing too much; compose smaller components.
12. **Derive, don't duplicate, state.** Compute from source state/props (or `useMemo`) instead of
    mirroring it into extra state kept in sync by effects. Synced-copy state is a bug magnet.
13. **Accessible, correct primitives by default.** Stable list keys (never array index on dynamic
    lists), controlled inputs, labelled interactive elements.

## Quality gates (TS/React)

14. **TDD with Vitest** (+ Testing Library for components). Deterministic tests for new logic; test
    doubles for injected collaborators/hooks; assert **behavior**, not implementation. Pure logic
    extracted to libs is tested directly — favor that over testing through the DOM.
    A test helper with a default (`open(average = SAMPLE)`, `({ average = SAMPLE } = {})`) turns an explicit
    `undefined` into the default, so a "still loading" / "missing" case silently tests the happy path: when
    `undefined` is a state under test, read it with `"average" in options ? options.average : SAMPLE`.
15. **Typecheck + lint clean.** The project's TS build (e.g. `tsc -b`, *not* `tsc --noEmit` if the
    build uses project references) and ESLint pass with **no** errors or warnings.
16. **No warning suppression.** No `@ts-ignore`, no bare `@ts-expect-error`, no `eslint-disable`, no
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
