/**
 * Tests of `register.mjs`: the one place that knows what an entry looks like — in both layouts projects use.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { closedIds, closedLines, entryBlock, entryFields, entryIdOfLine, openEntries, openIds } from "./register.mjs";
import { parseConfig } from "./project.mjs";

const LEVEL2 = `# Backlog

Template: \`## BKLG-NNN — <title>\`

## BKLG-NNN — <title>
- **Status**: the template, never an entry

## Pending verification
- **Tests**: [[BKLG-002]] — not an entry

## Open

## BKLG-002 — Second
- **Status**: open
- **Summary**: first line
  and its continuation

### A subheading inside the entry
more text of BKLG-002

## BKLG-001 — First
- **Status**: in-progress — step 2

## Done
- old notes
`;

const LEVEL3 = `# Backlog

## Open

### BKLG-012 — Uno
- **Stato**: open
- **Architettura**: billing.md#D2 — la tabella cambia
- **Priorità**: alta

### BKLG-011 — Due
- **Stato**: open

## Archived
`;

const HISTORY = `# History
- **BKLG-NNN** <title> — the template
- **BKLG-009** closed whole · **Done**: 2026-10-01
- **BKLG-012 F1** a closed phase only
- **BKLG-008** closed whole
`;

test("open ids: both heading levels, the template never", () => {
  assert.deepEqual(openIds(LEVEL2), ["BKLG-002", "BKLG-001"]);
  assert.deepEqual(openIds(LEVEL3), ["BKLG-012", "BKLG-011"]);
});

test("closed lines carry their phase; only a whole line closes the entry", () => {
  assert.deepEqual(closedLines(HISTORY).map((c) => c.label), ["BKLG-009", "BKLG-012 F1", "BKLG-008"]);
  assert.deepEqual(closedIds(HISTORY), ["BKLG-009", "BKLG-008"]);
});

test("· a title inside the bold is not a phase: `- **BKLG-085 — Title** — closed` closes the entry", () => {
  const history = "- **BKLG-085 — Phone payments** — closed\n- **BKLG-077 F1** a phase\n";
  assert.deepEqual(closedIds(history), ["BKLG-085"]);
  assert.deepEqual(closedLines(history).map((c) => c.label), ["BKLG-085", "BKLG-077 F1"]);
});

test("⭐ a history that keeps whole cards closes them by their heading too", () => {
  const history = "# History\n\n## BKLG-274 — archived as a card\n- **Status**: done\n\n- **BKLG-280** a one-liner\n";
  assert.deepEqual(closedIds(history), ["BKLG-274", "BKLG-280"]);
  assert.match(entryBlock(history, "BKLG-274"), /Status\*\*: done/);
});

test("a ## entry keeps its ### subheading and ends at the next entry", () => {
  const block = entryBlock(LEVEL2, "BKLG-002");
  assert.match(block, /A subheading inside the entry/);
  assert.match(block, /more text of BKLG-002/);
  assert.doesNotMatch(block, /BKLG-001 — First/);
});

test("the last entry ends where its section ends, not at the end of the file", () => {
  assert.doesNotMatch(entryBlock(LEVEL2, "BKLG-001"), /old notes/);
  assert.doesNotMatch(entryBlock(LEVEL3, "BKLG-011"), /Archived/);
});

test("a ### entry ends at the next ### entry", () => {
  const block = entryBlock(LEVEL3, "BKLG-012");
  assert.match(block, /Architettura/);
  assert.doesNotMatch(block, /BKLG-011/);
});

test("a history line is its own block; a phase line is not the entry's", () => {
  assert.equal(entryBlock(HISTORY, "BKLG-009"), "- **BKLG-009** closed whole · **Done**: 2026-10-01");
  assert.equal(entryBlock(HISTORY, "BKLG-012"), "");
});

test("entryIdOfLine reads an opening heading or a history line, never the template", () => {
  assert.equal(entryIdOfLine("### BKLG-042 — x"), "BKLG-042");
  assert.equal(entryIdOfLine("## BKLG-042 — x"), "BKLG-042");
  assert.equal(entryIdOfLine("- **BKLG-042 F2** x"), "BKLG-042");
  assert.equal(entryIdOfLine("## BKLG-NNN — <title>"), null);
  assert.equal(entryIdOfLine("see [[BKLG-042]]"), null);
});

test("fields are read under the project's names and returned under the canonical ones", () => {
  const config = parseConfig(JSON.stringify({ fieldNames: { Status: "Stato", Architecture: "Architettura", Priority: "Priorità" } }));
  const fields = entryFields(entryBlock(LEVEL3, "BKLG-012"), config);
  assert.equal(fields.Architecture, "billing.md#D2 — la tabella cambia");
  assert.equal(fields.Priority, "alta");
  assert.equal(fields.Status, "open");
  // Control: without the mapping the field keeps its own name.
  assert.equal(entryFields(entryBlock(LEVEL3, "BKLG-012")).Architettura, "billing.md#D2 — la tabella cambia");
});

test("open entries: only under ## Open, with titles and wrapped values", () => {
  const entries = openEntries(LEVEL2);
  assert.deepEqual(entries.map((e) => e.id), ["BKLG-002", "BKLG-001"]);
  assert.equal(entries[0].title, "Second");
  assert.equal(entries[0].fields.Summary, "first line and its continuation");
  assert.deepEqual(openEntries("# no open section\n## BKLG-001 — x\n"), []);
});

test("open entries: the section is the project's `words.open`", () => {
  const text = "# Registro\n\n## Aperte\n\n### BKLG-003 — Tre\n- **Status**: open\n\n## Chiuse\n- old\n";
  const config = parseConfig(JSON.stringify({ words: { open: "Aperte" } }));
  assert.deepEqual(openEntries(text, config).map((e) => e.id), ["BKLG-003"]);
  // Control: under the default word the same register has no open section.
  assert.deepEqual(openEntries(text), []);
});
