/**
 * Tests of `backlog-anchor.mjs`: the pure rules — the footprint from an already-obtained log, the
 * read of the `Architecture` field, the judgement, and the recognition of a commit that opens or
 * closes an entry. Git is injected as a fake `run`, so no test depends on the repo's history.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  declaredDocs,
  entriesOfCommit,
  entryBlock,
  entryOrphans,
  footprint,
  footprintFromLog,
  hasArchitectureField,
  judgement,
  lastOpenBlock,
  lastOpenBlocks,
  removalCommits,
} from "./backlog-anchor.mjs";
import { createResolver } from "./docIndex.mjs";
import { parseConfig } from "./project.mjs";

const SEP = "@@COMMIT@@";
const commit = (subject, ...files) => `${SEP}${subject}\n${files.join("\n")}\n`;

test("the footprint is the union of the commits' files", () => {
  const log = commit("fix(BKLG-001): x", "src/A.cs", "src/B.cs") + commit("test(BKLG-001): y", "src/B.cs");
  assert.deepEqual([...footprintFromLog(log)].sort(), ["src/A.cs", "src/B.cs"]);
});

test("· a line that is not a path does not enter (blank, a root file with no folder)", () => {
  assert.deepEqual([...footprintFromLog(commit("fix(BKLG-001): x", "", "CHANGELOG", "src/A.cs"))], ["src/A.cs"]);
});

test("⛔ a commit that NARRATES the entry in its body does not anchor it", () => {
  // `--grep` matches the whole message; only the subject (`%s`) is printed, so a commit that names
  // the entry in its body only arrives here without the id and is discarded.
  const log = commit("fix(BKLG-001): its own subject", "src/Mine.cs") + commit("refactor(BKLG-009): other work", "src/Theirs.cs");
  assert.deepEqual([...footprint("BKLG-001", () => log)], ["src/Mine.cs"]);
});

test("⛔ and `BKLG-1` does NOT take the footprint of `BKLG-10`", () => {
  const log = commit("fix(BKLG-10): another entry", "src/Ten.cs");
  assert.deepEqual([...footprint("BKLG-1", () => log)], []);
  assert.deepEqual([...footprint("BKLG-10", () => log)], ["src/Ten.cs"]);
});

test("· a git failure is an empty footprint, not a crash", () => {
  assert.deepEqual([...footprint("BKLG-001", () => { throw new Error("not a repo"); })], []);
});

test("an entry's block ends where the next one starts", () => {
  const text = ["## BKLG-001 — title", "- **Status**: open", "", "## BKLG-002 — other", "- **Status**: open"].join("\n");
  assert.match(entryBlock(text, "BKLG-001"), /Status.*open/s);
  assert.doesNotMatch(entryBlock(text, "BKLG-001"), /BKLG-002/);
});

test("· an absent id gives empty, not the rest of the file", () => {
  assert.equal(entryBlock("## BKLG-001 — title\n- **Status**: open", "BKLG-007"), "");
});

test("· `BKLG-55` is not the block of `BKLG-555`", () => {
  const text = "## BKLG-555 — five hundred\n- **Status**: open";
  assert.equal(entryBlock(text, "BKLG-55"), "");
  assert.match(entryBlock(text, "BKLG-555"), /five hundred/);
});

test("· the history one-liner shape is a block too", () => {
  const text = "- **BKLG-004** Dash fix — shipped · **Done**: 2026-09-01\n- **BKLG-003** Other — shipped";
  assert.match(entryBlock(text, "BKLG-004"), /Dash fix/);
  assert.doesNotMatch(entryBlock(text, "BKLG-004"), /BKLG-003/);
});

// The resolver is the production one: a test about names must exercise the real resolution.
const FAKE_DOCS = new Set([
  "docs/architecture/combat.md",
  "docs/architecture/spawning.md",
  "docs/architecture/player.md",
  "docs/architecture/enemies/slime.md",
  "docs/architecture/enemies/husk.md",
]);
const fakeResolve = createResolver(FAKE_DOCS);

test("the field has THREE states, and the third is an assertion", () => {
  // null = no field: the entry is silent and nothing is demanded of it
  assert.equal(declaredDocs("## BKLG-001\n- **Status**: open", fakeResolve), null);
  // [] = EXPLICITLY none — different from saying nothing
  for (const none of ["—", "-", "none", "no", "None — nothing structural"]) {
    assert.deepEqual(declaredDocs(`- **Architecture**: ${none}`, fakeResolve), [], none);
  }
  // a list = these docs must cite it
  assert.deepEqual(declaredDocs("- **Architecture**: [x](../architecture/combat.md)", fakeResolve), [
    { doc: "docs/architecture/combat.md", ref: "combat.md", markers: [] },
  ]);
});

test("⭐ the defect MARKER is optional — `doc.md#D3`, any letter", () => {
  assert.deepEqual(declaredDocs("- **Architecture**: combat.md#D3 — splits the damage pipeline", fakeResolve), [
    { doc: "docs/architecture/combat.md", ref: "combat.md", markers: ["D3"] },
  ]);
  assert.deepEqual(declaredDocs("- **Architecture**: spawning.md#R5", fakeResolve), [
    { doc: "docs/architecture/spawning.md", ref: "spawning.md", markers: ["R5"] },
  ]);
});

test("⭐ a doc in a SUBFOLDER resolves by suffix", () => {
  assert.deepEqual(declaredDocs("- **Architecture**: slime.md#D3", fakeResolve), [
    { doc: "docs/architecture/enemies/slime.md", ref: "slime.md", markers: ["D3"] },
  ]);
  assert.deepEqual(
    declaredDocs("- **Architecture**: [docs/architecture/enemies/slime.md#D3](../architecture/enemies/slime.md)", fakeResolve),
    [{ doc: "docs/architecture/enemies/slime.md", ref: "slime.md", markers: ["D3"] }],
  );
});

test("· a markdown link names the doc twice, and counts once", () => {
  assert.deepEqual(declaredDocs("- **Architecture**: [combat.md#D3](../architecture/combat.md)", fakeResolve), [
    { doc: "docs/architecture/combat.md", ref: "combat.md", markers: ["D3"] },
  ]);
});

test("· reads several docs, without repeating one named twice", () => {
  assert.deepEqual(declaredDocs("- **Architecture**: combat.md, player.md#D2, combat.md", fakeResolve), [
    { doc: "docs/architecture/combat.md", ref: "combat.md", markers: [] },
    { doc: "docs/architecture/player.md", ref: "player.md", markers: ["D2"] },
  ]);
});

test("⛔ a doc that does NOT exist is REPORTED, not silently dropped", () => {
  assert.deepEqual(declaredDocs("- **Architecture**: invented.md, combat.md", fakeResolve), [
    { doc: null, ref: "invented.md", markers: [] },
    { doc: "docs/architecture/combat.md", ref: "combat.md", markers: [] },
  ]);
});

test("⚠️ two docs with the same name stay UNRESOLVED", () => {
  const resolve = createResolver(new Set(["docs/architecture/enemies/ai.md", "docs/architecture/player/ai.md"]));
  assert.deepEqual(declaredDocs("- **Architecture**: ai.md", resolve), [{ doc: null, ref: "ai.md", markers: [] }]);
});

const COMBAT = "docs/architecture/combat.md";
const PLAYER = "docs/architecture/player.md";
const citesEntry = new Map([[COMBAT, new Set(["BKLG-001"])]]);
const entryContributions = new Map([[COMBAT, new Set(["BKLG-002"])]]);
const markersByDoc = new Map([[COMBAT, new Set(["D3"])]]);
const base = { derived: [], citesEntry, entryContributions, markersByDoc };

test("⛔ a DECLARED doc that does not cite the entry fails", () => {
  const { missing } = judgement({ ...base, id: "BKLG-001", closed: false, declared: [{ doc: PLAYER, markers: [] }] });
  assert.deepEqual(missing, [PLAYER]);
});

test("⭐ control: if it already cites it, nothing is reported", () => {
  const { missing, markers, toCheck } = judgement({
    ...base, id: "BKLG-001", closed: false, declared: [{ doc: COMBAT, markers: [] }], derived: [COMBAT],
  });
  assert.deepEqual(missing, []);
  assert.deepEqual(markers, []);
  assert.deepEqual(toCheck, []);
});

test("⭐ WHERE it must be cited depends on state: open anywhere, closed in the CONTRIBUTIONS", () => {
  // BKLG-001 is cited by the doc but NOT among the contributions: fine while open (it sits among the
  // defects), a failure once closed — the stale defect line must not satisfy the check.
  const scenario = (closed) => judgement({ ...base, id: "BKLG-001", closed, declared: [{ doc: COMBAT, markers: [] }] }).missing;
  assert.deepEqual(scenario(false), []);
  assert.deepEqual(scenario(true), [COMBAT]);
});

test("⛔ MARKER, open direction: absent from the defects table fails", () => {
  const { markers } = judgement({ ...base, id: "BKLG-001", closed: false, declared: [{ doc: COMBAT, markers: ["D9"] }] });
  assert.deepEqual(markers, [{ doc: COMBAT, marker: "D9", direction: "absent" }]);
});

test("⛔ MARKER, closed direction: STILL in the table fails", () => {
  const { markers } = judgement({ ...base, id: "BKLG-002", closed: true, declared: [{ doc: COMBAT, markers: ["D3"] }] });
  assert.deepEqual(markers, [{ doc: COMBAT, marker: "D3", direction: "left" }]);
});

test("⭐ and the two directions are each other's control case", () => {
  const withMarker = (closed, marker, id) =>
    judgement({ ...base, id, closed, declared: [{ doc: COMBAT, markers: [marker] }] }).markers;
  assert.deepEqual(withMarker(false, "D3", "BKLG-001"), []);
  assert.deepEqual(withMarker(true, "D9", "BKLG-002"), []);
});

test("📄 a doc that is only DERIVED is listed, and does not fail", () => {
  const { missing, toCheck } = judgement({ ...base, id: "BKLG-001", closed: false, declared: null, derived: [PLAYER] });
  assert.deepEqual(missing, []);
  assert.deepEqual(toCheck, [PLAYER]);
});

test("⛔ an unresolved declaration comes out as unknown", () => {
  const { unknown } = judgement({ ...base, id: "BKLG-001", closed: false, declared: [{ doc: null, ref: "typo.md", markers: [] }] });
  assert.deepEqual(unknown, ["typo.md"]);
});

test("opened and closed are recognised from the LINES ADDED to the two registers", () => {
  const added = "@@ -1,3 +1,5 @@\n+## BKLG-007 — new\n+- **Status**: open\n ## BKLG-006 — old\n";
  const closing = "@@ -1,2 +1,4 @@\n+- **BKLG-005** closed — shipped · **Done**: today\n";
  assert.deepEqual(entriesOfCommit(added, closing), { opened: ["BKLG-007"], closed: ["BKLG-005"] });
});

test("· a CONTEXT line is not an opening (the `+` is the point)", () => {
  assert.deepEqual(entriesOfCommit(" ## BKLG-006 — already there\n", ""), { opened: [], closed: [] });
});

// ─── The field read WHOLE, and the ways it could vanish silently ─────────────────────────────────

test("⛔⛔ the field is read WHOLE: a doc on a continuation line does NOT vanish", () => {
  const block = [
    "## BKLG-001 — x",
    "- **Architecture**: [player.md](../architecture/player.md),",
    "  [combat.md](../architecture/combat.md) — the first because D1 said nothing measures it",
    "- **Doc**: —",
  ].join("\n");
  assert.deepEqual(declaredDocs(block, fakeResolve).map((d) => d.doc), [PLAYER, COMBAT]);
});

test("· and it ends where the field ends: the next field does not enter", () => {
  const block = ["- **Architecture**: combat.md", "- **Doc**: [something](../implementations/player.md)"].join("\n");
  assert.deepEqual(declaredDocs(block, fakeResolve).map((d) => d.doc), [COMBAT]);
});

test("· and at a BLANK line, which is where the paragraph ends", () => {
  const block = ["- **Architecture**: combat.md", "", "Prose naming player.md"].join("\n");
  assert.deepEqual(declaredDocs(block, fakeResolve).map((d) => d.doc), [COMBAT]);
});

test("⛔⛔ but «I declare NONE» wins on the opening, and the prose below stays prose", () => {
  const block = [
    "- **Architecture**: — (nothing changes until the fix is chosen: the pipeline lives in",
    "  `combat.md`, the probe has no doc of its own)",
    "- **Doc**: —",
  ].join("\n");
  assert.deepEqual(declaredDocs(block, fakeResolve), []);
});

test("⛔ the MARKER is also read AFTER the link's parenthesis", () => {
  assert.deepEqual(declaredDocs("- **Architecture**: [combat.md](../architecture/combat.md)#D3", fakeResolve), [
    { doc: COMBAT, ref: "combat.md", markers: ["D3"] },
  ]);
});

test("⭐ a marker NO doc claims fails, instead of dropping", () => {
  assert.deepEqual(entryOrphans("- **Architecture**: [combat.md](../architecture/combat.md) (see #D7)").orphans, ["D7"]);
  // Control: in one of the two good spellings it is not an orphan.
  assert.deepEqual(entryOrphans("- **Architecture**: combat.md#D3").orphans, []);
  assert.deepEqual(entryOrphans("- **Architecture**: [combat.md](../architecture/combat.md)#D3").orphans, []);
});

test("· «I declare none» has no markers to look for, not even in its prose", () => {
  assert.deepEqual(entryOrphans("- **Architecture**: — (defect #D9 belongs to another entry)").orphans, []);
});

test("⭐ the judgement FAILS on an orphan marker", () => {
  const outcome = judgement({
    id: "BKLG-001", closed: false, declared: [], derived: [],
    citesEntry: new Map(), entryContributions: new Map(), markersByDoc: new Map(), orphans: ["D7"],
  });
  assert.deepEqual(outcome.orphans, ["D7"]);
});

// ─── A closed entry whose history line dropped the field ────────────────────────────────────────

test("hasArchitectureField tells a full block from a condensed history line", () => {
  assert.equal(hasArchitectureField("## BKLG-001 — x\n- **Architecture**: combat.md"), true);
  assert.equal(hasArchitectureField("- **BKLG-001** x — shipped · **Done**: 2026-09-01"), false);
});

test("⭐ lastOpenBlock reads the entry from BACKLOG.md as it was just before removal", () => {
  const before = "## Open\n\n## BKLG-004 — Dash fix\n- **Architecture**: player.md#D2\n- **Doc**: —\n";
  const calls = [];
  const run = (args) => {
    calls.push(args.join(" "));
    if (args[0] === "log") return "abc123\n";
    if (args[0] === "show" && args[1] === "abc123~1:docs/implementations/BACKLOG.md") return before;
    throw new Error("unexpected");
  };
  const block = lastOpenBlock("BKLG-004", run);
  assert.deepEqual(declaredDocs(block, fakeResolve), [{ doc: PLAYER, ref: "player.md", markers: ["D2"] }]);
  assert.match(calls[0], /-S## BKLG-004 /, "pickaxe on the heading, with the space as digit boundary");
});

test("· no removing commit, or git failing, gives an empty block", () => {
  assert.equal(lastOpenBlock("BKLG-004", () => ""), "");
  assert.equal(lastOpenBlock("BKLG-004", () => { throw new Error("no git"); }), "");
});

test("⭐ removalCommits: one log read gives every entry's last removal, both heading levels", () => {
  const log = [
    "@@COMMIT@@ccc", "-## BKLG-002 — closed last", "+- **BKLG-002** done",
    "@@COMMIT@@bbb", "-### BKLG-003 — closed", "--- a/docs/BACKLOG.md",
    "@@COMMIT@@aaa", "-## BKLG-002 — an older removal", "+## BKLG-002 — reopened",
  ].join("\n");
  const removals = removalCommits(log);
  assert.equal(removals.get("BKLG-002"), "ccc", "newest first: the first removal seen is the last");
  assert.equal(removals.get("BKLG-003"), "bbb");
  assert.equal(removals.has("BKLG-004"), false);
});

test("· lastOpenBlocks reads the history once for many entries", () => {
  const calls = [];
  const run = (args) => {
    calls.push(args[0]);
    if (args[0] === "log") return "@@COMMIT@@abc\n-## BKLG-005 — five\n-## BKLG-006 — six\n";
    return "## Open\n\n## BKLG-005 — five\n- **Architecture**: a.md\n\n## BKLG-006 — six\n- **Architecture**: b.md\n";
  };
  const before = lastOpenBlocks(run, "docs/implementations/BACKLOG.md");
  assert.match(before("BKLG-005"), /a\.md/);
  assert.match(before("BKLG-006"), /b\.md/);
  assert.equal(before("BKLG-007"), "");
  assert.deepEqual(calls, ["log", "show"], "one log, one show for the shared removing commit");
});

// ─── A register in another layout and another language ────────────────────────────────────────

test("⭐ a commit that OPENS a ### entry is seen (the case a ##-only reader missed for weeks)", () => {
  const { opened, closed } = entriesOfCommit("+### BKLG-030 — nuova\n+- **Stato**: open\n", "");
  assert.deepEqual(opened, ["BKLG-030"]);
  assert.deepEqual(closed, []);
});

test("· a closed PHASE in the history diff does not close its entry", () => {
  assert.deepEqual(entriesOfCommit("", "+- **BKLG-031 F1** fase\n+- **BKLG-032** intera\n").closed, ["BKLG-032"]);
});

test("the Architecture field is read under the project's name, with its words for 'none'", () => {
  const config = parseConfig(JSON.stringify({ fieldNames: { Architecture: "Architettura" }, words: { none: ["nessuno", "nessuna"] } }));
  const resolve = createResolver(new Set(["docs/architecture/billing.md"]));
  const block = "### BKLG-033 — x\n- **Architettura**: billing.md#D2 — la tabella cambia\n";
  assert.deepEqual(declaredDocs(block, resolve, config), [{ doc: "docs/architecture/billing.md", ref: "billing.md", markers: ["D2"] }]);
  assert.deepEqual(declaredDocs("- **Architettura**: nessuno — non tocca i documenti\n", resolve, config), []);
  // Control: with the defaults the Italian field is not a declaration at all.
  assert.equal(declaredDocs(block, resolve), null);
});
