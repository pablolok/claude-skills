#!/usr/bin/env node
/**
 * **Does multi-phase work carry a phase table the dashboard can read?**
 *
 * The rule is the skill's: more than two named steps → a phase table (`| **P1** <step> | ✅ — evidence |`). Work
 * written as a numbered list instead leaves the dashboard mute — no bar, no share done — however far the work is.
 *
 * Read: every open entry's card and its own docs (those its `Doc` field links, never an archived one) — the same
 * inputs the dashboard reads phases from. An entry is flagged when one of them holds a numbered list of three or more
 * top-level items (`1.` at the margin, outside fenced code; blank and indented lines continue a list, any other line at
 * the margin ends it) and none of them holds a phase row `phasesIn` reads.
 *   - an entry in progress → fail: its work is moving and nobody can see how far;
 *   - an entry not started (open or blocked) → listed, not a failure: the table is due when the work starts.
 * A linked doc missing on disk is skipped and counted (a dead link is check-doc-refs' question).
 *
 * Usage: node <skill>/scripts/phase-tables.mjs   (exit 0 = every entry in progress readable, 1 = one is not, or the
 * register cannot be read)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { canonicalField } from "./backlog-github-sync.mjs";
import { docLinks, ownDocs, phasesIn, withoutFences } from "./dashboard-board.mjs";
import { DEFAULTS, project } from "./project.mjs";
import { openEntries } from "./register.mjs";
import { isEntryPoint } from "./entry-point.mjs";

/** A numbered list item at the margin. */
const NUMBERED_ITEM = /^\d+[.)]\s/;

/** The most items any one top-level numbered list of a text holds (fenced code left out). Pure. */
export function longestNumberedList(text) {
  let longest = 0;
  let current = 0;
  for (const line of withoutFences(text).split("\n")) {
    if (NUMBERED_ITEM.test(line)) current++;
    else if (line.trim() && !/^\s/.test(line)) current = 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

/** The fewest items a numbered list needs to read as multi-phase work: "more than two named steps". */
export const MIN_STEPS = 3;

/**
 * The open entries written as multi-phase work with no phase table, split by whether their work has started. Pure.
 * @param {ReturnType<typeof openEntries>} entries
 * @param {Map<string,string|null>} docTexts root-relative doc path → its text (null: missing on disk)
 * @param {object} config
 * @returns {{examined:number, inProgress:number, withTable:number, missing:Array<{id:string,title:string,status:string|null,where:string,steps:number}>}}
 */
export function missingTables(entries, docTexts, config = DEFAULTS) {
  const missing = [];
  let withTable = 0;
  let inProgress = 0;
  for (const e of entries) {
    const status = canonicalField(e.fields, "Status", config);
    if (status === "in-progress") inProgress++;
    const sources = [
      { where: "card", text: e.block },
      ...ownDocs(docLinks(e.fields.Doc, config.docsDir), config.docsDir)
        .map((d) => ({ where: d.path, text: docTexts.get(d.path) ?? "" })),
    ];
    if (sources.some((s) => phasesIn(s.text).length)) {
      withTable++;
      continue;
    }
    const listed = sources
      .map((s) => ({ where: s.where, steps: longestNumberedList(s.text) }))
      .find((s) => s.steps >= MIN_STEPS);
    if (listed) missing.push({ id: e.id, title: e.title, status, ...listed });
  }
  return { examined: entries.length, inProgress, withTable, missing };
}

function read(root, rel) {
  try {
    return readFileSync(path.join(root, rel), "utf8");
  } catch {
    return null;
  }
}

function main() {
  const { root, config, backlog } = project();
  const text = read(root, backlog);
  if (text === null) {
    console.log(`⛔ phase tables: cannot read ${backlog} in ${root} — nothing examined.`);
    return 1;
  }
  const entries = openEntries(text, config);
  const paths = [...new Set(entries.flatMap((e) => ownDocs(docLinks(e.fields.Doc, config.docsDir), config.docsDir).map((d) => d.path)))];
  const docTexts = new Map(paths.map((rel) => [rel, read(root, rel)]));
  const unread = paths.filter((rel) => docTexts.get(rel) === null).length;
  const { examined, inProgress, withTable, missing } = missingTables(entries, docTexts, config);
  const failing = missing.filter((m) => m.status === "in-progress");
  const notStarted = missing.filter((m) => m.status !== "in-progress");

  console.log(
    `phase tables: examined ${examined} open entries (${inProgress} in progress) · ${paths.length - unread} docs read` +
      (unread ? ` (${unread} linked but missing, skipped)` : "") +
      ` · ${withTable} with a phase table · ${missing.length} with a numbered list of ${MIN_STEPS}+ steps and no table`,
  );
  const line = (m) => `   · ${m.id} — ${m.title.slice(0, 60)}: ${m.steps} numbered steps in ${m.where}`;
  if (notStarted.length) {
    console.log(`\n📋 ${notStarted.length} not started — the table is due when the work starts (not a failure):`);
    for (const m of notStarted) console.log(line(m));
  }
  if (!failing.length) {
    console.log("\n✅ every entry in progress with several steps has a phase table the dashboard reads.");
    return 0;
  }
  console.log(`\n⛔ ${failing.length} in progress with several steps and no phase table — the dashboard shows none of its progress:`);
  for (const m of failing) console.log(line(m));
  console.log(
    "\n   Add a phase table in the form the dashboard reads, one row per step: `| **P1** <step> | ✅ — <evidence> |`" +
      "\n   (state marks ✅ ⏳ ⛔ 📋; see references/phase-tables.md), then check `dashboard.mjs --json` lists its phases.",
  );
  return 1;
}

if (isEntryPoint(import.meta.url)) {
  process.exit(main());
}
