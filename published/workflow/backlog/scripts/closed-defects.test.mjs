/** Tests of `closed-defects.mjs`: a defect row says what its closing entry says. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { contradictions, ownerRows, saysClosed } from "./closed-defects.mjs";
import { parseConfig } from "./project.mjs";

const DOC = `## Open defects

| defect | closed by | state |
|---|---|---|
| D1 slow import | [[BKLG-010]] | open |
| D2 wrong total | [[BKLG-011]] | ✅ closed |
| D3 two owners | [[BKLG-012]], [[BKLG-013]] | open |
| D4 cited, not owned | none — maybe [[BKLG-014]] | open |

| defect | why |
|---|---|
| D9 another table | [[BKLG-010]] |
`;

test("rows come only from tables with both columns; owners only from the owner cell", () => {
  const rows = ownerRows(DOC);
  assert.deepEqual(rows.map((r) => r.defect), ["D1 slow import", "D2 wrong total", "D3 two owners", "D4 cited, not owned"]);
  assert.deepEqual(rows[2].owners, ["BKLG-012", "BKLG-013"]);
  assert.deepEqual(rows[3].owners, []);
});

test("⛔ the entry closed, the row still open", () => {
  const found = contradictions(ownerRows(DOC), { open: ["BKLG-011"], closed: ["BKLG-010"] });
  assert.deepEqual(found.map((f) => [f.defect, f.direction]), [
    ["D1 slow import", "entry-closed-row-open"],
    ["D2 wrong total", "row-closed-entry-open"],
  ]);
});

test("· several owners: the row is closed only when all are", () => {
  assert.deepEqual(contradictions(ownerRows(DOC), { open: ["BKLG-013"], closed: ["BKLG-012"] }), []);
  assert.equal(contradictions(ownerRows(DOC), { open: [], closed: ["BKLG-012", "BKLG-013"] }).length, 1);
});

test("· an owner in neither register is not judged here", () => {
  assert.deepEqual(contradictions(ownerRows(DOC), { open: [], closed: [] }), []);
});

test("the project's words: Italian columns and 'chiuso'", () => {
  const { words } = parseConfig(JSON.stringify({ words: { ownerColumn: "chi lo chiude", stateColumn: "stato", closed: ["chiuso", "chiusa"] } }));
  const doc = "| difetto | chi lo chiude | stato |\n|---|---|---|\n| D1 x | [[BKLG-020]] | aperto |\n| D2 y | [[BKLG-021]] | chiusa il 18/09 |\n";
  const rows = ownerRows(doc, words);
  assert.equal(rows.length, 2);
  assert.ok(saysClosed("chiusa il 18/09", words));
  assert.ok(!saysClosed("aperto", words));
  assert.deepEqual(contradictions(rows, { open: [], closed: ["BKLG-020", "BKLG-021"] }, words).map((f) => f.defect), ["D1 x"]);
  // Control: with the English defaults the Italian table is not read at all.
  assert.equal(ownerRows(doc).length, 0);
});

test("· a row that lost a cell is marked, never judged", () => {
  const doc = "| | closed by | state |\n|---|---|---|\n| **D1** x | [[BKLG-050]] | open |\n| [[BKLG-051]] | ✅ closed |\n";
  const rows = ownerRows(doc);
  assert.deepEqual(rows.map((r) => Boolean(r.malformed)), [false, true]);
  assert.deepEqual(contradictions(rows.filter((r) => !r.malformed), { open: [], closed: ["BKLG-051"] }), []);
});

test("· 'closed' is a whole word: 'unclosed' is not closed", () => {
  assert.ok(!saysClosed("still unclosed"));
  assert.ok(saysClosed("closed 2026-10-01"));
});
