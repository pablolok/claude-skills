#!/usr/bin/env node
/**
 * check-doc-refs — do the references inside the documents point at something that exists?
 *
 * A doc pointing at a file that no longer exists is worse than no doc: it gets believed, and the
 * evidence behind it cannot be opened. Five rules, each with its own scope (a gate that is red on
 * correct docs gets ignored from day one):
 *
 *   1. RELATIVE LINKS — every doc outside `archive/` (archived docs describe the world as it was).
 *   2. FILE:LINE      — same scope, minus the history register. Checks the file exists and is long
 *                       enough; NOT that the line still says the right thing (declared limit).
 *   3. BARE PATHS     — only in docs that are instructions to FOLLOW or describe the PRESENT
 *                       (`CLAUDE.md`, `AGENTS.md`, `.claude/skills/`, the architecture folder, and the
 *                       project's `instructionPaths`). Registers cite deleted files on purpose.
 *   4. CITATIONS      — an entry is mentioned as `[[BKLG-NNN]]`, which is what makes it readable to
 *                       `backlog-anchor`. Past-describing docs are exempt. A project that cites bare ids
 *                       (`"citation": "bare"`) has every prose id counted as a citation, and nothing to report.
 *   5. FOLDER ⟺ CARD  — every folder under `<docsDir>/{features,bugs,diagnostic,analysis}` is claimed by
 *                       an OPEN entry (below `## Open`, the project's `words.open`); closing an entry moves its
 *                       folder to `archive/`.
 *                       An orphan folder is a plan no register claims any more.
 *
 * Usage: node <skill>/scripts/check-doc-refs.mjs      (exit 0 = clean, 1 = broken)
 * The project is found from CLAUDE_PROJECT_DIR or the git work tree of the cwd; its values come from
 * `.claude/backlog.json` (see project.mjs).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import {
  LINK,
  allFiles,
  bareMentions,
  citedEntries,
  createResolver as resolveToOne,
  describesThePast,
  vocabulary,
} from "./docIndex.mjs";
import { DEFAULTS, project } from "./project.mjs";
import { isOpenHeading } from "./register.mjs";
import { isEntryPoint } from "./entry-point.mjs";

/** Rule 3's scope: instructions to follow, and docs that describe the present. */
const isInstruction = (rel, config) =>
  rel === "CLAUDE.md" || rel === "AGENTS.md" || rel.startsWith(".claude/skills/") ||
  rel.startsWith(config.architectureDir + "/") || config.instructionPaths.some((p) => rel.startsWith(p));

/** `archive/` documents the past: its broken references are correct. */
const isAlive = (rel) => !rel.split("/").includes("archive");

/**
 * Does a bare path EXIST? Exact, or some file ends with "/<path>". Unlike `resolveToOne`, two
 * matches still mean "it exists": this rule asks existence, the file:line rule asks WHICH file.
 */
function createExistence(files) {
  const exact = new Set(files);
  return (p) => exact.has(p) || files.some((f) => f.endsWith("/" + p));
}

/** The four folder kinds the folder ⟺ card invariant governs. `archive/` is its other half. */
export const ACTIVITY_KINDS = ["features", "bugs", "diagnostic", "analysis"];

/**
 * Is every activity folder claimed by an OPEN entry? Only what follows the open section's heading (`## Open`, the
 * project's `words.open`) counts: a mention above it, in a pending ledger or a log, claims nothing — that is exactly
 * how a folder gets left behind. A register without that heading is read whole.
 * Also returns the claimed ones (the control case) and whether the register was read at all.
 */
export function orphanFolders(root = process.cwd(), config = DEFAULTS) {
  const base = join(root, config.docsDir);
  let open;
  try {
    const lines = readFileSync(join(base, "BACKLOG.md"), "utf8").split("\n");
    const i = lines.findIndex((l) => isOpenHeading(l.replace(/\r$/, ""), config));
    open = (i === -1 ? lines : lines.slice(i)).join("\n");
  } catch {
    return { orphans: [], claimed: [], registerRead: false };
  }
  const orphans = [];
  const claimed = [];
  for (const kind of ACTIVITY_KINDS) {
    let names = [];
    try {
      names = readdirSync(join(base, kind), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }
    for (const name of names) {
      const key = `${kind}/${name}`;
      (open.includes(key) ? claimed : orphans).push(key);
    }
  }
  return { orphans, claimed, registerRead: true };
}

/**
 * Every broken reference of the tree. `exceptions` (bare paths that are legitimately not files of the repo, each
 * with its REASON) default to the project's `pathExceptions`; the list is always printed — an empty printout next
 * to "0 broken" is how you tell "looked and found none" apart from "did not look".
 */
export function findBrokenRefs(root = process.cwd(), { config = DEFAULTS, exceptions } = {}) {
  const excuses = exceptions ?? new Map(Object.entries(config.pathExceptions));
  const { FILE_LINE, BARE } = vocabulary(config);
  const files = allFiles(root, config);
  const exists = createExistence(files);
  const resolveOne = resolveToOne(new Set(files));
  const exact = new Set(files);
  const docs = files.filter((f) => f.endsWith(".md"));

  const broken = [];
  const examined = { link: 0, line: 0, lineUnresolved: 0, path: 0, entry: 0 };
  const excused = [];

  for (const doc of docs) {
    const text = readFileSync(join(root, doc), "utf8");
    const live = isAlive(doc);
    const instruction = isInstruction(doc, config);
    const past = describesThePast(doc, config);

    // Rule 4. The history register keeps its bare ids as written at closing time. A project citing bare ids has no
    // bare mention to report (`bareMentions` is empty there): the rule counts its citations and nothing else.
    if (!past) {
      examined.entry += citedEntries(text, config).size;
      for (const m of bareMentions(text, config)) {
        broken.push({ rule: "citation", where: `${doc}:${m.line}`, ref: `${m.id} without double brackets`, note: `write [[${m.id}]]` });
      }
    }

    let insideFence = false;
    text.split("\n").forEach((line, i) => {
      const where = `${doc}:${i + 1}`;
      if (/^\s*```/.test(line)) { insideFence = !insideFence; return; }

      // Links only: blank out code spans, because a regex in backticks (`[^"']+`) looks like a link.
      // The other two extractors read the whole line — their paths usually sit inside backticks.
      const withoutCode = line.replace(/`[^`]*`/g, (s) => " ".repeat(s.length));

      for (const m of insideFence || !live ? [] : withoutCode.matchAll(LINK)) {
        const raw = m[1];
        // Any URI scheme (http:, mailto:, a tool's own like mem:) or an anchor is not a file of the repo.
        if (/^([a-z][a-z0-9+.-]*:|#)/i.test(raw)) continue;
        examined.link++;
        let decoded = raw.split("#")[0];
        try { decoded = decodeURIComponent(decoded); } catch { /* keep raw */ }
        const target = relative(root, resolve(root, dirname(doc), decoded)).split(sep).join("/");
        if (!exact.has(target) && !files.some((f) => f.startsWith(target + "/"))) {
          broken.push({ rule: "link", where, ref: raw });
        }
      }

      // Rule 2. A pointer inside a closed entry says where the code was AT CLOSING TIME.
      for (const m of live && !past ? line.matchAll(FILE_LINE) : []) {
        const [, ref, n] = m;
        const target = resolveOne(ref);
        if (!target) {
          // Ambiguous (`Player.cs:12` matching two files) or gone (usually a rename told in the past):
          // counted, not failed — failing would reject correct docs.
          examined.lineUnresolved++;
          continue;
        }
        examined.line++;
        const lineCount = readFileSync(join(root, target), "utf8").split("\n").length;
        if (lineCount < Number(n)) {
          broken.push({ rule: "line", where, ref: `${ref}:${n}`, note: `${target} has ${lineCount} lines` });
        }
      }

      for (const m of instruction ? line.matchAll(BARE) : []) {
        examined.path++;
        const p = m[1].replace(/^\.\//, "");
        if (excuses.has(p)) { excused.push({ where, ref: p, reason: excuses.get(p) }); continue; }
        if (!exists(p)) broken.push({ rule: "path", where, ref: p });
      }
    });
  }
  return { broken, examined, excused, documents: docs.length };
}

function main() {
  const { root, config } = project();
  const { broken, examined, excused, documents } = findBrokenRefs(root, { config });
  const { orphans, claimed, registerRead } = orphanFolders(root, config);

  // Every count is printed even when green: "0" without "out of how many" is indistinguishable
  // from a gate that looked at nothing.
  console.log(`project: ${root}`);
  console.log(`documents read: ${documents}`);
  console.log(`references examined: ${examined.link} links · ${examined.line} file:line · ${examined.path} paths (in instructions)`);
  console.log(`   · file:line not judgeable: ${examined.lineUnresolved} (ambiguous path or file gone) — counted, not failed`);
  console.log(
    `entry citations examined: ${examined.entry}` +
      (config.citation === "bare" ? " · form: bare (a bare id is a citation; no bare mention to report)" : ""),
  );
  console.log(
    `activity folders: ${claimed.length + orphans.length} · claimed by an open entry: ${claimed.length}` +
      (registerRead ? "" : `  ⚠️ ${config.docsDir}/BACKLOG.md not read`),
  );
  console.log(`\ndeclared exceptions, looked at (${excused.length}):`);
  for (const s of excused) console.log(`  · ${s.where}  ${s.ref}\n      ${s.reason}`);

  for (const f of orphans) {
    broken.push({
      rule: "folder",
      where: `${config.docsDir}/${f}`,
      ref: "orphan folder — no OPEN entry claims it",
      note: "closing an entry means moving its folder to archive/",
    });
  }

  if (broken.length === 0) {
    console.log(`\nbroken references: 0  ✅`);
    return 0;
  }

  console.log(`\n⛔ broken references: ${broken.length}`);
  for (const r of broken) console.log(`  [${r.rule}] ${r.where}\n      ${r.ref}${r.note ? `  (${r.note})` : ""}`);
  console.log(
    `\nA doc pointing at a missing file gets believed, and its evidence cannot be opened. Update the\n` +
      `reference or — if the code was deleted — remove the claim. A legitimate case goes in the\n` +
      `"pathExceptions" of .claude/backlog.json with its REASON.\n` +
      `[citation]: an entry named without double brackets is invisible to the tools — write [[BKLG-NNN]].\n` +
      `[folder]: either the entry is closed and the folder belongs in archive/, or the folder is live\n` +
      `and lacks its card — open the entry with the \`backlog\` skill.`,
  );
  return 1;
}

if (isEntryPoint(import.meta.url)) {
  process.exit(main());
}
