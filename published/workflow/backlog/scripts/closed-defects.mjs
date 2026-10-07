#!/usr/bin/env node
/**
 * **Does a defect row say what the entry that closes it says?**
 *
 * An area defect lives in two places — the block that describes it and the row naming who closes it — and closing a
 * backlog entry touches neither. Measured, repeatedly: an entry closed, and its defect row still saying "open" days
 * later (or a doc saying "no open defects" over a table still listing them open). A false row does not cost a minute;
 * it gets the wrong work picked next.
 *
 * Read: every architecture doc's tables whose heading has BOTH the owner column (`words.ownerColumn`) and the state
 * column (`words.stateColumn`). Per row, the owners are the entries the OWNER cell cites (`[[BKLG-NNN]]`, or
 * the bare id under `"citation": "bare"`) — that cell only: a citation elsewhere in the row is context, not ownership; the row says "closed" with ✅ or one of `words.closed`.
 *   - every owner entry is closed, the row doesn't say so            → fail;
 *   - the row says closed, an owner entry is still open             → fail.
 * An owner found in neither register is not judged here (an unresolved citation is check-doc-refs' question).
 *
 * Zero rows read: a project that never wrote such tables has nothing to judge (exit 0, said out loud); a project
 * that set `words.stateColumn` in its config declared it keeps them, so zero rows there means the gate went blind
 * (a renamed column) — exit 1.
 *
 * Usage: node <skill>/scripts/closed-defects.mjs   (exit 0 = consistent, 1 = a contradiction or blind)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { architectureDocs } from "./architecture-shape.mjs";
import { citedEntries } from "./docIndex.mjs";
import { DEFAULTS, WORDS, project } from "./project.mjs";
import { closedIds, openIds } from "./register.mjs";

const cellsOf = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** Any of `list`, as a whole word, case-insensitive (`\b` fails on accented letters, so the edges are explicit). */
const anyWord = (list) =>
  new RegExp(`(^|[^\\p{L}\\p{N}])(${list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu");
const nobody = (words) => anyWord(words.none);

/** "Closed" in a state cell: a ✅, or one of the project's words as a whole word. */
export function saysClosed(state, words = WORDS) {
  return state.includes("✅") || anyWord(words.closed).test(state);
}

/**
 * The rows of the owner tables: the defect cell, the owners (the entries the owner cell cites, in the project's
 * citation form — the owner cell only) and the state cell. Pure.
 */
export function ownerRows(text, words = WORDS, config = DEFAULTS) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|")) continue;
    if (i > 0 && lines[i - 1].trim().startsWith("|")) continue; // not a table's first line
    const head = cellsOf(lines[i]).map((c) => c.toLowerCase());
    const owner = head.findIndex((c) => c.includes(words.ownerColumn.toLowerCase()));
    const state = head.findIndex((c) => c === words.stateColumn.toLowerCase() || c.startsWith(words.stateColumn.toLowerCase() + " "));
    if (owner < 0 || state < 0) continue;
    for (let j = i + 1; j < lines.length && lines[j].trim().startsWith("|"); j++) {
      if (/^\|[\s:|-]+\|?$/.test(lines[j].trim())) continue;
      const cells = cellsOf(lines[j]);
      // A row with fewer cells than its heading has lost one: which cell is the owner is unknowable — not judged.
      if (cells.length < head.length) {
        rows.push({ defect: cells[0] ?? "", owners: [], state: "", malformed: true });
        continue;
      }
      const ownerCell = cells[owner] ?? "";
      // A written "none" wins over an entry mentioned beside it ("none — maybe [[BKLG-NNN]]"), as architecture-shape reads it.
      const owners = nobody(words).test(ownerCell) ? [] : [...citedEntries(ownerCell, config)];
      rows.push({ defect: cells[0] ?? "", owners, state: cells[state] ?? "" });
    }
  }
  return rows;
}

/**
 * The rows whose state and their owners' state disagree. A row with SEVERAL owners is closed only when all are:
 * a defect still waiting on one of them is open. Pure.
 */
export function contradictions(rows, { open, closed }, words = WORDS) {
  const openSet = new Set(open);
  const closedSet = new Set(closed);
  const found = [];
  for (const row of rows) {
    const known = row.owners.filter((id) => openSet.has(id) || closedSet.has(id));
    if (!known.length) continue;
    const rowClosed = saysClosed(row.state, words);
    const allClosed = known.every((id) => closedSet.has(id));
    if (allClosed && !rowClosed) found.push({ ...row, direction: "entry-closed-row-open", ids: known });
    else if (rowClosed && !allClosed) found.push({ ...row, direction: "row-closed-entry-open", ids: known.filter((id) => openSet.has(id)) });
  }
  return found;
}

function read(root, rel) {
  try {
    return readFileSync(path.join(root, rel), "utf8");
  } catch {
    return null;
  }
}

function main() {
  const { root, config, backlog, history } = project();
  const words = config.words;
  const openText = read(root, backlog);
  const historyText = read(root, history);
  if (openText === null || historyText === null) {
    console.log(`⛔ closed-defects: cannot read ${openText === null ? backlog : history} in ${root} — nothing compared.`);
    return 1;
  }
  const open = openIds(openText);
  const closed = closedIds(historyText);
  const docs = architectureDocs(root, config.architectureDir, config.architectureExclusions);
  let withTable = 0;
  let rowsRead = 0;
  const found = [];
  const malformed = [];
  for (const doc of docs) {
    const rows = ownerRows(read(root, doc) ?? "", words, config);
    if (!rows.length) continue;
    withTable++;
    rowsRead += rows.length;
    for (const r of rows.filter((x) => x.malformed)) malformed.push(`${doc} — ${r.defect.slice(0, 60)}`);
    for (const c of contradictions(rows.filter((x) => !x.malformed), { open, closed }, words)) found.push({ doc, ...c });
  }
  console.log(
    `closed defects: ${rowsRead} rows with an owner and a state, in ${withTable} of ${docs.length} docs` +
      ` (columns «${words.ownerColumn}» + «${words.stateColumn}») · against ${open.length} open and ${closed.length} closed entries`,
  );
  if (malformed.length) {
    console.log(`📋 ${malformed.length} row(s) with fewer cells than their heading — not judged, worth fixing:`);
    for (const m of malformed) console.log(`   · ${m}`);
  }
  if (!rowsRead) {
    const declared = words.stateColumn !== WORDS.stateColumn;
    console.log(
      declared
        ? `⛔ zero rows read, though the project declares a «${words.stateColumn}» column: the tables changed heading, or this gate is blind.`
        : "   no table with both columns: nothing to judge.",
    );
    return declared ? 1 : 0;
  }
  if (!found.length) {
    console.log("✅ every defect row says what its closing entry says.");
    return 0;
  }
  console.log(`\n⛔ ${found.length} row(s) contradict the backlog:`);
  for (const f of found) {
    const what = f.direction === "entry-closed-row-open"
      ? `${f.ids.join(", ")} closed, the row doesn't say so`
      : `the row says closed, ${f.ids.join(", ")} still open`;
    console.log(`   · ${f.doc} — ${f.defect}: ${what}\n     state: «${f.state.slice(0, 80)}»`);
  }
  console.log("\n   Closing an entry updates its defect rows in the same change, or the table sends people after a defect that is gone.");
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
