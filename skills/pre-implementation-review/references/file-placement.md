# File placement — why it is decided before writing, and the questions in full

A responsibility with the right pattern can still land in the wrong **folder**, and that is the
failure this section exists for: nothing catches it. Lint, types, and tests are all indifferent to
where a file sits, so a misplaced file survives every gate and is only ever found by a human reading
the tree — usually months later, when the folder no longer tells anyone what lives in it.

The characteristic shape is **accretion**: a folder named for one concept (`tiers/`, `handlers/`,
`validators/`) starts collecting things that merely *relate* to that concept — a shared vocabulary
both sides read, an orchestrator, a presentation adapter, a constants module. Each addition is
individually defensible and the folder's name becomes a lie by degrees (measured: a `tiers/` folder of 11 files,
4 of them tiers; a presentation adapter importing from it to learn a constant no tier owned).

So for **every file the change creates or moves**, state in the note:

1. **Its one responsibility**, in a short phrase. A file needing "and" is two files.
2. **The folder that owns that responsibility**, and *why that one* — what the folder's name claims,
   and whether this file is an instance of it or merely related to it.
3. **Its layer relative to its neighbours**: does it sit *above* the folder it serves (a contract both
   sides read), *inside* it (one implementation among peers), or *beside* it (a sibling concern)?
4. **Direction of dependency** — what it imports and what imports it. Then check the folder stays
   **acyclic**: if files inside a folder import upward, the upward targets must be leaves.

Two rules that follow, and are worth applying mechanically:

- **A contract shared by two layers belongs ABOVE both, never inside one of them.** Parking it inside
  one layer forces the other to import an implementation folder to learn an interface.
- **Pure data/vocabulary that no single implementation owns gets its own module.** The moment a
  non-implementation has to reach into an implementation folder for a constant, the constant is in the
  wrong place.

If the change reveals a folder that has already accreted (its name no longer describes its contents),
say so and propose the split — a move is cheap while the work is open and expensive later.
