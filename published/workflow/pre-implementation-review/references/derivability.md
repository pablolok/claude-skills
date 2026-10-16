# Derivability — the question in full, and the rules that make it bite

Read with the `Derivability` section of the skill, which states the question and its four answers in short.

## The question

**Before any other question**, for every field, table, cache, snapshot, or sync mechanism the change
would introduce *or inherit*: **what does it hold that cannot be derived from what is already there?**

Answer with a **query against real data**, not an estimate. Then:

- **"Nothing"** → do not store it. Derive it. The mechanism is the defect, and every bug it produces
  will look like a new bug and get *repaired* instead of removed.
- **"Only the exceptions"** (a user decision, a manual override — something no rule can recompute) →
  store **only the exceptions**, never the whole state. A stored full state that is 99% derivable is
  the same defect with a smaller blast radius.
- **"A lot"** → store it, and say in the note what keeps the two copies from diverging.
- **"Derived only while the rules stay fixed"** (a state replayed from a seed, a log or a recipe) → ask whether the
  rules will keep changing while the derived state must survive (a system still being built, a migration ahead). If
  yes, a rule change rewrites the derived past: store the state as the truth and move it forward with versioned
  migrations; keep the replay only as a test or a cold start.

This is the highest-leverage question in the review, because a stored derivable value is **a second
place where the truth can differ**. The cost never appears at the moment of the choice; it appears
months later, as work that should not have existed.

## The rules that make it bite

⚠️ **The measure is EFFICIENT, not SHORT** — and they are often opposites. Deleting a mechanism is a
big diff today and the cheapest path overall; patching around it is a small diff today and pays
forever. Count the work that will not have to exist, not the lines you are about to touch. A change
that removes a stored copy is *supposed* to look bigger than the patch it replaces.

The rules that make it bite:

- **It applies to mechanisms you INHERIT, not only ones you add.** Touching a snapshot without asking
  what it holds is the same mistake made standing still. "It was already like that" is the
  rationalization this kills.
- **It applies to tools and checks too**: a validator, a linter or a report that needs another component's values (a
  formula's constants, a limit, a lookup table) reads them from that component's source or exports, never a restated
  copy — a restated constant is a check that passes against a system that has already changed. The set of files a
  check judges is such a value: read it from the version control the CI checks out, not a disk walk with a
  restated skip list (walked, a check passed on the machine that had the ignored files and failed in the CI).
- **It applies HARDEST while fixing a defect in such a mechanism** — the blindest moment, because
  repairing feels like progress. If the fix is "recompute the stored copy on a trigger / a button / a
  save hook", STOP: that is the mechanism defending itself. Ask whether the copy should exist.
- **It runs backwards too: ask it of what the code OVERWRITES** (an upserted row, a last-wins retry, a refreshed cache).
  If the replaced value is the only record of *why* something happened, every pass destroys evidence: keep the
  exception (what was discarded, with its duration and reason), not the whole history.
- **A rollup stored on a parent** (a total of its children) is counted again by every consumer that sums parents and
  children together (a report, a burndown), and drifts from the children it sums: let the consumer that needs the
  total compute it.
- **Retiring an inherited copy: cut its writers first, then count its readers.** A copy nothing reads and nothing can
  write any more stays frozen where it is; clearing it row by row costs work and protects nothing.
- **A guard, dedup or normalisation for an input that "could" occur starts with a count of it in real data.** Zero
  rows means the guard protects a population that does not exist and is dropped; a few rows are repaired once at the
  source. A tolerance that guesses an identity from text is the same patch in another form.
- **An old plan's design is a hypothesis about the code of its day: re-read what exists now before building from it.**
  A facility added since (a generic store with the retention the plan asked for, a shared helper) can make the planned
  table or module unnecessary — the work shrinks to a new row type — and half of an old acceptance list may already be
  met. Say what was planned, what exists, and build only the difference.
- **A recorder or observer added to paths whose volume nobody measured is bounded by construction first** (a ceiling per
  request, deduplication of what is re-emitted) and measured afterwards from what it wrote — not sized from a rate
  guessed on the one path that was measured.
- **Measured example**: a table storing a schedule's history held 276 rows, none carrying a user decision, none the
  matching rule would not rebuild from the ledger — around it had grown a write path, a known defect, a panel and a
  repair button. **One query months earlier would have said it should be a query.**
