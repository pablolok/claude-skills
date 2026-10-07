/**
 * Tests of `architecture-shape.mjs`: how a canonical section is recognised and how what is inside it
 * is read. Pure functions only — the real gate would measure the repo's state, not the rule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  CONTRIBUTIONS_SECTION,
  DEFECTS_SECTION,
  OWNERS_SECTION,
  architectureDocs,
  defectsInTable,
  defectsWithoutOwner,
  entryInSection,
  isTheSection,
  markersInSection,
  sectionsOf,
  shapeOf,
  withoutOwnerCell,
  withoutShape,
} from "./architecture-shape.mjs";
import { parseConfig } from "./project.mjs";

test("the project's words: Italian sections, owner column, 'nessuno' and the retired line", () => {
  const { words } = parseConfig(JSON.stringify({
    words: {
      openDefects: "I difetti aperti", contributions: "Chi ci ha lavorato", ownerColumn: "chi lo chiude",
      none: ["nessuno", "nessuna"], retired: ["ritirato", "ritirati"],
    },
  }));
  const doc = [
    "## I difetti aperti", "Ritirati finora: D1", "| # | difetto | chi lo chiude |", "|---|---|---|",
    "| D2 | x | [[BKLG-040]] |", "| D3 | y | nessuno — forse [[BKLG-041]] |", "",
    "## Chi ci ha lavorato", "| [[BKLG-039]] | z |",
  ].join("\n");
  assert.deepEqual(shapeOf(doc, words), { defects: true, contributions: true });
  assert.deepEqual([...markersInSection(doc, words.openDefects, words)].sort(), ["D2", "D3"]);
  assert.deepEqual(defectsWithoutOwner([{ name: "a.md", text: doc }], words), ["a.md#D3"]);
  assert.deepEqual(withoutOwnerCell([{ name: "a.md", text: doc }], words), []);
  // Control: with the English defaults the same doc has neither section.
  assert.deepEqual(shapeOf(doc), { defects: false, contributions: false });
});

test("· a declared exclusion leaves the set the gates judge", () => {
  const root = mkdtempSync(join(tmpdir(), "architecture-excl-"));
  try {
    for (const p of ["docs/architecture/a.md", "docs/architecture/glossary.md"]) {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), "x");
    }
    assert.deepEqual(architectureDocs(root, "docs/architecture", { "docs/architecture/glossary.md": "a glossary" }), ["docs/architecture/a.md"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the numeric prefix belongs to the index, not the name", () => {
  for (const title of ["Open defects", "5. Open defects", "3.1 Open defects", "open defects"]) {
    assert.equal(isTheSection(title, DEFECTS_SECTION), true, title);
  }
});

test("⭐ control: a title that is NOT that section does not pass", () => {
  for (const title of ["Open defects, measured", "Known defects", "Who worked on it"]) {
    assert.equal(isTheSection(title, DEFECTS_SECTION), false, title);
  }
});

test("⛔ «Defect owners» is NOT «Who worked on it»", () => {
  assert.equal(isTheSection(OWNERS_SECTION, CONTRIBUTIONS_SECTION), false);
});

const doc = [
  "# Combat",
  "prologue",
  "",
  "## 4. Open defects",
  "D1 — something → [[BKLG-011]]",
  "",
  "## 5. Defect owners",
  "| D1 | [[BKLG-011]] |",
  "",
  "## 6. Who worked on it",
  "| [[BKLG-022]] | did a thing |",
].join("\n");

test("sections split on `##`, and the prologue is not a section", () => {
  assert.deepEqual(sectionsOf(doc).map((s) => s.title), ["4. Open defects", "5. Defect owners", "6. Who worked on it"]);
});

test("entries are read INSIDE the requested section, not the whole doc", () => {
  assert.deepEqual([...entryInSection(doc, CONTRIBUTIONS_SECTION)], ["BKLG-022"]);
  assert.deepEqual([...entryInSection(doc, DEFECTS_SECTION)], ["BKLG-011"]);
});

test("a doc with both sections has the shape", () => {
  assert.deepEqual(shapeOf(doc), { defects: true, contributions: true });
});

test("⛔ and one missing a section is named, with WHICH one", () => {
  assert.deepEqual(withoutShape([{ name: "a.md", text: "# T\n\n## Open defects\nnone known" }]), [
    { name: "a.md", defects: true, contributions: false },
  ]);
  assert.deepEqual(withoutShape([{ name: "b.md", text: "# T\n\n## Who worked on it\n| — | — |" }]), [
    { name: "b.md", defects: false, contributions: true },
  ]);
  // Control: a well-formed doc is not in the list.
  assert.deepEqual(withoutShape([{ name: "c.md", text: doc }]), []);
});

test("defect markers are read INSIDE the section, with any letter", () => {
  const text = [
    "## 4. Open defects",
    "### D1 — something",
    "### R5 — another numbering scheme",
    "",
    "## 6. Who worked on it",
    "| [[BKLG-022]] | closed D9 |",
  ].join("\n");
  assert.deepEqual([...markersInSection(text, DEFECTS_SECTION)].sort(), ["D1", "R5"]);
});

test("⭐ control: a marker OUTSIDE the section does not count", () => {
  const text = ["## Open defects", "none known", "", "## Who worked on it", "| x | closed D9 |"].join("\n");
  assert.deepEqual([...markersInSection(text, DEFECTS_SECTION)], []);
});

test("⛔ the RETIRED list does not count as open", () => {
  // Numbers are not recycled, so the list stays; counting it would reject a closed entry for the
  // defect it closed itself.
  const text = ["## Open defects", "None open. **Retired so far: D1**, **D2**.", "", "## Who worked on it"].join("\n");
  assert.deepEqual([...markersInSection(text, DEFECTS_SECTION)], []);
});

test("· and a REAL defect next to the retired list is still seen", () => {
  const text = ["## Open defects", "**Open: D3.**", "Retired so far: D1.", "", "## Who worked on it"].join("\n");
  assert.deepEqual([...markersInSection(text, DEFECTS_SECTION)], ["D3"]);
});

test("⚠️ DECLARED LIMIT: an open marker on the SAME line as the retired list is lost", () => {
  const text = ["## Open defects", "**Open: D3.** Retired so far: D1.", "", "## Who worked on it"].join("\n");
  assert.deepEqual([...markersInSection(text, DEFECTS_SECTION)], []);
});

// ─── Who closes each defect ──────────────────────────────────────────────────────────────────────

const tab = (...lines) => lines.join("\n");

test("· a «closed by» column makes a defect attributable, wherever the table lives", () => {
  const text = tab("| defect | closed by | state |", "|---|---|---|", "| **D1** | [[BKLG-009]] | open |");
  assert.deepEqual(defectsInTable(text), [{ id: "D1", attributable: true, owner: "[[BKLG-009]]" }]);
  assert.deepEqual(defectsWithoutOwner([{ name: "x.md", text }]), []);
});

test("⛔ EVIDENCE in the prose is not the OWNER — the cell decides, not the row", () => {
  const text = tab(
    "| | defect | closed by |",
    "|---|---|---|",
    "| **D1** | spawn waves stall. Measured in [[BKLG-004]] | open — no entry |",
  );
  assert.deepEqual(defectsWithoutOwner([{ name: "x.md", text }]), ["x.md#D1"]);
});

test("⛔ a written «none» wins over an entry named in the same cell", () => {
  const text = tab("| defect | closed by | state |", "|---|---|---|", "| **D2** | none — maybe [[BKLG-005]] later | open |");
  assert.deepEqual(defectsWithoutOwner([{ name: "x.md", text }]), ["x.md#D2"]);
});

test("⛔ a table headed «limit» carries accepted limits, not open defects", () => {
  const text = tab("| limit | what it costs | why accepted |", "|---|---|---|", "| **D8** — one enemy type | little | reopen if seen |");
  assert.deepEqual(defectsInTable(text), []);
  assert.deepEqual(withoutOwnerCell([{ name: "x.md", text }]), []);
});

test("⛔ a table headed «retired» carries closed defects, not open ones", () => {
  const text = tab("| retired | what it was | where to read |", "|---|---|---|", "| **D4** | the old spawner → [[BKLG-006]] | §3 |");
  assert.deepEqual(defectsInTable(text), []);
});

test("· the question is per DEFECT: two tables, one with the column is enough", () => {
  const text = tab(
    "| **D1** | the list re-renders |",
    "",
    "| defect | closed by | state |",
    "|---|---|---|",
    "| **D1** | [[BKLG-009]] | open |",
  );
  assert.deepEqual(withoutOwnerCell([{ name: "x.md", text }]), []);
  assert.deepEqual(defectsWithoutOwner([{ name: "x.md", text }]), []);
});

test("⛔ a defect with NO owner cell anywhere fails, and says which", () => {
  const text = tab("| | |", "|---|---|", "| **D3** | the list re-renders on every read |");
  assert.deepEqual(withoutOwnerCell([{ name: "combat.md", text }]), [{ name: "combat.md", missing: ["D3"] }]);
});

test("citation bare: an owner cell and a section cite an entry by its bare id", () => {
  const config = parseConfig(JSON.stringify({ citation: "bare" }));
  const doc = [
    "## Open defects", "| # | defect | closed by |", "|---|---|---|", "| D1 | x | BKLG-011 |", "| D2 | y | none — maybe BKLG-012 |", "",
    "## Who worked on it", "| BKLG-010 | z |",
  ].join("\n");
  assert.deepEqual(defectsWithoutOwner([{ name: "a.md", text: doc }], config.words, config), ["a.md#D2"]);
  assert.deepEqual([...entryInSection(doc, CONTRIBUTIONS_SECTION, config)], ["BKLG-010"]);
  // Control: under the default form the bare owner is no owner, and the section cites nothing.
  assert.deepEqual(defectsWithoutOwner([{ name: "a.md", text: doc }]), ["a.md#D1", "a.md#D2"]);
  assert.deepEqual([...entryInSection(doc, CONTRIBUTIONS_SECTION)], []);
});

// ─── The folder walk ─────────────────────────────────────────────────────────────────────────────

test("architectureDocs recurses, skips the README index, and tolerates a missing folder", () => {
  const root = mkdtempSync(join(tmpdir(), "architecture-shape-"));
  try {
    assert.deepEqual(architectureDocs(root), [], "no folder = zero docs, not an error");
    for (const p of ["docs/architecture/README.md", "docs/architecture/combat.md", "docs/architecture/enemies/slime.md", "docs/architecture/diagrams/a.svg"]) {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), "x", "utf8");
    }
    assert.deepEqual(architectureDocs(root), ["docs/architecture/combat.md", "docs/architecture/enemies/slime.md"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
