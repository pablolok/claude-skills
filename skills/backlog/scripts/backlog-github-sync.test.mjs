// Tests for the pure helpers of backlog-github-sync.mjs. No network / no gh.
// Run with:  node --test <skill>/scripts/backlog-github-sync.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stripMarkdown,
  parseOpenEntries,
  extractBklgIds,
  knownBklgIds,
  nextBklgId,
  formatBklgId,
  issueTitleFor,
  labelsFor,
  leadingKeyword,
  typeLabelFromDoc,
  issueBodyFor,
  labelDelta,
  bodyNeedsUpdate,
  repoFromRemote,
  branchFromOriginHead,
} from "./backlog-github-sync.mjs";

const SAMPLE = `# Implementation Backlog

## Pending verification
- **Tests**: [[BKLG-999]] (commit \`abc1234\`) — should be ignored, not an Open entry

## Open

## BKLG-002 — Backlog ⟷ GitHub Issues **bidirectional** sync (upgrade the \`backlog\` skill)
- **Status**: open
- **Priority**: medium
- **Added**: 2026-09-28
- **Manual**: no
- **Architecture**: —
- **Doc**: [features/backlog-github-sync/spec.md](features/backlog-github-sync/spec.md)
- **Summary**: Keep GitHub Issues and the file backlog aligned both ways.

## BKLG-001 — Checkout drops the discount on retry
- **Status**: in-progress — repro captured
- **Priority**: high
- **Added**: 2026-09-28
- **Doc**: [bugs/checkout-discount-retry/plan.md](bugs/checkout-discount-retry/plan.md)
- **Issue**: #42
- **Summary**: A retried payment rebuilds the cart without the code.

## Done / Archived
See BACKLOG-HISTORY.md for completed entries (BKLG-004, BKLG-003).
`;

// A REAL-SHAPED entry: the Summary wraps over several lines and the Doc field carries a
// second link on a continuation line — single-line fixtures would never catch truncation.
const WRAPPED = `## Open

## BKLG-010 — Wrapped fields
- **Status**: open
- **Priority**: high
- **Doc**: [features/x/spec.md](features/x/spec.md) ·
  [plan.md](features/x/plan.md)
- **Summary**: first line of the summary,
  second line that continues it,
  and a third one.

## BKLG-009 — The next entry must not absorb the previous summary
- **Status**: open
- **Summary**: mine only.
`;

test("stripMarkdown removes bold, code, links", () => {
  assert.equal(stripMarkdown("a **b** c"), "a b c");
  assert.equal(stripMarkdown("use the `backlog` skill"), "use the backlog skill");
  assert.equal(stripMarkdown("[features/x/spec.md](features/x/spec.md)"), "features/x/spec.md");
  assert.equal(stripMarkdown("Backlog ⟷ Issues **bidir** (the `x` skill)"), "Backlog ⟷ Issues bidir (the x skill)");
});

test("parseOpenEntries returns only ## Open BKLG entries", () => {
  const entries = parseOpenEntries(SAMPLE);
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((e) => e.idStr),
    ["BKLG-002", "BKLG-001"],
  );
  // The Pending-verification BKLG-999 mention is NOT an entry.
  assert.ok(!entries.some((e) => e.idStr === "BKLG-999"));
});

test("parseOpenEntries extracts fields, plain title, and Issue number", () => {
  const [e002, e001] = parseOpenEntries(SAMPLE);
  assert.equal(e002.title, "Backlog ⟷ GitHub Issues bidirectional sync (upgrade the backlog skill)");
  assert.equal(e002.fields.Status, "open");
  assert.equal(e002.fields.Priority, "medium");
  assert.equal(e002.issue, null);
  assert.equal(e001.issue, 42);
  assert.equal(e001.fields.Status, "in-progress — repro captured");
});

test("extractBklgIds finds every referenced id", () => {
  assert.deepEqual(extractBklgIds("BKLG-004, BKLG-003 and BKLG-002").sort(), [2, 3, 4]);
  assert.deepEqual(extractBklgIds("no ids here"), []);
});

test("nextBklgId is max+1 across all sources", () => {
  assert.equal(nextBklgId([2, 1], [4, 3], [5]), 6);
  assert.equal(nextBklgId([], []), 1);
});

test("formatBklgId zero-pads to 3 digits", () => {
  assert.equal(formatBklgId(7), "BKLG-007");
  assert.equal(formatBklgId(123), "BKLG-123");
});

test("issueTitleFor is 'BKLG-NNN — title'", () => {
  assert.equal(issueTitleFor({ idStr: "BKLG-002", title: "Sync thing" }), "BKLG-002 — Sync thing");
});

test("labelsFor maps status/priority/type from fields", () => {
  const labels = labelsFor({ Status: "open", Priority: "medium", Doc: "[x](features/y/spec.md)" });
  assert.deepEqual(labels.sort(), ["backlog", "feature", "priority:medium", "status:open"].sort());
});

test("leadingKeyword strips parenthetical annotations", () => {
  assert.equal(leadingKeyword("in-progress (2026-07-06 — baseline green)"), "in-progress");
  assert.equal(leadingKeyword("blocked — waiting on the boss rig"), "blocked");
  assert.equal(leadingKeyword("open"), "open");
  assert.equal(leadingKeyword("  Medium  "), "medium");
  assert.equal(leadingKeyword(""), "");
});

test("labelsFor reads status even with a parenthetical annotation", () => {
  const labels = labelsFor({ Status: "in-progress (2026-07-06 — baseline green captured)", Priority: "high" });
  assert.ok(labels.includes("status:in-progress"));
  assert.ok(labels.includes("priority:high"));
});

test("labelsFor omits missing dimensions", () => {
  const labels = labelsFor({ Status: "blocked" });
  assert.deepEqual(labels.sort(), ["backlog", "status:blocked"].sort());
});

test("typeLabelFromDoc maps folder to label", () => {
  assert.equal(typeLabelFromDoc("[x](features/a/spec.md)"), "feature");
  assert.equal(typeLabelFromDoc("bugs/a/plan.md"), "bug");
  assert.equal(typeLabelFromDoc("analysis/a/report.md"), "analysis");
  assert.equal(typeLabelFromDoc("diagnostic/a/report.md"), "diagnostic");
  assert.equal(typeLabelFromDoc("—"), null);
});

test("issueBodyFor includes summary + a blob doc link", () => {
  const body = issueBodyFor(
    { fields: { Summary: "Do the thing.", Doc: "[features/x/spec.md](features/x/spec.md)" } },
    "acme/widgets",
  );
  assert.match(body, /Do the thing\./);
  assert.match(body, /https:\/\/github\.com\/acme\/widgets\/blob\/main\/docs\/implementations\/features\/x\/spec\.md/);
});

test("issueBodyFor links the project's default branch and register folder", () => {
  const body = issueBodyFor(
    { fields: { Summary: "x", Doc: "[bugs/y/plan.md](bugs/y/plan.md)" } },
    "acme/widgets",
    { branch: "develop", docsDir: "handbook/backlog" },
  );
  assert.match(body, /github\.com\/acme\/widgets\/blob\/develop\/handbook\/backlog\/bugs\/y\/plan\.md/);
});

test("issueBodyFor omits doc link when Doc is —", () => {
  const body = issueBodyFor({ fields: { Summary: "Local one-liner.", Doc: "—" } }, "acme/widgets");
  assert.doesNotMatch(body, /blob\/main/);
});

test("repoFromRemote reads https and ssh GitHub remotes, and nothing else", () => {
  assert.equal(repoFromRemote("https://github.com/acme/widgets.git"), "acme/widgets");
  assert.equal(repoFromRemote("git@github.com:acme/widgets.git\n"), "acme/widgets");
  assert.equal(repoFromRemote("https://github.com/acme/my.site"), "acme/my.site");
  assert.equal(repoFromRemote("https://gitlab.com/acme/widgets.git"), null);
});

test("branchFromOriginHead takes the branch out of origin's HEAD ref", () => {
  assert.equal(branchFromOriginHead("refs/remotes/origin/main\n"), "main");
  assert.equal(branchFromOriginHead("refs/remotes/origin/release/2.x"), "release/2.x");
  assert.equal(branchFromOriginHead("main"), null);
});

test("labelDelta adds missing, removes only owned stale labels", () => {
  const d = labelDelta(
    ["backlog", "priority:low", "status:open", "external-note"],
    ["backlog", "priority:high", "status:open"],
  );
  assert.deepEqual(d.add, ["priority:high"]);
  assert.deepEqual(d.remove, ["priority:low"]); // external-note is foreign → kept
});

test("labelDelta is empty when already aligned", () => {
  const d = labelDelta(["backlog", "status:open"], ["backlog", "status:open"]);
  assert.deepEqual(d.add, []);
  assert.deepEqual(d.remove, []);
});

test("bodyNeedsUpdate is false for identical text", () => {
  assert.equal(bodyNeedsUpdate("Same prose.\n\n📄 Doc: x", "Same prose.\n\n📄 Doc: x"), false);
});

test("bodyNeedsUpdate ignores CRLF and outer whitespace", () => {
  // GitHub stores a web-UI-edited body with CRLF. Without this tolerance the sync
  // would report a diff on EVERY run and rewrite the issue each time.
  assert.equal(bodyNeedsUpdate("line one\r\nline two", "line one\nline two"), false);
  assert.equal(bodyNeedsUpdate("\n  text  \n\n", "text"), false);
});

test("bodyNeedsUpdate is true when the prose actually changed", () => {
  assert.equal(bodyNeedsUpdate("Old summary.", "New summary."), true);
  // A change INSIDE the text is not swallowed by the normalization.
  assert.equal(bodyNeedsUpdate("a\r\nb\r\nc", "a\nB\nc"), true);
});

test("parseOpenEntries joins a Summary that wraps over several lines", () => {
  const [e] = parseOpenEntries(WRAPPED);
  assert.equal(
    e.fields.Summary,
    "first line of the summary, second line that continues it, and a third one.",
  );
});

test("parseOpenEntries joins a wrapped Doc field, and the doc link still resolves", () => {
  const [e] = parseOpenEntries(WRAPPED);
  assert.equal(e.fields.Doc, "[features/x/spec.md](features/x/spec.md) · [plan.md](features/x/plan.md)");
  // issueBodyFor takes the FIRST parenthesised target — the spec, not the continuation link.
  const body = issueBodyFor(e, "acme/widgets");
  assert.match(body, /blob\/main\/docs\/implementations\/features\/x\/spec\.md/);
});

test("parseOpenEntries never lets one entry absorb the next entry's text", () => {
  const [first, second] = parseOpenEntries(WRAPPED);
  assert.doesNotMatch(first.fields.Summary, /mine only/);
  assert.equal(second.fields.Summary, "mine only.");
});

test("parseOpenEntries keeps single-line values untouched", () => {
  // Continuation handling must not alter single-line values.
  const [e002, e001] = parseOpenEntries(SAMPLE);
  assert.equal(e002.fields.Summary, "Keep GitHub Issues and the file backlog aligned both ways.");
  assert.equal(e001.fields.Status, "in-progress — repro captured");
  assert.equal(e001.issue, 42);
});

test("bodyNeedsUpdate treats a null/absent GitHub body as empty", () => {
  assert.equal(bodyNeedsUpdate(null, "Something."), true);
  assert.equal(bodyNeedsUpdate(undefined, "Something."), true);
  assert.equal(bodyNeedsUpdate(null, "   "), false);
});

test("labelsFor reads the status line `<keyword> — <where it stands>`", () => {
  const [, e001] = parseOpenEntries(SAMPLE);
  const labels = labelsFor(e001.fields);
  assert.deepEqual(labels.sort(), ["backlog", "bug", "priority:high", "status:in-progress"].sort());
});

test("knownBklgIds uses the canonical zero-padded id, so issue ids below 100 are recognised", () => {
  const known = knownBklgIds("## BKLG-001 — a\n## BKLG-039 — b", "- **BKLG-004** done");
  assert.ok(known.has("BKLG-001"));
  assert.ok(known.has("BKLG-039"));
  assert.ok(known.has("BKLG-004"));
  assert.ok(!known.has("BKLG-1"));
});
