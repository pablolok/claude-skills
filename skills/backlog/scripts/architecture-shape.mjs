#!/usr/bin/env node
/**
 * **Does every document of the architecture folder (`architectureDir`, default `docs/architecture/`) have the two
 * canonical sections?**
 *
 * Every architecture doc carries two tables: its OPEN DEFECTS (numbered `D<n>`), and WHO WORKED ON
 * IT (where a defect goes, as one `[[BKLG-NNN]]` row, when its entry closes). Without one fixed name
 * per section, `backlog-anchor` has to guess which table to read, and a MISSING section looks exactly
 * like one written under another name.
 *
 * It also checks every defect row sits in a table with a "closed by" column, and LISTS (never fails
 * on) the defects nobody is closing.
 *
 * Declared limit: it knows the sections are there, not that their contents are true.
 *
 * Usage: node <skill>/scripts/architecture-shape.mjs   (exit 0 = ok, 1 = shape broken, 2 = not reading)
 * A project without the folder has zero docs: the gate says so and passes.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { citedEntries } from "./docIndex.mjs";
import { DEFAULTS, WORDS, project } from "./project.mjs";

/**
 * The canonical section names are data searched for in docs: the project's words (`words` in its config), English by
 * default. The owners table is optional, named so it is never confused with the contributions table.
 */
export const DEFECTS_SECTION = WORDS.openDefects;
export const CONTRIBUTIONS_SECTION = WORDS.contributions;
export const OWNERS_SECTION = WORDS.owners;

/** Any of `words`, as a whole word, case-insensitive (`\b` fails on accented letters, so the edges are explicit). */
const anyWord = (words) =>
  new RegExp(`(^|[^\\p{L}\\p{N}])(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu");

/** Index docs of the folder, not architecture docs: they have no defects of their own. */
const INDEX_DOC = "README.md";

/** A document's `##` sections: title and body. Pure. */
export function sectionsOf(text) {
  return text
    .split(/\n(?=## )/)
    .map((p) => {
      const [first, ...rest] = p.split("\n");
      return { title: first.startsWith("## ") ? first.slice(3).trim() : null, body: rest.join("\n") };
    })
    .filter((s) => s.title !== null);
}

/** `## 5. Open defects` and `## Open defects` are the same section: the number belongs to the index. */
export function isTheSection(title, name) {
  return new RegExp(`^(\\d+(\\.\\d+)?\\.?\\s+)?${name}$`, "i").test((title ?? "").trim());
}

/** Which of the two canonical sections this document has. */
export function shapeOf(text, words = WORDS) {
  const titles = sectionsOf(text).map((s) => s.title);
  return {
    defects: titles.some((t) => isTheSection(t, words.openDefects)),
    contributions: titles.some((t) => isTheSection(t, words.contributions)),
  };
}

/** The entries cited inside a section. What "cites" means is decided by `docIndex.mjs`. */
export function entryInSection(text, name) {
  const found = new Set();
  for (const s of sectionsOf(text)) {
    if (!isTheSection(s.title, name)) continue;
    for (const id of citedEntries(s.body)) found.add(id);
  }
  return found;
}

/**
 * A line that lists RETIRED defect numbers ("Retired so far: D1, D2"). Numbers are not recycled,
 * so the list stays in the section — but counting it as open would reject a closed entry for the
 * defect it closed itself.
 */
const retiredLine = (words) => anyWord(words.retired);

/**
 * The defect markers named in a section — `D3`, `R5`, `D10` — as words, not only as headings:
 * a doc may name its defects in prose or tables. Retired-list lines are skipped.
 * Declared limit: an open marker on the SAME line as the retired list is lost (the safe direction).
 */
export function markersInSection(text, name, words = WORDS) {
  const found = new Set();
  const retired = retiredLine(words);
  for (const s of sectionsOf(text)) {
    if (!isTheSection(s.title, name)) continue;
    for (const line of s.body.split("\n")) {
      if (retired.test(line)) continue;
      for (const m of line.matchAll(/\b([A-Z]\d{1,3})\b/g)) found.add(m[1]);
    }
  }
  return found;
}

/** The column heading in which a defect row declares who closes it — wherever that table lives. */
export const OWNER_COLUMN = WORDS.ownerColumn;

/**
 * Tables whose heading says they are NOT open defects: accepted limits (ownerless by definition)
 * and retired defects. Decided by the table's own heading, which is local to the row.
 */
export const NON_DEFECT_HEADINGS = WORDS.nonDefectHeadings;

const cellsOf = (line) => line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/**
 * Every table row whose first cell names a defect (`D<n>` or `**D<n>**`), with its table's heading cells. Shared by
 * the gates that read defect tables (here, and `closed-defects`), so they read the same rows.
 */
export function defectRows(text) {
  const found = [];
  let heading = null;
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) {
      heading = null;
      continue;
    }
    if (/^\|[\s:|-]+\|?$/.test(t)) continue; // separator row
    const cells = cellsOf(t);
    const first = /^\*{0,2}(D\d{1,3})\*{0,2}(?![\w])/.exec(cells[0] ?? "");
    if (!first) {
      if (!heading) heading = cells;
      continue;
    }
    found.push({ id: first[1], line: t, cells, head: (heading ?? []).map((c) => c.toLowerCase()) });
  }
  return found;
}

/**
 * Every defect named in a table row, with the owner cell. It reads THAT cell, not the row: prose may cite an entry as
 * evidence, which is not an owner.
 */
export function defectsInTable(text, words = WORDS) {
  const retired = retiredLine(words);
  const owner = words.ownerColumn.toLowerCase();
  const found = [];
  for (const row of defectRows(text)) {
    if (retired.test(row.line)) continue;
    if (row.head.some((c) => words.nonDefectHeadings.some((n) => c === n || c.startsWith(n + " ")))) continue;
    const i = row.head.findIndex((c) => c.includes(owner));
    found.push({ id: row.id, attributable: i >= 0, owner: i >= 0 ? (row.cells[i] ?? "") : null });
  }
  return found;
}

/**
 * FAILS: defects with no cell anywhere in which to declare the owner. Asked per DEFECT, not per row:
 * a summary table without the column is fine if another table of the same doc attributes it.
 */
export function withoutOwnerCell(docs, words = WORDS) {
  return docs
    .map(({ name, text }) => {
      const per = new Map();
      for (const d of defectsInTable(text, words)) per.set(d.id, (per.get(d.id) ?? false) || d.attributable);
      return { name, missing: [...per].filter(([, ok]) => !ok).map(([id]) => id) };
    })
    .filter((d) => d.missing.length);
}

/**
 * LISTS, never fails: defects nobody is closing. No single gesture brings it to zero (it would take
 * opening an entry per defect), and a gate nothing can close is a gate people learn to skip.
 * A written "none"/"nobody" wins over an entry mentioned in the same cell ("none — maybe [[BKLG-NNN]]").
 */
export function defectsWithoutOwner(docs, words = WORDS) {
  const nobody = anyWord(words.none);
  const found = [];
  for (const { name, text } of docs) {
    const per = new Map();
    for (const d of defectsInTable(text, words)) {
      if (!d.attributable) continue;
      const cell = d.owner ?? "";
      const hasEntry = /\[\[BKLG-\d+\]\]/.test(cell) && !nobody.test(cell);
      per.set(d.id, (per.get(d.id) ?? false) || hasEntry);
    }
    for (const [id, hasEntry] of per) if (!hasEntry) found.push(`${name}#${id}`);
  }
  return found;
}

/** Which documents lack one of the two canonical sections. Pure. */
export function withoutShape(docs, words = WORDS) {
  return docs
    .map(({ name, text }) => ({ name, ...shapeOf(text, words) }))
    .filter((d) => !d.defects || !d.contributions);
}

/**
 * Every architecture doc, nested folders included, root-relative (`<architectureDir>/x.md`).
 * The folder's `README.md` index is excluded, and so is each doc in `exclusions` (the project's
 * `architectureExclusions`, each with its reason, printed by the gate). A missing folder is zero docs, not an error.
 * Shared with the other gates so they judge the same set.
 */
export function architectureDocs(root, folder = DEFAULTS.architectureDir, exclusions = {}) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md") && e.name !== INDEX_DOC) out.push(path.relative(root, p).split(path.sep).join("/"));
    }
  };
  walk(path.join(root, folder));
  return out.filter((d) => !(d in exclusions)).sort();
}

function main() {
  const { root, config } = project();
  const words = config.words;
  const { openDefects: DEFECTS_SECTION, contributions: CONTRIBUTIONS_SECTION, owners: OWNERS_SECTION, ownerColumn: OWNER_COLUMN } = words;
  const folder = config.architectureDir;
  const docs = architectureDocs(root, folder, config.architectureExclusions).map((rel) => ({
    name: rel.slice(folder.length + 1),
    text: readFileSync(path.join(root, rel), "utf8"),
  }));
  const broken = withoutShape(docs, words);
  const rows = docs.reduce((a, d) => a + defectsInTable(d.text, words).length, 0);
  const markers = docs.reduce((a, d) => a + markersInSection(d.text, DEFECTS_SECTION, words).size, 0);
  const withoutCell = withoutOwnerCell(docs, words);
  const orphans = defectsWithoutOwner(docs, words);

  // The control case, always printed: "0 without the shape" on an unread folder looks like a real 0.
  console.log(`architecture doc shape: ${docs.length} read in ${folder}/ (${INDEX_DOC} excluded)`);
  const excluded = Object.entries(config.architectureExclusions);
  console.log(`   excluded, and declared (${excluded.length}):`);
  for (const [doc, why] of excluded) console.log(`   · ${doc} — ${why}`);
  console.log(`   canonical sections: «${DEFECTS_SECTION}» · «${CONTRIBUTIONS_SECTION}»`);
  console.log(`   defect markers read: ${markers} · defect table rows read: ${rows} · owner column: «${OWNER_COLUMN}»`);

  // Markers in the defects sections but no table row parsed: the tool is not reading the tables.
  if (markers && !rows) {
    console.log(
      `\n⛔ ${markers} defect markers named, but ZERO defect table rows read. That is not "no open\n` +
        `   defects": either no defect has a table row (each needs one, in a table with a «${OWNER_COLUMN}»\n` +
        "   column) or this tool is not reading the tables. Not judging.",
    );
    return 2;
  }

  if (orphans.length) {
    console.log(`\n📋 ${orphans.length} defects NOBODY is closing — a list, not a failure:`);
    for (const o of orphans) console.log(`   · ${o}`);
  } else {
    console.log("\n📋 no open defect without an owner.");
  }

  if (!broken.length && !withoutCell.length) {
    console.log(`\n✅ all ${docs.length} have both sections, and every defect has a cell saying who closes it.`);
    return 0;
  }

  for (const d of broken) {
    const missing = [!d.defects && `«${DEFECTS_SECTION}»`, !d.contributions && `«${CONTRIBUTIONS_SECTION}»`]
      .filter(Boolean)
      .join(" and ");
    console.log(`\n⛔ ${d.name} — missing ${missing}`);
  }
  if (broken.length) {
    console.log(
      "\n   A missing section reads as \"no defects\" or \"nobody worked on it\". If it was not measured,\n" +
        "   open it EMPTY and say so — \"none known\" — never back-filled from memory.",
    );
  }
  for (const d of withoutCell) {
    console.log(`\n⛔ ${d.name} — ${d.missing.join(", ")}: no cell to declare the owner`);
    console.log(
      `   Fix: give the table a «${OWNER_COLUMN}» column, or add a «${OWNERS_SECTION}» section.`,
    );
  }
  return 1;
}

// `pathToFileURL`, not a hand-built string (Windows would exit silently with 0); `argv[1]` is absent
// under `node -e`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
