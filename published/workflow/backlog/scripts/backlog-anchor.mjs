#!/usr/bin/env node
/**
 * **Opening or closing a backlog entry: which architecture documents concern it?**
 *
 * The rule: an OPEN entry's defect sits in the doc's `## Open defects`; at CLOSING time it leaves
 * that table and the entry gains a row in `## Who worked on it`. This gate is what makes that rule
 * more than a convention.
 *
 * Two questions, two treatments:
 *   DECLARED → FAILS. The entry's `- **Architecture**:` field names the docs it changes (optionally
 *              with a defect marker, `combat.md#D3`); those docs must cite it. Closes with a gesture.
 *   DERIVED  → LISTS. The entry's footprint is the files touched by commits whose SUBJECT names it
 *              (not the body: bodies narrate other entries). Docs naming those files but not
 *              declared are printed, never failed — the footprint over-attributes shared files.
 *
 * Usage (the project is found from CLAUDE_PROJECT_DIR or the git work tree of the cwd):
 *   node <skill>/scripts/backlog-anchor.mjs            # the entries HEAD opened or closed
 *   node <skill>/scripts/backlog-anchor.mjs BKLG-NNN   # specific entries
 *   node <skill>/scripts/backlog-anchor.mjs --all      # every entry that declares a document
 * Exit: 0 = ok / nothing to verify, 1 = a declaration the docs do not confirm, 2 = register unreadable.
 * A project without an architecture folder has no entry to judge: the `Architecture` field is optional.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createResolver, docIndex } from "./docIndex.mjs";
import {
  CONTRIBUTIONS_SECTION,
  DEFECTS_SECTION,
  architectureDocs,
  entryInSection,
  markersInSection,
} from "./architecture-shape.mjs";
import { DEFAULTS, project } from "./project.mjs";

const SEP = "@@COMMIT@@";

/** git, run in the project (never the shell's cwd, which may be a subfolder or another tree). */
const gitIn = (root) => (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1e8, stdio: ["ignore", "pipe", "ignore"] });
const git = gitIn(process.cwd());

/** The files of an already-filtered log. Pure: the caller passes the text, so it tests without a repo. */
export function footprintFromLog(output) {
  const files = new Set();
  for (const block of output.split(SEP).slice(1)) {
    const lines = block.split("\n");
    if (!(lines[0] ?? "").trim()) continue;
    for (const r of lines.slice(1)) {
      const f = r.trim();
      if (f && f.includes("/")) files.add(f);
    }
  }
  return files;
}

/**
 * An entry's footprint. `--grep` searches the whole message, so the subject filter is done here:
 * a commit that only mentions the entry in its body is narrating, not doing, the work.
 */
export function footprint(id, run = git) {
  let output = "";
  try {
    output = run(["log", "--all", "--name-only", `--format=${SEP}%s`, `--grep=${id}`]);
  } catch {
    return new Set();
  }
  // The digit boundary keeps BKLG-1 from taking BKLG-10's commits.
  const ofThisId = new RegExp(`${id}(?![0-9])`);
  const subjectOnly = output
    .split(SEP)
    .slice(1)
    .filter((b) => ofThisId.test(b.split("\n")[0] ?? ""))
    .map((b) => SEP + b)
    .join("");
  return footprintFromLog(subjectOnly);
}

/**
 * An entry's text, from its heading to the next entry or section. Empty when absent.
 * Both shapes: `## BKLG-NNN — title` (open register) and `- **BKLG-NNN** …` (history one-liner).
 */
export function entryBlock(text, id) {
  const lines = text.split("\n");
  const start = new RegExp(`^(## ${id}(?![0-9])|- \\*\\*${id}\\*\\*)`);
  const a = lines.findIndex((r) => start.test(r));
  if (a < 0) return "";
  const b = lines.findIndex((r, i) => i > a && /^(## |- \*\*BKLG-)/.test(r));
  return lines.slice(a, b < 0 ? undefined : b).join("\n");
}

const ARCHITECTURE_FIELD = /^\s*[-*]\s+\*\*Architecture\*\*\s*:/;
const OTHER_FIELD = /^\s*[-*]\s+\*\*/;

/** Does this block carry an `Architecture` field at all? */
export const hasArchitectureField = (block) => block.split("\n").some((r) => ARCHITECTURE_FIELD.test(r));

/**
 * "I declare none", decided on the field's OPENING only — so `— (none changes; the rule lives in
 * combat.md)` stays a denial and its prose never becomes a declaration.
 */
const DECLARES_NONE = /^\s*(—|-|none|no)(\s|$|\(|\.)/i;

/**
 * The whole field: the opening line plus its continuation lines (two docs with their prose rarely
 * fit on one line). It ends at a blank line, the next `- **Field**`, or a heading.
 */
export function fieldBody(lines, index) {
  const opening = lines[index].replace(ARCHITECTURE_FIELD, "");
  if (DECLARES_NONE.test(opening)) return { body: opening, declaresNone: true };
  const pieces = [opening];
  for (let j = index + 1; j < lines.length; j++) {
    const r = lines[j];
    if (!r.trim() || OTHER_FIELD.test(r) || r.startsWith("#")) break;
    pieces.push(r);
  }
  return { body: pieces.join("\n"), declaresNone: false };
}

/** A doc reference with its optional marker, in both spellings: `name.md#D3`, `[name.md](path)#D3`. */
const REFERENCE = /([A-Za-z0-9._-]+\.md)(?:\)?#([A-Za-z]\d{1,3})\b)?/g;
/** Any marker in the text, however it is written. */
const MARKER_ANYWHERE = /#([A-Za-z]\d{1,3})\b/g;

/**
 * Markers present in the field but claimed by no `.md` reference. A third spelling nobody parses
 * must FAIL rather than drop silently — dropping it would turn the gate green without looking.
 */
export function orphanMarkers(body) {
  const claimed = new Set([...body.matchAll(REFERENCE)].filter((m) => m[2]).map((m) => m[2]));
  const present = [...body.matchAll(MARKER_ANYWHERE)].map((m) => m[1]);
  return { present, orphans: [...new Set(present.filter((x) => !claimed.has(x)))].sort() };
}

/**
 * What the entry DECLARES it changes. Three states: `null` = no field (nothing demanded),
 * `[]` = explicitly none, a list = docs that must cite it.
 * Names are RESOLVED by suffix (`combat.md` → `docs/architecture/gameplay/combat.md`); one that does
 * not resolve comes back with `doc: null` so the judgement fails on the typo instead of hiding it.
 * `resolve` is mandatory: a default that always resolves could never report.
 */
export function declaredDocs(block, resolve) {
  const lines = block.split("\n");
  const index = lines.findIndex((r) => ARCHITECTURE_FIELD.test(r));
  if (index === -1) return null;
  const { body, declaresNone } = fieldBody(lines, index);
  if (declaresNone) return [];
  // A markdown link names the doc twice (text and target): group by the RESOLVED doc.
  const per = new Map();
  for (const m of body.matchAll(REFERENCE)) {
    const doc = resolve(m[1]);
    const key = doc ?? `?${m[1]}`;
    if (!per.has(key)) per.set(key, { doc, ref: m[1], markers: new Set() });
    if (m[2]) per.get(key).markers.add(m[2]);
  }
  return [...per.values()].map(({ doc, ref, markers }) => ({ doc, ref, markers: [...markers].sort() }));
}

/** The orphan markers of an entry's field — see {@link orphanMarkers}. */
export function entryOrphans(block) {
  const lines = block.split("\n");
  const index = lines.findIndex((r) => ARCHITECTURE_FIELD.test(r));
  if (index === -1) return { present: [], orphans: [] };
  const { body, declaresNone } = fieldBody(lines, index);
  return declaresNone ? { present: [], orphans: [] } : orphanMarkers(body);
}

/**
 * The judgement, pure. Where an entry must be cited depends on its state: OPEN → anywhere in the doc
 * (it sits among the defects); CLOSED → in `Who worked on it` (otherwise the stale defect row would
 * satisfy the check in exactly the case it must report). Same symmetry for markers:
 *   open   + `#D3` → D3 MUST be among the open defects ("absent" otherwise)
 *   closed + `#D3` → D3 must NOT be there any more    ("left" otherwise)
 */
export function judgement({ id, closed, declared, derived, citesEntry, entryContributions, markersByDoc, orphans = [] }) {
  const citedAnywhere = (doc) => (citesEntry.get(doc) ?? new Set()).has(id);
  const inContributions = (doc) => (entryContributions.get(doc) ?? new Set()).has(id);
  const cites = (doc) => (closed ? inContributions(doc) : citedAnywhere(doc));
  const decls = declared ?? [];
  const unknown = decls.filter((d) => !d.doc).map((d) => d.ref).sort();
  const resolved = decls.filter((d) => d.doc);
  const names = resolved.map((d) => d.doc);

  const markers = [];
  for (const { doc, markers: listed } of resolved) {
    const present = markersByDoc?.get(doc) ?? new Set();
    for (const marker of listed) {
      const there = present.has(marker);
      if (!closed && !there) markers.push({ doc, marker, direction: "absent" });
      if (closed && there) markers.push({ doc, marker, direction: "left" });
    }
  }

  return {
    unknown,
    missing: names.filter((d) => !cites(d)).sort(),
    markers,
    orphans,
    // An invitation to look, so any citation counts: someone already looked at that doc.
    toCheck: derived.filter((d) => !names.includes(d) && !citedAnywhere(d)).sort(),
  };
}

/**
 * The entries a commit OPENED (new heading added to BACKLOG.md) or CLOSED (new entry added to
 * BACKLOG-HISTORY.md), read from the two diffs.
 */
export function entriesOfCommit(openDiff, closedDiff) {
  const added = (diff) => [...diff.matchAll(/^\+(?:## |- \*\*)(BKLG-\d+)/gm)].map((m) => m[1]);
  return { opened: added(openDiff), closed: added(closedDiff) };
}

/**
 * The block a CLOSED entry had in BACKLOG.md just before it was removed. The history register keeps
 * a condensed one-liner that usually drops the `Architecture` field — without this fallback the
 * closed direction of the check would never fire. Finds the last commit that changed how many times
 * the heading appears (the removal) and reads the register at its parent.
 */
export function lastOpenBlock(id, run = git, register = `${DEFAULTS.docsDir}/BACKLOG.md`) {
  try {
    const sha = run(["log", "-1", "--format=%H", `-S## ${id} `, "--", register]).trim();
    if (!sha) return "";
    return entryBlock(run(["show", `${sha}~1:${register}`]), id);
  } catch {
    return "";
  }
}

function main() {
  const { root, config, backlog: OPEN, history: CLOSED } = project();
  const git = gitIn(root);
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const explicit = args.filter((a) => /^BKLG-\d+$/.test(a));

  if (!existsSync(path.join(root, OPEN))) {
    console.log(`⛔ anchor: ${OPEN} not found in ${root} — nothing to read, not judging.`);
    return 2;
  }
  const openText = readFileSync(path.join(root, OPEN), "utf8");
  const closedText = existsSync(path.join(root, CLOSED)) ? readFileSync(path.join(root, CLOSED), "utf8") : "";
  const isClosed = (id) => !entryBlock(openText, id) && Boolean(entryBlock(closedText, id));
  const blockCache = new Map();
  const block = (id) => {
    if (!blockCache.has(id)) {
      let b = entryBlock(openText, id) || entryBlock(closedText, id);
      if (isClosed(id) && !hasArchitectureField(b)) b = lastOpenBlock(id, git, OPEN) || b;
      blockCache.set(id, b);
    }
    return blockCache.get(id);
  };

  const { citesEntry, namesFile } = docIndex(root, { architectureOnly: true, config });
  const archDocs = architectureDocs(root, config.architectureDir);
  const resolveDoc = createResolver(new Set(archDocs));
  const textOf = new Map(archDocs.map((d) => [d, readFileSync(path.join(root, d), "utf8")]));
  const entryContributions = new Map(archDocs.map((d) => [d, entryInSection(textOf.get(d), CONTRIBUTIONS_SECTION)]));
  const markersByDoc = new Map(archDocs.map((d) => [d, markersInSection(textOf.get(d), DEFECTS_SECTION)]));

  let ids = explicit;
  let origin = "passed by hand";
  if (!ids.length && all) {
    const every = /^(?:## |- \*\*)(BKLG-\d+)/gm;
    ids = [...new Set([...openText.matchAll(every), ...closedText.matchAll(every)].map((m) => m[1]))]
      .filter((id) => declaredDocs(block(id), resolveDoc)?.length);
    origin = "those that declare a document";
    if (!ids.length) {
      console.log(`anchor: no entry declares an architecture document (${archDocs.length} docs in ${config.architectureDir}/) — nothing to verify.`);
      return 0;
    }
  }
  if (!ids.length && !all) {
    const show = (f) => {
      try {
        return git(["show", "HEAD", "--", f]);
      } catch {
        return "";
      }
    };
    const { opened, closed } = entriesOfCommit(show(OPEN), show(CLOSED));
    ids = [...new Set([...opened, ...closed])];
    origin = "opened or closed by HEAD";
    if (!ids.length) {
      console.log("anchor: no entry opened or closed in this commit — nothing to verify.");
      return 0;
    }
  }

  console.log(`backlog anchor — ${ids.length} entries (${origin}) · ${archDocs.length} architecture docs`);
  let broken = 0;
  let markersRead = 0;
  for (const id of ids) {
    const b = block(id);
    const closed = isClosed(id);
    const declared = declaredDocs(b, resolveDoc);
    const touched = footprint(id, git);
    const derived = [...namesFile.entries()].filter(([, s]) => [...touched].some((f) => s.has(f))).map(([d]) => d);
    const read = entryOrphans(b);
    markersRead += read.present.length;
    const { unknown, missing, markers, orphans, toCheck } = judgement({
      id, closed, declared, derived, citesEntry, entryContributions, markersByDoc, orphans: read.orphans,
    });

    // The control numbers, always printed: an empty footprint may just mean no commit names it.
    const state = !b ? "not found" : closed ? "closed" : "open";
    console.log(
      `\n${id} (${state}) · footprint ${touched.size} files · declares ${declared === null ? "—" : declared.length}` +
        ` · derived ${derived.length}` +
        (declared?.some((d) => d.markers.length) ? ` · markers ${declared.flatMap((d) => d.markers).join(", ")}` : ""),
    );
    if (unknown.length) {
      broken += unknown.length;
      console.log(`   ⛔ DECLARES a document that does not exist (${unknown.length}):`);
      unknown.forEach((r) => console.log(`      · ${r}`));
    }
    if (missing.length) {
      broken += missing.length;
      console.log(`   ⛔ DECLARED, and they do not cite it${closed ? ` in «${CONTRIBUTIONS_SECTION}»` : ""} (${missing.length}):`);
      missing.forEach((d) => console.log(`      · ${d}`));
    }
    for (const m of markers) {
      broken += 1;
      console.log(
        m.direction === "absent"
          ? `   ⛔ defect ${m.marker} is NOT in the «${DEFECTS_SECTION}» of ${m.doc}`
          : `   ⛔ ${m.marker} is STILL among the «${DEFECTS_SECTION}» of ${m.doc}, but the entry is closed`,
      );
    }
    if (orphans.length) {
      broken += orphans.length;
      console.log(
        `   ⛔ MARKER no document claims (${orphans.length}): ${orphans.join(", ")}\n` +
          "      Write it attached to the name (`name.md#D3`) or right after the link (`[name.md](path)#D3`).",
      );
    }
    if (toCheck.length) {
      console.log(`   📄 touched and not declared (${toCheck.length}) — to look at, not necessarily to fix:`);
      toCheck.forEach((d) => console.log(`      · ${d}`));
    }
    if (!unknown.length && !missing.length && !markers.length && !orphans.length && !toCheck.length) {
      console.log("   ✅ nothing to do");
    }
  }

  if (broken) {
    console.log(
      `\n⛔ ${broken} declared thing(s) the documents do not confirm.\n` +
        `   The rule: on close the defect LEAVES «${DEFECTS_SECTION}» and ONE row appears in\n` +
        `   «${CONTRIBUTIONS_SECTION}» — \`| [[BKLG-NNN]] | what it did |\`. A marker (\`doc.md#D3\`)\n` +
        "   follows the same rule both ways: while open the defect MUST be numbered there; once closed it must be gone.",
    );
    return 1;
  }
  console.log(`\n✅ every declared document cites its entry.  · markers read: ${markersRead}, orphans 0`);
  return 0;
}

// `pathToFileURL`, not a hand-built string (Windows would exit silently with 0); `argv[1]` is absent
// under `node -e`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
