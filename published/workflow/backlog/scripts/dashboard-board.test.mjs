/**
 * Tests of `dashboard-board`: the board read from a register — phases, pending ledgers, links between entries, the
 * order of what comes next, the closed lines — each "counts" case next to a "does not count" one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBoard, closedEntries, docLinks, docsToRead, pendingLedgers, phasesIn, withoutFences } from "./dashboard-board.mjs";
import { parseConfig } from "./project.mjs";

const REGISTER = `# Backlog

## Pending verification
Committed but not yet verified.

- **Review**: [[BKLG-002]] — someone looks at the import report
- **Playtest**: [[BKLG-003]] — the retry flow,
  on a slow network

## Open

## BKLG-004 — Export the ledger
- **Status**: blocked — on [[BKLG-003]]: the retry flow lands first
- **Priority**: low
- **Added**: 2026-10-05
- **Doc**: —
- **Summary**: CSV export.

## BKLG-003 — Retry flow
- **Status**: open
- **Priority**: medium
- **Added**: 2026-10-02
- **Doc**: [plan](bugs/retry/plan.md)
- **Summary**: The retry drops the discount.

## BKLG-002 — Import pipeline
- **Status**: in-progress — P2 dedupe half done
- **Priority**: high
- **Added**: 2026-10-01
- **Doc**: [spec](features/import/spec.md) · [old report](archive/old/report.md)
- **Summary**: Import the bank file. Related: [[BKLG-003]].

  | | state |
  |---|---|
  | **P1** parse the file | ✅ — six of eleven columns already read |
  | **P2** dedupe | ⏳ half done |
  | **P3** background job | ⛔ dropped — the import takes 2 s |

## BKLG-001 — Old cleanup
- **Status**: open
- **Priority**: high
- **Added**: 2026-09-01
- **Doc**: —
- **Summary**: Tidy up.

## Done / Archived
`;

const HISTORY = `# Backlog history

Format:
\`\`\`
- **BKLG-099** An example only — **Done**: 2026-01-01
\`\`\`

- **BKLG-002 P0** Import spike — measured the file · **Done**: 2026-09-30 (commit \`abc\`)
- **BKLG-000** First entry — shipped · **Done**: 2026-09-29 · [doc](archive/first/report.md)
`;

const SPEC = `# Import

| phase | state |
|---|---|
| **P1** parse the file | ✅ — already counted from the card |
| **P4** error report | 📋 not started |
| **P5** retries | 🔨 building |

| measure | value |
|---|---|
| **rows** per file | 1200 |
`;

const config = parseConfig(null);
const board = buildBoard({
  backlog: REGISTER,
  history: HISTORY,
  config,
  docTexts: new Map([["docs/implementations/features/import/spec.md", SPEC], ["docs/implementations/archive/old/report.md", "| **P9** x | ✅ |"]]),
  commits: [
    { sha: "c2", date: "2026-10-08T10:00:00Z", subject: "BKLG-002 P2: dedupe", ids: ["BKLG-002"], mentions: [] },
    { sha: "c1", date: "2026-10-07T10:00:00Z", subject: "BKLG-003: repro", ids: ["BKLG-003"], mentions: [] },
  ],
});
const entry = (id) => board.entries.find((e) => e.id === id);

test("phases are the marked rows of a table whose first cell opens with a bold name", () => {
  assert.deepEqual(phasesIn(SPEC).map((p) => [p.name, p.state]), [["P1", "done"], ["P4", "planned"], ["P5", "active"]]);
  assert.equal(phasesIn("| **rows** per file | 1200 |").length, 0, "a table without marks has no phases");
  assert.equal(phasesIn(SPEC)[0].note, "already counted from the card");
});

test("an entry's phases come from its card and its own docs, each name once, never from an archived doc", () => {
  const e = entry("BKLG-002");
  assert.deepEqual(e.phases.map((p) => p.name), ["P1", "P2", "P3", "P4", "P5"]);
  assert.deepEqual(e.phaseCounts, { done: 1, active: 2, dropped: 1, planned: 1 });
  assert.equal(e.phases.find((p) => p.name === "P1").note, "six of eleven columns already read", "the card's row wins");
});

test("the docs to read for phases are the open entries' own docs", () => {
  assert.deepEqual(docsToRead(REGISTER, config), ["docs/implementations/bugs/retry/plan.md", "docs/implementations/features/import/spec.md"]);
  assert.deepEqual(docLinks("[a](../x.md) · [web](https://example.com)", "docs/implementations"), [{ label: "a", path: "docs/x.md" }]);
});

test("statuses and priorities are read canonically; totals add up", () => {
  assert.deepEqual(board.totals, {
    open: 4, inProgress: 1, blocked: 1, notStarted: 2, closed: 1, pending: 2,
    byPriority: { high: 2, medium: 1, low: 1, none: 0 },
    phases: { done: 1, active: 2, dropped: 1, planned: 1 },
  });
  assert.deepEqual(board.inProgress, ["BKLG-002"]);
  assert.deepEqual(board.blocked, ["BKLG-004"]);
});

test("a blocked entry waits on what its Status cites, and that entry unblocks it", () => {
  assert.deepEqual(entry("BKLG-004").waitsOn, ["BKLG-003"]);
  assert.deepEqual(entry("BKLG-003").unblocks, ["BKLG-004"]);
  assert.deepEqual(entry("BKLG-003").citedBy.sort(), ["BKLG-002", "BKLG-004"]);
  assert.deepEqual(entry("BKLG-001").waitsOn, [], "an open entry waits on nothing");
});

test("next: what unblocks others first, then the written priority, then the oldest; started and blocked left out", () => {
  assert.deepEqual(board.next.map((n) => n.id), ["BKLG-003", "BKLG-001"]);
  assert.deepEqual(board.next[0], { id: "BKLG-003", unblocks: 1, citedBy: 2, priority: "medium", added: "2026-10-02" });
});

test("being cited does not rank: a tracker cited by everything stays behind a higher priority", () => {
  const tracker = buildBoard({
    backlog: `## Open\n\n## BKLG-002 — Tracker\n- **Status**: open\n- **Priority**: low\n\n## BKLG-001 — Fix\n- **Status**: open\n- **Priority**: high\n- **Summary**: part of [[BKLG-002]]\n`,
    history: "",
  });
  assert.deepEqual(tracker.next.map((n) => n.id), ["BKLG-001", "BKLG-002"]);
});

test("the last commit naming an entry is its last touch", () => {
  assert.equal(entry("BKLG-002").last.sha, "c2");
  assert.equal(entry("BKLG-001").last, null);
  assert.deepEqual(board.activity.map((c) => c.sha), ["c2", "c1"]);
});

test("pending ledgers: one item per list line, wrapped lines joined, ids cited", () => {
  const [ledger] = pendingLedgers(REGISTER, config);
  assert.equal(ledger.kind, "verification");
  assert.deepEqual(ledger.items.map((i) => [i.label, i.ids]), [["Review", ["BKLG-002"]], ["Playtest", ["BKLG-003"]]]);
  assert.match(ledger.items[1].text, /retry flow, on a slow network$/);
  assert.equal(pendingLedgers("## Open\n- **Review**: x\n", config).length, 0, "no ledger, no items");
});

test("closed lines: a fenced example is not an entry; a phase line closes its phase only", () => {
  const closed = closedEntries(HISTORY, "docs/implementations");
  assert.deepEqual(closed.map((c) => [c.id, c.phase]), [["BKLG-002", "P0"], ["BKLG-000", ""]]);
  assert.equal(closed[1].title, "First entry");
  assert.equal(closed[1].day, "2026-09-29");
  assert.deepEqual(closed[1].docs, [{ label: "doc", path: "docs/implementations/archive/first/report.md" }]);
  assert.equal(withoutFences("a\n```\nb\n```\nc"), "a\n\n\n\nc");
});

test("an empty register gives an empty board, not an error", () => {
  const empty = buildBoard({ backlog: "", history: "" });
  assert.equal(empty.totals.open, 0);
  assert.deepEqual(empty.next, []);
});
