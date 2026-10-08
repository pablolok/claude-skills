#!/usr/bin/env node
/**
 * **The dashboard's picture of the register** — where the work stands, what is moving, what comes next.
 *
 * Pure: the two registers' texts, the entries' docs, the project's config and the parsed commits go in; one plain
 * object comes out. Nothing is stored: every request rebuilds it from the register and git, the only sources.
 *
 * Every reading of the register is `register.mjs`'s (where an entry starts, its fields, the history lines) and the
 * Status/Priority words are the project's (`canonicalField`); this module only adds what the dashboard asks of them:
 *
 *   - **phases** — the rows of an entry's phase table (in its card or its own docs) whose state cell opens with a mark;
 *   - **pending** — the `## Pending <kind>` ledgers above the open section, one item per list line;
 *   - **links between entries** — what a blocked entry waits on (the ids its Status names), who cites whom;
 *   - **next** — the open entries not started: first what blocked entries wait on (a review's strongest criterion it
 *     can read from the register), then the written priority and the age. Only a hint — picking the move is the
 *     review's (`review-backlog`), which weighs what no register says (an open window, a defect wrong in silence).
 */
import path from "node:path";
import { lastTouched } from "./dashboard-activity.mjs";
import { canonicalField } from "./backlog-github-sync.mjs";
import { citedEntries } from "./docIndex.mjs";
import { DEFAULTS, PRIORITIES } from "./project.mjs";
import { closedLines, isOpenHeading, openEntries } from "./register.mjs";

/** A phase row's state, by the mark its state cell opens with (the backlog skill's set, and 🔨 for "building"). */
export const PHASE_MARKS = Object.freeze({
  done: ["✅"],
  active: ["⏳", "🔨"],
  dropped: ["⛔"],
  planned: ["📋"],
});

/** The phase states, in the order a progress bar draws them. */
export const PHASE_STATES = Object.freeze(Object.keys(PHASE_MARKS));

/** How many recent commits the board carries for the activity feed. */
export const ACTIVITY_SIZE = 40;

/** A `## Pending <kind>` ledger heading. */
const PENDING_HEADING = /^## Pending\s+(.+?)\s*$/i;
/** A markdown link: label and target. */
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
/** An ISO day. */
const DAY = /\b(\d{4}-\d{2}-\d{2})\b/;

/** A text with its fenced code blocks blanked: a fence shows the format by example, its lines are not entries. */
export function withoutFences(text) {
  let fenced = false;
  return String(text).split(/\r?\n/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return "";
    }
    return fenced ? "" : line;
  }).join("\n");
}

/** The state a cell declares by its leading mark, or null when it opens with none. */
function markState(cell) {
  const text = cell.trim();
  for (const state of PHASE_STATES) {
    if (PHASE_MARKS[state].some((mark) => text.startsWith(mark))) return state;
  }
  return null;
}

/** A table row's cells (the outer pipes dropped). */
const cells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");

/**
 * The phases a text's tables declare: a row whose first cell opens with a bold name (`**P1** parse the file`) and a
 * later cell opening with a state mark. Other tables (measures, mappings) carry no mark and are not phases.
 * @param {string} text
 * @returns {Array<{name:string, label:string, state:string, note:string}>}
 */
export function phasesIn(text) {
  const phases = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const [first, ...rest] = cells(line);
    const name = /^\s*\*\*([^*]+)\*\*\s*(.*)$/.exec(first ?? "");
    if (!name) continue;
    const stateCell = rest.find((c) => markState(c));
    if (!stateCell) continue;
    phases.push({
      name: name[1].trim(),
      label: name[2].trim(),
      state: markState(stateCell),
      note: stateCell.trim().replace(/^\S+\s*(?:[—–-]\s*)?/u, ""),
    });
  }
  return phases;
}

/** Each phase name once: the entry's own card first, then its docs in the order they are linked. */
function uniquePhases(lists) {
  const seen = new Set();
  return lists.flat().filter((p) => !seen.has(p.name) && seen.add(p.name));
}

/** How many phases are in each state. */
function phaseCounts(phases) {
  return Object.fromEntries(PHASE_STATES.map((s) => [s, phases.filter((p) => p.state === s).length]));
}

/**
 * The docs a `Doc` value links, as paths from the project root (the register's links are relative to its folder).
 * @param {string|undefined} value
 * @param {string} docsDir
 */
export function docLinks(value, docsDir) {
  return [...String(value ?? "").matchAll(LINK)]
    .filter((m) => !/^[a-z]+:/i.test(m[2]))
    .map((m) => ({ label: m[1], path: path.posix.normalize(`${docsDir}/${m[2].split("#")[0]}`) }));
}

/** The docs of an entry that are its own (a link into `archive/` is someone else's finished report). */
const ownDocs = (docs, docsDir) => docs.filter((d) => !d.path.startsWith(`${docsDir}/archive/`));

/**
 * The `## Pending <kind>` ledgers: each top-level list line an item, with the entries it cites.
 * @param {string} text BACKLOG.md
 * @param {object} config
 */
export function pendingLedgers(text, config = DEFAULTS) {
  const ledgers = [];
  let current = null;
  for (const line of String(text).split(/\r?\n/)) {
    const heading = PENDING_HEADING.exec(line);
    if (heading) {
      current = { kind: heading[1], items: [] };
      ledgers.push(current);
      continue;
    }
    if (/^## /.test(line) || isOpenHeading(line, config)) {
      current = null;
      continue;
    }
    if (!current) continue;
    const item = /^[-*]\s+(.*)$/.exec(line);
    if (item) {
      const label = /^\*\*([^*]+)\*\*\s*:?\s*/.exec(item[1]);
      current.items.push({
        label: label ? label[1].trim() : "",
        text: label ? item[1].slice(label[0].length) : item[1],
        ids: [...citedEntries(item[1], config)],
      });
    } else if (current.items.length && /^\s+\S/.test(line)) {
      const last = current.items[current.items.length - 1];
      last.text = `${last.text} ${line.trim()}`;
    }
  }
  return ledgers;
}

/**
 * The closed lines of BACKLOG-HISTORY.md, newest first as the history keeps them: id, phase, title, day, docs.
 * @param {string} text
 * @param {string} docsDir
 */
export function closedEntries(text, docsDir = DEFAULTS.docsDir) {
  return closedLines(withoutFences(text)).map((c) => {
    const afterId = c.text.replace(/^-\s+\*\*[^*]+\*\*\s*/, "").replace(/^#{2,3}\s+BKLG-\d+\s*[—–-]?\s*/, "");
    const title = afterId.split(/\s+[—–]\s+/)[0].trim();
    return {
      id: c.id,
      phase: c.phase,
      title,
      text: afterId,
      day: DAY.exec(c.text)?.[1] ?? null,
      docs: docLinks(c.text, docsDir),
    };
  });
}

/** Rank of a canonical priority: high first; none last. */
const priorityRank = (p) => (p ? PRIORITIES.indexOf(p) : PRIORITIES.length);

/**
 * The open entries, each with what the dashboard shows of it.
 * @param {ReturnType<typeof openEntries>} entries
 * @param {Map<string,string>} docTexts root-relative doc path → its text (the docs an entry links; absent = unread)
 * @param {Map<string,{date:string,sha:string,subject:string}>} touched
 * @param {object} config
 */
function shapeEntries(entries, docTexts, touched, config) {
  const ids = new Set(entries.map((e) => e.id));
  const shaped = entries.map((e) => {
    const docs = docLinks(e.fields.Doc, config.docsDir);
    const phases = uniquePhases([
      phasesIn(e.block),
      ...ownDocs(docs, config.docsDir).map((d) => phasesIn(docTexts.get(d.path) ?? "")),
    ]);
    const status = canonicalField(e.fields, "Status", config);
    const cites = [...citedEntries(e.block, config)].filter((id) => id !== e.id && ids.has(id));
    return {
      id: e.id,
      title: e.title,
      status,
      statusText: e.fields.Status ?? "",
      priority: canonicalField(e.fields, "Priority", config),
      added: DAY.exec(e.fields.Added ?? "")?.[1] ?? null,
      summary: e.fields.Summary ?? "",
      fields: e.fields,
      docs,
      phases,
      phaseCounts: phaseCounts(phases),
      waitsOn: status === "blocked" ? [...citedEntries(e.fields.Status ?? "", config)].filter((id) => id !== e.id) : [],
      cites,
      citedBy: [],
      unblocks: [],
      last: touched.get(e.id) ?? null,
      block: e.block,
    };
  });
  const byId = new Map(shaped.map((e) => [e.id, e]));
  for (const e of shaped) {
    for (const id of e.cites) byId.get(id)?.citedBy.push(e.id);
    for (const id of e.waitsOn) byId.get(id)?.unblocks.push(e.id);
  }
  return shaped;
}

/**
 * The entries to start next, in order: those blocked entries wait on, then the written priority, then the oldest —
 * each with the numbers that put it there. Being cited is shown, not ranked: a tracker or an umbrella entry is cited
 * by everything it gathers, which makes it a parent, not a prerequisite.
 */
function nextUp(entries) {
  return entries
    .filter((e) => e.status !== "in-progress" && e.status !== "blocked")
    .map((e) => ({ id: e.id, unblocks: e.unblocks.length, citedBy: e.citedBy.length, priority: e.priority, added: e.added }))
    .sort((a, b) =>
      b.unblocks - a.unblocks ||
      priorityRank(a.priority) - priorityRank(b.priority) ||
      String(a.added ?? "9999").localeCompare(String(b.added ?? "9999")) ||
      a.id.localeCompare(b.id));
}

/** Newest activity first; an entry never touched by a commit after those that were. */
const byLastTouched = (a, b) => String(b.last?.date ?? "").localeCompare(String(a.last?.date ?? "")) || priorityRank(a.priority) - priorityRank(b.priority);

/**
 * The whole board.
 * @param {{backlog:string, history:string, config?:object, docTexts?:Map<string,string>, commits?:ReturnType<import("./dashboard-activity.mjs").parseLog>}} input
 */
export function buildBoard({ backlog, history, config = DEFAULTS, docTexts = new Map(), commits = [] }) {
  const entries = shapeEntries(openEntries(backlog, config), docTexts, lastTouched(commits), config);
  const closed = closedEntries(history, config.docsDir);
  const closedWhole = closed.filter((c) => c.phase === "");
  const pending = pendingLedgers(backlog, config);
  const inProgress = entries.filter((e) => e.status === "in-progress").sort(byLastTouched);
  const blocked = entries.filter((e) => e.status === "blocked");
  const phases = phaseCounts(entries.flatMap((e) => e.phases));
  return {
    totals: {
      open: entries.length,
      inProgress: inProgress.length,
      blocked: blocked.length,
      notStarted: entries.length - inProgress.length - blocked.length,
      closed: closedWhole.length,
      pending: pending.reduce((n, l) => n + l.items.length, 0),
      byPriority: Object.fromEntries([...PRIORITIES, "none"].map((p) => [p, entries.filter((e) => (e.priority ?? "none") === p).length])),
      phases,
    },
    entries,
    inProgress: inProgress.map((e) => e.id),
    blocked: blocked.map((e) => e.id),
    next: nextUp(entries),
    pending,
    closed,
    activity: commits.slice(0, ACTIVITY_SIZE),
  };
}

/** The root-relative docs the board reads phases from: every open entry's own docs. */
export function docsToRead(backlog, config = DEFAULTS) {
  return [...new Set(openEntries(backlog, config).flatMap((e) => ownDocs(docLinks(e.fields.Doc, config.docsDir), config.docsDir).map((d) => d.path)))];
}
