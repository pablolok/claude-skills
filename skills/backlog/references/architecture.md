# Architecture — the field, the shape change and structural defects

## The `Architecture` field

- **Architecture** (only when the project keeps stable docs in `architectureDir`, default `docs/architecture`):
the documents this work changes, comma-separated, then in prose what changes. `—` is a statement ("changes
none"), not a blank. It may carry a structural defect's marker (`billing.md#D3`), checked **both ways** by
`backlog-anchor`: while the entry is open the defect **must** be among the doc's `## Open defects`; once closed it
must be **gone** from there and one row `| [[BKLG-NNN]] | what it did |` must be in its `## Who worked on it`
(the section names are the project's `words`; these are the defaults).
⚠️ **Never back-filled**: the field binds new work; a value deduced from memory for an old entry is invented.

## A change to the system's SHAPE is drawn, inside the activity's document

An entry that changes the shape of the system (a new module or layer, a new data flow, a structural defect) puts
in its own document: **how it is today** (a link to the stable doc in `architectureDir`, not a copy), **the shape
after** as a diagram (today next to tomorrow, sources in a `diagrams` folder beside the doc), **what is still
missing** and who closes it, and **acceptance written against the stable doc** ("updating that doc must produce
these changes"). Not an extra file beside the spec; not for a one-step entry or a point fix. If the touched area
has no stable doc yet, that is the moment to write it — coverage grows one activity at a time.

A **structural** defect (it comes back if patched where it shows) in an area with a stable doc gets a `D<n>` row
in that doc's `## Open defects`, its owner cell `[[BKLG-NNN]]`, **in the same commit that opens the entry**.
`architecture-shape` checks every stable doc has both sections and every defect an owner cell.
