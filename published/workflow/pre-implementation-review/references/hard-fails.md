# Hard fails — the full text

The skill states the rule; this is the whole of it, with the test for shared code and the shape of the fix.

These are not soft smells to mention — if the change would introduce one, the review's verdict is
**reject the design and name the correct owner**, before any code is written. Say so explicitly.

- **A concrete member-name branch in shared/multi-member code is a HARD FAIL.** When a module is
  shared across a family (providers, source-types, payment methods, channels, tenants, plan tiers…),
  it must **name no concrete member** — no `if (x === "<memberName>")`, no `switch (member)`, no
  per-member boolean flag (`xIsMember`), no member-keyed literal buried in a helper. The behaviour that
  differs by member **belongs to the member** (a strategy method / per-member metadata the member
  self-declares), and the shared code **asks the member** (dispatch by a registry the members
  populate). If you catch yourself writing a concrete member's name in shared code, STOP: the
  responsibility is misplaced. Treat "it's just one `if`, copied from the old code / it's the quick fix
  / it's urgent, I broke it" as the exact rationalization this rule kills. It applies even to a
  one-line tweak and **especially** when fixing a regression you just introduced.
- The test for "is this shared code?": more than one member reaches it, OR it lives in a shared/
  strategy/registry/component file rather than in that one member's own module. If yes, a concrete
  member name in it is the fail.
- The fix is always the same shape: move the differing behaviour into the member (method or metadata),
  give the shared module a generic seam (interface + registry dispatch), and — when a member is
  absent/unspecified — a **generic default member** (e.g. a null/manual/none implementation), never a
  special-case branch in the shared code.
