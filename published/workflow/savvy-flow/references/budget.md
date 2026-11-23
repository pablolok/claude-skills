# Budget and usage windows

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

- **Pace the costly tiers against the plan's rolling usage windows.** Before starting or resuming a long worker at
  Fable, Heavy or Careful (Codex Sol or Astra for Codex's own windows, Gemini Hydrogen or Carbon for Gemini's), read the `budget` summary returned by the
  progress tool; its read-only `budget` tool can refresh your view without changing the bar. Its `estimates` line,
  once a tier has finished runs, gives what one run of that tier has cost as a share of each Claude window. For a
  family with any `ask` verdict (only a family the user set to `within`: `pace` is the default), ask the user before starting or resuming long work on it, giving the projection
  (percent at reset or when it runs out), the reset and that estimate; the Agent tool refuses those tiers until the
  answer is recorded. On a yes, record it with the `decide` tool, quoting their words (it holds until the family's
  next reset; `/savvy-budget <family> once` is the user's own way); never record a yes they did not give: a yes is the user's reply to THIS block, never an earlier sentence, and the tool refuses words said before the gate's refusal. Otherwise
  move the work to the other family or a cheaper tier, or pace it. Under `full`, continue, pacing only the short
  window. The policy is the user's: set `full` or `within` with `/savvy-budget` only when they say so, never on your
  own. With the short window high (say, past half), run one costly worker per family at a time and keep the cheaper
  tiers beside it. If the summary is unavailable, use the host's plan usage or the last relay report.
  Fable, Codex Astra and Gemini Carbon have their own gate, whatever the verdict: see section "Models".
- **Under `pace`, the default, the budget is yours to keep, never to ask about.** A family the user never set is on
  `pace`; `within` is what a user sets (`/savvy-budget <family> within`) to be asked. If they set `within` and later
  say work should go on inside the budget without being asked, record their words with `decide` (family and
  `policy: "pace"`, quoted like any yes). A stored policy holds until the user changes it. The gate stops refusing costly
  tiers for the budget (the Fable, Astra and Carbon gate is unchanged: each launch still needs its own yes). Keep every family's
  5-hour and weekly projection at or under 100 %, the week aimed at 90-100 % at its reset, by yourself:
  - read the summary at every worker return; a `retier` verdict carries an `advice`, act on it before the next launch;
  - cut tiers (Heavy → Careful → Medium, Sol → Terra → Luna); use a costly tier only where only it can do the step
    (a tool or a depth no cheaper tier has); run one costly worker at a time; shrink briefs;
  - move work to the other family only while that family's own windows stay at or under 100 %;
  - a `spend` verdict (week under 90 % with the reset under two days away) means room: raise a tier or run more in
    parallel for work that is waiting;
  - when nothing fits, pace: hold the costly work until the short window resets and carry on with what fits, rather
    than asking.
- **A week projected past its limit is the scarcer budget**, even under `full`: a short window comes back in hours,
  the week in days. While it lasts, take that family's legwork one tier down (Careful work to Medium with a precise
  brief, Medium to Light), and ask before every Fable, Codex Astra or Gemini Carbon task, whatever was said for the short window (those tiers are plans only in any case).
  When the Claude week is the one running out and Codex is signed in with room in its own week, offer the Codex tier
  for self-contained tasks (Terra or Sol at their usual sizes); it moves code to another vendor, so it runs only
  with the user's yes (`references/codex.md`).
- **A worker stopped by a usage limit is resumed, not redone.** A `rate_limit` failure (HTTP 429) leaves the
  worker's context intact: take the reset from the error or the `budget` summary and resume the same worker at that
  time (SendMessage, same title, "continue from where you stopped"), through the host's wake-up or scheduling tool
  when it has one; otherwise the turn summary names the worker and the reset it waits for. A fresh worker on the
  same task spends the window again to rebuild what the stopped one already read.
