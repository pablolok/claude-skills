#!/usr/bin/env node
/**
 * **OpenSpec in the dashboard** — pure over the project's file list and a reader of its texts.
 *
 * OpenSpec keeps its work under `openspec/`:
 *
 *   openspec/specs/<capability>/spec.md                 the current truth (### Requirement: / #### Scenario:)
 *   openspec/changes/<id>/proposal.md                   why and what (its first `# ` heading is the title)
 *   openspec/changes/<id>/tasks.md                      `## 1. Section` + `- [x] 1.1 task` checkboxes
 *   openspec/changes/<id>/design.md                     optional
 *   openspec/changes/<id>/specs/<capability>/spec.md    the deltas (## ADDED|MODIFIED|REMOVED|RENAMED Requirements)
 *   openspec/changes/archive/YYYY-MM-DD-<id>/…          an applied change
 *
 * The bridge to the register: an entry whose `Doc` links a file of a change gets the change's task sections as its
 * phases (all ticked → done, some → in progress, none → not started), so the rings and bars count them with no
 * table to keep by hand. The change, in turn, lists the entries that link it or that its proposal cites.
 */
import path from "node:path";

/** The folder OpenSpec lives in, from the project root. */
export const OPENSPEC_DIR = "openspec";
const CHANGES = `${OPENSPEC_DIR}/changes/`;
const ARCHIVE = `${CHANGES}archive/`;
const SPECS = `${OPENSPEC_DIR}/specs/`;
/** The delta sections of a change's spec, in the order the page lists them. */
export const DELTA_KINDS = Object.freeze(["added", "modified", "removed", "renamed"]);
const ARCHIVED_NAME = /^(\d{4}-\d{2}-\d{2})-(.+)$/;
const ENTRY_ID = /BKLG-\d+/g;

/**
 * The change a root-relative path belongs to: `{ id, dir, archived }`, or null when it is not inside one.
 * @param {string} rel
 */
export function changeOf(rel) {
  const clean = path.posix.normalize(String(rel ?? "").replace(/\\/g, "/"));
  if (clean.startsWith(ARCHIVE)) {
    const name = clean.slice(ARCHIVE.length).split("/")[0];
    if (!name || name === clean.slice(ARCHIVE.length)) return null;
    const m = ARCHIVED_NAME.exec(name);
    return { id: m ? m[2] : name, dir: ARCHIVE + name, archived: true, date: m ? m[1] : null };
  }
  if (clean.startsWith(CHANGES)) {
    const rest = clean.slice(CHANGES.length);
    const name = rest.split("/")[0];
    if (!name || name === rest || name === "archive") return null;
    return { id: name, dir: CHANGES + name, archived: false, date: null };
  }
  return null;
}

/**
 * A `tasks.md` as sections of tasks. Tasks before any heading go in a section of their own.
 * @param {string} text
 * @returns {Array<{name:string, label:string, tasks:Array<{id:string, text:string, done:boolean}>}>}
 */
export function parseTasks(text) {
  const sections = [];
  let current = null;
  let fence = false;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const heading = /^#{2,4}\s+(?:(\d+(?:\.\d+)*)[.)]?\s+)?(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1] ?? String(sections.length + 1), label: heading[2].trim(), tasks: [] };
      sections.push(current);
      continue;
    }
    // OpenSpec 2.x: any `[...]` box is a tracked task; only a box holding `x` alone (any case, any spacing) is done,
    // so `[ x]` is done and `[~]`, `[-]`, `[]` are not.
    const task = /^\s*[-*+]\s+\[([^\]\n]{0,3})\]\s+(?:(\d+(?:\.\d+)+)\.?\s+)?(.*)$/.exec(line);
    if (!task) continue;
    if (!current) {
      current = { name: "1", label: "", tasks: [] };
      sections.push(current);
    }
    current.tasks.push({ id: task[2] ?? "", text: task[3].trim(), done: /^\s*[xX]\s*$/.test(task[1]) });
  }
  return sections.filter((s) => s.tasks.length);
}

/** How many tasks are ticked of all. */
export const taskCount = (sections) => ({
  done: sections.reduce((n, s) => n + s.tasks.filter((t) => t.done).length, 0),
  total: sections.reduce((n, s) => n + s.tasks.length, 0),
});

/**
 * The task sections as the board's phases: all ticked → done, some → active, none → planned.
 * @param {ReturnType<typeof parseTasks>} sections
 * @returns {Array<{name:string, label:string, state:string, note:string}>}
 */
export function sectionPhases(sections) {
  return sections.map((s) => {
    const done = s.tasks.filter((t) => t.done).length;
    const state = done === s.tasks.length ? "done" : done ? "active" : "planned";
    return { name: s.name, label: s.label, state, note: `${done}/${s.tasks.length} task` };
  });
}

/** The first `# ` heading of a proposal, without a leading "Change:"; null when it has none. */
export function proposalTitle(text) {
  const m = /^#\s+(.+?)\s*#*\s*$/m.exec(String(text ?? ""));
  return m ? m[1].replace(/^(change|proposal)\s*:\s*/i, "").trim() : null;
}

/** The first paragraph of a `## Why` section, or "". */
export function proposalWhy(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const at = lines.findIndex((l) => /^##\s+(why|perch[eé])\b/i.test(l));
  if (at < 0) return "";
  const out = [];
  for (const line of lines.slice(at + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    if (!line.trim()) {
      if (out.length) break;
      continue;
    }
    out.push(line.trim());
  }
  return out.join(" ");
}

/** The requirements and scenarios a spec declares. */
export function specCounts(text) {
  const t = String(text ?? "");
  return {
    requirements: (t.match(/^###\s+Requirement:/gim) ?? []).length,
    scenarios: (t.match(/^####\s+Scenario:/gim) ?? []).length,
  };
}

/** How many requirements each delta section of a change's spec adds, modifies, removes or renames. */
export function deltaCounts(text) {
  const counts = Object.fromEntries(DELTA_KINDS.map((k) => [k, 0]));
  let kind = null;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const section = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/i.exec(line);
    if (section) {
      kind = section[1].toLowerCase();
      continue;
    }
    if (/^##\s/.test(line)) kind = null;
    if (!kind) continue;
    if (kind === "renamed" ? /^\s*-\s*FROM:/i.test(line) : /^###\s+Requirement:/i.test(line)) counts[kind] += 1;
  }
  return counts;
}

const ORDER = ["proposal.md", "design.md", "tasks.md"];
/** A change's documents: proposal, design, tasks first, then the deltas and the rest by path. */
const docOrder = (dir) => (a, b) => {
  const ra = ORDER.indexOf(a.slice(dir.length + 1));
  const rb = ORDER.indexOf(b.slice(dir.length + 1));
  return (ra < 0 ? ORDER.length : ra) - (rb < 0 ? ORDER.length : rb) || a.localeCompare(b);
};

/**
 * Everything OpenSpec keeps in the project, or null when it has no `openspec/` folder.
 * @param {string[]} files root-relative paths (the project's file list)
 * @param {(rel:string)=>string} readText a file's text, "" when it is missing
 */
export function readOpenSpec(files, readText) {
  const md = files.filter((f) => f.startsWith(`${OPENSPEC_DIR}/`) && f.toLowerCase().endsWith(".md")).sort();
  if (!files.some((f) => f.startsWith(`${OPENSPEC_DIR}/`))) return null;

  const byDir = new Map();
  for (const rel of md) {
    const c = changeOf(rel);
    if (!c) continue;
    if (!byDir.has(c.dir)) byDir.set(c.dir, { ...c, docs: [] });
    byDir.get(c.dir).docs.push(rel);
  }

  const changes = [...byDir.values()].map((c) => {
    const proposal = readText(`${c.dir}/proposal.md`);
    const sections = parseTasks(readText(`${c.dir}/tasks.md`));
    const deltas = Object.fromEntries(DELTA_KINDS.map((k) => [k, 0]));
    const capabilities = [];
    for (const rel of c.docs) {
      const m = new RegExp(`^${c.dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/specs/(.+)/spec\\.md$`).exec(rel);
      if (!m) continue;
      capabilities.push(m[1]);
      const d = deltaCounts(readText(rel));
      for (const k of DELTA_KINDS) deltas[k] += d[k];
    }
    const phases = sectionPhases(sections);
    return {
      id: c.id,
      dir: c.dir,
      archived: c.archived,
      date: c.date,
      title: proposalTitle(proposal) ?? c.id,
      why: proposalWhy(proposal),
      docs: c.docs.sort(docOrder(c.dir)),
      sections,
      phases,
      phaseCounts: Object.fromEntries(["done", "active", "planned", "dropped"].map((s) => [s, phases.filter((p) => p.state === s).length])),
      tasks: taskCount(sections),
      deltas,
      capabilities,
      cites: [...new Set(proposal.match(ENTRY_ID) ?? [])],
      entries: [],
    };
  });

  const specs = md
    .filter((rel) => rel.startsWith(SPECS) && rel.endsWith("/spec.md"))
    .map((rel) => ({ name: rel.slice(SPECS.length).split("/").slice(0, -1).join("/"), path: rel, ...specCounts(readText(rel)) }));

  const active = changes.filter((c) => !c.archived).sort((a, b) => a.id.localeCompare(b.id));
  const archived = changes.filter((c) => c.archived).sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")) || a.id.localeCompare(b.id));
  const tasks = taskCount(active.flatMap((c) => c.sections));
  return {
    dir: OPENSPEC_DIR,
    project: md.includes(`${OPENSPEC_DIR}/project.md`) ? `${OPENSPEC_DIR}/project.md` : null,
    changes: active,
    archived,
    specs,
    totals: {
      active: active.length,
      archived: archived.length,
      specs: specs.length,
      requirements: specs.reduce((n, s) => n + s.requirements, 0),
      tasksDone: tasks.done,
      tasksTotal: tasks.total,
    },
  };
}

/**
 * The phases a document of an entry brings when it belongs to a change: the change's task sections.
 * @param {ReturnType<typeof readOpenSpec>} spec
 * @returns {(rel:string)=>Array<object>}
 */
export function phasesFromChanges(spec) {
  if (!spec) return () => [];
  const byDir = new Map([...spec.changes, ...spec.archived].map((c) => [c.dir, c]));
  return (rel) => {
    const c = changeOf(rel);
    return (c && byDir.get(c.dir)?.phases) || [];
  };
}

/**
 * Tie the board's entries and the changes together, in place: an entry links a change through its `Doc` (a file of the
 * change) or by naming the change's folder in its card; a change's proposal citing an entry ties them too.
 * @param {{entries:Array<{id:string, docs:Array<{path:string}>, block:string}>}} board
 * @param {ReturnType<typeof readOpenSpec>} spec
 */
export function linkEntries(board, spec) {
  if (!spec) return;
  const all = [...spec.changes, ...spec.archived];
  for (const e of board.entries) {
    e.changes = [];
    for (const c of all) {
      const byDoc = e.docs.some((d) => changeOf(d.path)?.dir === c.dir);
      const byText = String(e.block ?? "").includes(`changes/${c.id}`);
      const byCite = c.cites.includes(e.id);
      if (byDoc || byText || byCite) {
        e.changes.push(c.id);
        c.entries.push(e.id);
      }
    }
  }
  // A closed entry whose history line links a change's file: the change (usually archived) names it too.
  for (const closed of board.closed ?? []) {
    if (closed.phase) continue;
    for (const c of all) {
      if (c.entries.includes(closed.id)) continue;
      if ((closed.docs ?? []).some((d) => changeOf(d.path)?.dir === c.dir)) c.entries.push(closed.id);
    }
  }
}
