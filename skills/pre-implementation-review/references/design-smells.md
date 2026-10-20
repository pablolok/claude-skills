# Design smells — the catalogue flagged at step 4 of the review

Flag each one the change would introduce or repeat, in the note, before code exists.

- repeated UI widgets (dropdowns, pickers, menus, cards, dialogs, filters)
- **a new fact appended to an existing line of a list row** — read what that line already does at the narrowest
  target width (it truncates, wraps, clips): a fact that must be seen gets its own element, never the tail of a line
  that cuts. Say in the note whether the surface was seen at that width; if it cannot be seen, say so and say who looks.
- repeated business rules, mappings, validators, request builders, orchestration flows
- a single module doing several responsibilities (a god handler mixing rule + IO + presentation) →
  split by responsibility, don't reuse-as-is
- repeated or implicit numeric state/category/status codes that should become named enums / typed
  abstractions
- repeated or semantic string literals that should become shared constants, resource keys, typed
  wrappers, or configuration inputs — **treat literal-centralization as a project rule, not a
  nice-to-have: a value that names a domain concept (a provider/status/kind/route token) MUST be
  proposed as a named constant in its canonical home, even when the change only *reads* the value
  once.** "It's just one string, copied from the old code" is the rationalization this catches; a
  verbatim-preserving extraction is exactly where a stray literal slips in.
- **ambient / non-deterministic reads done inline** — the current time (`new Date()`, `Date.now()`),
  randomness (`Math.random()`, `crypto.randomUUID()`), env/config, the network clock — must go
  behind an **injected interface** (a `Clock`/time provider, an id generator, a config port), never
  an inline call, whenever the module's output depends on the read (a persisted timestamp, an
  expiry, a generated id). Inline = non-deterministic and untestable; an injected collaborator is a
  seam production wires to the real impl and tests wire to a fake. Propose the interface up front.
- repeated component-local CSS or SCSS (or any styling) that should become shared primitives, design
  tokens, utilities, or theme rules
