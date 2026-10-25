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
    `useState(initial)` keeps the value of the first render: a form that copies a prop into local state when it
    opens loses the value when the data arrives after (an edit dialog opening with an empty field). Derive from the
    prop until the user changes the field, and keep in state only what the user typed.
13. **A submit that writes is guarded synchronously.** The data library's pending flag (`isPending`) reaches the
    handler one render late, so a fast double click sends the write twice. Hold a ref set in the handler (or a
    mutation hook that runs one call at a time) and release it when the call settles; the pending flag only drives
    the disabled look.
14. **Accessible, correct primitives by default.** Stable list keys (never array index on dynamic
    lists), controlled inputs, labelled interactive elements. The accessible name sits on the interactive element
    itself, not on a wrapper that forwards it: a component taking an optional trigger names its default one too.
    A URL that comes from outside (another user, a third-party client, an import) becomes an `href` only after its
    protocol is checked (`http:`/`https:`); anything else stays text.
