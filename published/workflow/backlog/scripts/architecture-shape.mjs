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
import { DEFAULTS, project } from "./project.mjs";

/** The canonical section names live here and nowhere else — they are data searched for in docs. */
export const DEFECTS_SECTION = "Open defects";
export const CONTRIBUTIONS_SECTION = "Who worked on it";
/**
 * An optional third table mapping each open defect to the entry that will close it. Named here so
 * it is never confused with the contributions table — they answer different questions.
 */
export const OWNERS_SECTION = "Defect owners";

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
export function shapeOf(text) {
  const titles = sectionsOf(text).map((s) => s.title);
  return {
    defects: titles.some((t) => isTheSection(t, DEFECTS_SECTION)),
    contributions: titles.some((t) => isTheSection(t, CONTRIBUTIONS_SECTION)),
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
const RETIRED_LINE = /\bretired\b/i;

/**
 * The defect markers named in a section — `D3`, `R5`, `D10` — as words, not only as headings:
 * a doc may name its defects in prose or tables. Retired-list lines are skipped.
 * Declared limit: an open marker on the SAME line as the retired list is lost (the safe direction).
 */
export function markersInSection(text, name) {
  const found = new Set();
  for (const s of sectionsOf(text)) {
    if (!isTheSection(s.title, name)) continue;
    for (const line of s.body.split("\n")) {
      if (RETIRED_LINE.test(line)) continue;
      for (const m of line.matchAll(/\b([A-Z]\d{1,3})\b/g)) found.add(m[1]);
    }
  }
  return found;
}

/** The column heading in which a defect row declares who closes it — wherever that table lives. */
export const OWNER_COLUMN = "closed by";

/**
 * Tables whose heading says they are NOT open defects: accepted limits (ownerless by definition)
 * and retired defects. Decided by the table's own heading, which is local to the row.
 */
export const NON_DEFECT_HEADINGS = ["limit", "retired"];

const cellsOf = (line) => line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/**
 * Every defect named in a table row (first cell `D<n>` or `**D<n>**`), with the owner cell.
 * It reads THAT cell, not the row: prose may cite an entry as evidence, which is not an owner.
 */
export function defectsInTable(text) {
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
    const first = /^\*{0,2}(D\d{1,3})\*{0,2}\b/.exec(cells[0] ?? "");
    if (!first) {
      if (!heading) heading = cells;
      continue;
    }
    if (RETIRED_LINE.test(t)) continue;
    const head = (heading ?? []).map((c) => c.toLowerCase());
    if (head.some((c) => NON_DEFECT_HEADINGS.some((n) => c === n || c.startsWith(n + " ")))) continue;
    const i = head.findIndex((c) => c.includes(OWNER_COLUMN));
    found.push({ id: first[1], attributable: i >= 0, owner: i >= 0 ? (cells[i] ?? "") : null });
  }
  return found;
}

/**
 * FAILS: defects with no cell anywhere in which to declare the owner. Asked per DEFECT, not per row:
 * a summary table without the column is fine if another table of the same doc attributes it.
 */
export function withoutOwnerCell(docs) {
  return docs
    .map(({ name, text }) => {
      const per = new Map();
      for (const d of defectsInTable(text)) per.set(d.id, (per.get(d.id) ?? false) || d.attributable);
      return { name, missing: [...per].filter(([, ok]) => !ok).map(([id]) => id) };
    })
    .filter((d) => d.missing.length);
}

/**
 * LISTS, never fails: defects nobody is closing. No single gesture brings it to zero (it would take
 * opening an entry per defect), and a gate nothing can close is a gate people learn to skip.
 * A written "none"/"nobody" wins over an entry mentioned in the same cell ("none — maybe [[BKLG-NNN]]").
 */
export function defectsWithoutOwner(docs) {
  const found = [];
  for (const { name, text } of docs) {
    const per = new Map();
    for (const d of defectsInTable(text)) {
      if (!d.attributable) continue;
      const cell = d.owner ?? "";
      const hasEntry = /\[\[BKLG-\d+\]\]/.test(cell) && !/\b(none|nobody)\b/i.test(cell);
      per.set(d.id, (per.get(d.id) ?? false) || hasEntry);
    }
    for (const [id, hasEntry] of per) if (!hasEntry) found.push(`${name}#${id}`);
  }
  return found;
}

/** Which documents lack one of the two canonical sections. Pure. */
export function withoutShape(docs) {
  return docs
    .map(({ name, text }) => ({ name, ...shapeOf(text) }))
    .filter((d) => !d.defects || !d.contributions);
}

/**
 * Every architecture doc, nested folders included, root-relative (`<architectureDir>/x.md`).
 * The folder's `README.md` index is excluded. A missing folder is zero docs, not an error.
 * Shared with `backlog-anchor.mjs` so both gates judge the same set.
 */
export function architectureDocs(root, folder = DEFAULTS.architectureDir) {
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
  return out.sort();
}

function main() {
  const { root, config } = project();
  const folder = config.architectureDir;
  const docs = architectureDocs(root, folder).map((rel) => ({
    name: rel.slice(folder.length + 1),
    text: readFileSync(path.join(root, rel), "utf8"),
  }));
  const broken = withoutShape(docs);
  const rows = docs.reduce((a, d) => a + defectsInTable(d.text).length, 0);
  const markers = docs.reduce((a, d) => a + markersInSection(d.text, DEFECTS_SECTION).size, 0);
  const withoutCell = withoutOwnerCell(docs);
  const orphans = defectsWithoutOwner(docs);

  // The control case, always printed: "0 without the shape" on an unread folder looks like a real 0.
  console.log(`architecture doc shape: ${docs.length} read in ${folder}/ (${INDEX_DOC} excluded)`);
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
