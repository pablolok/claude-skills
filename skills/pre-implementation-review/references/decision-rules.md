# Decision rules — the full text

Each rule the skill indexes under `Decision rules`, with its reason and the cases that taught it. Read the rule the
change touches before writing the note.

- **An input set elsewhere that forces the work into a worse form is put to its owner, not designed around.** When a
  value another component or person owns (a speed, a size, a budget, a timeout) is what makes the result fall short of
  what was asked, show the owner the choice and its cost before building to fit it: an output tuned to a fixed input
  inherits the defect silently (a motion authored to meet a fixed speed came out frantic; the fix was the speed).
- **Before rebuilding or replacing something, find who uses it and look at it there.** Search for every reader of it;
  nothing reads it → remove it, don't rebuild it. Something does → inspect it in that context first: a defect that only
  shows where it is used (wrong orientation, an overlap) belongs in the rebuild's scope. The same for a **gap a document
  lists as uncovered**: read whether that path can produce the failure at all (a call that never crosses the layer being
  fixed has nothing to carry) before scheduling work for it, and look in the existing record for where the missing fact
  could already be stored before proposing a new place. The same for a feature that **shows** existing data: run the
  real producer on real input and look at every field the feature will display before designing it — a field that comes
  back empty there (a parser reading one layout of a table and not another) is a defect inside the feature's scope, not
  after it. The same for a **claim about an outside system** (its protocol, its gate, its limit) in a comment, an older
  document or an entry: probe the system itself before designing around the claim or copying it into a new document —
  comments describe the day they were written (a header saying "no token needed" outlived the site change by months, and
  the live code beneath it did the opposite).
- **The field's standard method before your own.** When the change enters a problem the project has not solved before
  and the industry solves a known way (a rendering or modelling technique, a sync protocol, a scheduling algorithm),
  find that method first — a short research with sources — and design from it. Home-made attempts fail one at a time for
  reasons the standard method already answers. The same research is due **when an approach stops converging** (two
  rounds without a measured gain), however established the approach is in the project: past that point each round tunes
  the wrong method. Then list what the method assumes about the thing it is applied to and check each against this
  project: a method written for a whole object, applied to one of its separately built pieces, breaks where the pieces
  meet (a motion meant to bend the whole moved one piece off the static one it stood on). **Probe the chosen tool on the
  hardest case at the target size before planning around it**: a tool can have a floor or a ceiling its docs don't state
  (an automatic remesher would not go below ~30× the budget of the smallest parts, whatever its settings). The same
  before a long run judged by one total (a sum under a cap, a full rebuild): try each part's target with the real tool
  first — a table of budgets written on paper failed a 3-minute build three times on parts the tool could not bring that
  low. **An input adopted from outside** (a generated asset, a vendor's output, an imported dataset) is checked against
  every hard limit of where it ships (a budget, a size, a format) the moment it is adopted: a model at twice its budget
  carried its unwrap, rig, bake and paint before anyone counted; cut to the limit, its bake and every rig check ran
  again. And run the step that **consumes** a result on a rough version of it before polishing it: a defect the consumer
  finds reshapes the work upstream (a rough model rigged and posed showed one limb dragging the body — found before any
  assembly polish, not after). The **targets** the work is tuned toward come from the consumer's written requirements;
  when the consumer is not specified yet, specify it first (a component was tuned toward guessed cases for weeks
  before the consumer's spec, written afterwards, named the cases it needed). The same for a design's own **top-named risk**: the pieces are ordered so the cheapest
  prototype that proves or kills it comes first — a physics feature whose design named "it may never settle into the
  wanted pose" as its first risk was built in full, ten pieces, before its first run showed exactly that.
- **Never read an input back from what the operation itself writes.** If a job decides which records
  to process by a field it then overwrites (e.g. "unprocessed = status is empty", then it sets the
  status), its second run reads its own output and skips or reprocesses the wrong ones. Take the input
  from its source (an explicit flag or list the job never touches), so running it twice gives the same
  result. The same trap the other way: a setup that walks only what it has not handled yet (the items still
  unmapped, unlinked, unconverted) never revisits what it set up before, so a changed rule silently skips them —
  a re-run setup walks everything it owns, its own earlier output included, and reads the current set from the
  source: its earlier output kept as input also carries entries the source no longer has (stale mappings from an
  older version failed a setup that walked its own map) — drop what it owns, then rebuild from the source. A
  builder that names what it makes drops its earlier output first too: where a name clash renames the newcomer
  silently (a `.001`, a `(1)`), the next steps found the old outputs by name and shipped them.
  A **correction's target** is measured on the reference it must match, never on the output being corrected: measured
  on a generated draft, every fix kept the draft's own error (its proportions) and only tuned around it.
  A **fallback** runs on the original input too, never on the failed attempt's output: a repair applied to what the
  stuck first try left produced a broken shape that passed its own count.
  A retry or fallback that **did not measure** never replaces an outcome that did (the verdict is the last attempt that
  produced an answer, the others are kept beside it), and a retry the remaining budget cannot finish is not started.
  A fallback **reports the error it caught** before trying the next way: swallowed, the next attempt's failure is all
  that shows (a loader that missed a local file for one reason surfaced only the remote lookup's "not found").
  A **negative recorded as permanent** ("asked, nobody knew") needs proof the asker really got an answer: a layer that
  folds a timeout or a throw into its empty result must also report who answered, and the recorder writes only for those
  (and only ever less, never more).
- **A capability added to a port many consumers use goes on an extending interface or an optional method, not on the
  shared one** — the consumers and their test fakes stay untouched, and only the new caller asks for the richer type.
- **A write decided from reads that refresh independently is conditioned where it lands.** When client code
  decides to write by combining reads that come back separately (a summary and a settings record, two cached
  queries), one can be newer than the other, and the decision can undo a change the user just made (an automatic
  value overwriting one just set by hand). Put the precondition in the write itself — a compare-and-set on the fields
  the decision relied on (`WHERE auto = true AND status <> 'archived'`) — and do not decide while any of the reads is
  refetching; the client-side guard alone is not enough. A unit test that resolves the reads in a fixed order cannot
  see it: a refreshed summary arriving before a stale settings record rewrote a value just fixed by hand, silently.
- **A constraint added to stored data binds every writer, not only the ones the change is about.** Before adding it
  (a range, an ordering, a required field), list every path that writes each constrained field — forms, imports,
  server endpoints, assistants, other services, the store's own generators — including those that write only one of
  the fields (a "set end date" action, a reconciliation import), and the values the system itself produces at the
  edge of the allowed range (a generator writing "the first date after the series", past the last allowed one). Each
  path already respects the constraint, is fixed in the same change, or the constraint waits until it is. Aligned
  with the forms only, a new check on a schedule missed four writers and a generator stepping past the bound — each
  would have failed only once the constraint was live, with a generic error. The same holds the other way: a **new
  writer** checks every constraint already on the fields it writes, through the project's shared limits if it has
  them, so a value out of range is refused with the field's message, not by the store with a generic error.
  A writer that picks a **free value under a uniqueness constraint** reads the taken values over the constraint's
  whole scope (unique per user → every row of the user, not only the rows the operation touches: a row moved
  elsewhere still holds its value), and a marker it adds to a composite value (a copy number) goes where no
  free-text part can produce it — the prefix, not after a free-text last segment.
  A new **automatic** writer (one row per period of a schedule, per item of an import) also reopens, in the same
  change, every exemption or assumption justified by how the data used to be written — small, by hand, one per
  user: an unpaginated read exempted from a guard because the data was small truncates silently once a generator
  fills it.
- **A follow-up write after a non-idempotent write that succeeded never turns the answer into a failure.** Labels
  after an insert, a notice after a payment: when the follow-up fails, log it (codes and ids, no row values) and answer
  success. An error makes the caller retry: with no idempotency key the record is created twice, with one the retry
  answers "already done" and the follow-up never happens. If the follow-up matters, make it retryable on its own.
- **A choice offered to a person is checked against every limit its write will enforce, before it is offered.**
  Classify first by what makes the action impossible (a text longer than the column, a value of the wrong kind), then
  by what makes it a preference: an item classed as a conflict offered "keep this" and "use that", both of which had
  to store a text too long for the column, and every click failed. Resolve a stored reference against the full set and
  filter only the choices: a name looked up among the choices alone showed "none" for a valid value of the other kind.
- **Explain a measurement from the control flow that produced it, never from the arithmetic of its numbers.** Numbers
  that add up (100 + 30 = 130) fit more than one story. Read the code each one passed through — what is retried, cut or
  skipped — and when two stories fit, take the measurement that tells them apart before either is written down.
  The same for a **reported symptom**: a cause read from the code is a hypothesis until the symptom is reproduced on
  the real surface, and the chain is located by observing each stage (was the request made, answered, decoded?) — zero
  requests means the decision sits upstream of the fetch, where the downstream fallback that looked guilty never
  runs (a real defect found by reading was not the one reported).
  A number **read once** (by eye on an image, or by a delegate) that will set a target or be reported is read a second,
  independent way first (another view, another method): one landmark mistaken for another set a target 30 % off.
  A **proxy check** (a number standing in for what a person perceives) is not the acceptance: a change that clears it
  is judged on what it stands for before it is kept, and a check that flags what no one can perceive is fixed in the
  check, not the thing — a correction that brought a reading under its limit made the visible result worse than the
  defect it removed, which no view had shown.
- **A step that deletes or rewrites by a rule is bounded to where the rule is meant, and its output looked at.**
  A cleanup that removes whatever a test touches (near a moving part, matching a filter) finds far more than the
  case it was written for when the inputs change: unbounded, one removed half of an unrelated part and left its end
  floating. Name the region or set it may act on, and show what it removed before keeping the result.
  A **scripted bulk edit is an edit**: the review comes before the script, not after it, and the script's own output
  (files changed, what it rewrote) is looked at before it is kept.
  **A change to a rule many records pass through** (a parser, a classifier, a normaliser) is run old and new over the
  whole real population, and the records whose result changed are listed by kind before it ships: the one case it was
  written for is not the population (a parser fix meant for one field also lengthened nine others).
  **Replacing a stored definition whole** (a function, view, trigger, policy) starts from the LIVE definition read from
  the catalog, not the file that created it, and carries every clause of it (security mode, search path, guards,
  grants); afterwards the same catalog read, plus one control, confirms each clause survived.
- **A check, computation or export whose result depends on an ambient mode establishes that mode itself.** A global
  setting (a display or preview mode, a simulation state, a locale, a flag) is set for the run and restored after,
  never inherited from whatever the caller left: inherited, a validator ran against the inert state and passed
  everything (0 % defects; forced to the real state, 16 %), an exporter would have written every animation as the
  rest pose, and a bake whose rays saw every visible object in the scene turned a map 83 % black — all without an
  error. A check that reports the same result for every variant it is given is measuring
  nothing — treat that as a finding, not a pass; and variants that all fail one criterion alike point at what they
  share, not at what differs between them (three paints scored 0 on material because all three wore one roughness).
  The same for a **tool's own default** the output passes through (an importer's threshold, a library's limit): it is
  a choice made for you — measure it at the real use (left at its default, an importer drew the coarse model at the
  very distance the user sees it). And a value you set yourself without measuring is a guess: write it as one where
  it is handed on (a brief, a spec), so evidence against it overrides it — kept as a constraint, an unmeasured "matte"
  held through every round against the review asking for gloss. The other way round too: a **measured limit that
  forces a worse design** (a smaller motion, a dropped feature, a workaround) is measured again by an independent
  method before the design gives way to it — one probe read a joint's range at a third of what it had, and a whole
  piece of work was built and rejected around that number. A number a plan decides on is kept with the code that
  measured it (committed, its parameters stated): a plan whose deciding windows were measured inline could not be
  reproduced by the next worker, and half its cells disagreed with no way to tell which side was wrong.
- **Name the frame every measured input lives in.** A value measured in one frame — a pose, a coordinate space, a
  colour space, a unit, a sample's conditions, the projection an image was drawn with — and used in another gets one
  explicit conversion, in one place (a perspective view read as orthographic placed its far parts high).
  Placed in the frame it was measured in, a piece was right in the reference and wrong wherever it is actually
  seen; calibrated against a transformed view (a tone-mapped image) instead of the source values, a correction
  distorted what it was meant to fix. State in the note, per input, where it was measured and where it is used.
  The same for what a moving thing accumulates over time (a trail, a history, a running sum): keep it in the frame
  that moves with it — kept in the outer frame, a jump of its owner is drawn as a streak. A value measured on one of
  a pair and mirrored to the other assumes the pair is symmetric: measure the second one's difference before
  mirroring (copied from one side of an asymmetric model, joints lay 3-6 cm off the other side's own parts). A point
  read off one projection fixes two of its three coordinates: place it from two views and check it in a third. A
  centre averaged over a region takes in whatever is attached to it (hanging strips pulled a joint's centre 4-5 cm
  off): bound the region to the thing measured.
- **Select by the property that defines the role, never by position.** "The first item / the first
  config entry / `items[0]`" holds only while the order does; when the collection changes, the code
  silently picks something else. Name the property that makes it the right one (its type, a key, the
  largest, the one with the field set) in the note. Being *listed* is not that property: where every member lists
  the same references (each part of a model listing all its bones), "the one that references X" matches them all —
  select by what actually binds it to X (its weights, its owner field), and check the pick on real data. Being
  *named* is not being *done* either: a trigger read from free text (a shell command, a log line) matches only the
  part that acts — a quoted message or a here-document that names the command runs nothing (a hook matching the
  whole command text fired on a commit message that quoted it). Being *nearest* is not it when the candidates differ
  in size: by distance to each one's surface, the widest wins ground that belongs to its neighbours (a wide part took
  the first 5 cm of every thin one beside it) — assign along each candidate's own axis.
- **A rule that lists observed values (hosts, labels, ids, formats) states how many independent instances it saw
  and along which axis they differ — one instance cannot tell a closed set from a per-item token.** Before
  choosing between listing and a structural property, sample the axis that could vary (another item at the same
  moment, the same item later): if the value changed between items, key the rule on what every instance shares
  (a path shape, a response behaviour, a field) and list nothing: a list widened one value at a time fails on the
  next item, and only after a deploy. When several consumers read the same rule (a harvest, a direct read, an
  allowlist), derive all of them from one fragment, or widening one leaves the others refusing.
  When a value **moves** (a domain, a path, an id), find every place that holds it in every written form — plain,
  escaped inside a pattern, encoded inside a link, stored in data — and run each consumer on a **real input from the
  new place** before it ships: a pattern that spelled the old host escaped was invisible to a text search, and parsed
  the new page to nothing.
  A list of **refusals** (hosts or routes declared dead) is a measurement with an expiry that never fails by itself:
  its consumers skip before any request, so nothing errors while the declaration goes stale. An entry carries its
  date and the transports tried, is re-measured with the real consumer (the page's own request), and its tests
  inject a member so the mechanism keeps a proof when the list is empty — a test asserting the declared refusal
  verifies nothing, it repeats the declaration.
- **Find by name only with the owner's name for it.** A shared helper that looks something up by a conventional name
  (a part called "main", a field called "id") takes the name from the member that owns that vocabulary, and says so
  when it finds nothing — a lookup that silently did nothing hid that one member names the part differently.
- **A default or setting shared by every member of a family** (every request, record, view, render window, timeout):
  first list the members that already do that job their own way, **and the kinds of member the family has**, and
  decide each before writing. Applied on top, the default doubles what a member had tuned (usually the member
  declares itself the exception, and the default leaves it alone); and a value calibrated on one kind of member
  says nothing about another kind until it is measured there. The same check runs the other way when a **member
  joins** later: list the behaviours the family applies to every member and decide each for the newcomer.
  A **condition that decides when something runs** (a trigger, a job filter, a flag) is a family too: list every way
  of reaching it — each event, each input of a manual start — and decide each: a costly step narrowed to "manual
  starts only" still ran in the manual failure drill, which needed only the step after it.

## The short rules the skill states, with their reasons

- Prefer separating a rule/decision (pure, no IO) from the data access (repository) and the external
  call (gateway) — even inside "one" function. Mixed responsibilities are the smell, and splitting
  them is what makes each reusable.
- Prefer reusing or extending existing code when a stable abstraction **already owns that
  responsibility**; don't bend an abstraction that owns a *different* responsibility just to avoid new code.
- Prefer enums or typed named constants over raw numeric codes when the value set is finite and part of the domain;
  named constants over semantic literals; time, randomness and config injected — as the review workflow's step 4
  says, each surfaced in the note.
- Prefer shared styling primitives, design tokens, or utility layers over the same CSS repeated across components,
  and themeable semantic color tokens over hardcoded product colors.
- Do not wait for duplication to land in code if the responsibility clearly recurs.
- **Do not force a generic abstraction for reuse's sake.** If the use case is truly isolated, a
  correct local implementation beats a premature "reusable" one. Reuse that isn't a consequence of a
  shared responsibility is speculation.
- Favor explicit inputs/outputs and small extension points over oversized generic frameworks.
