#!/usr/bin/env node
/**
 * **Which files and which ENTRIES a document names** — the shared vocabulary of the doc gates.
 *
 * `check-doc-refs` and `backlog-anchor` both ask "what does this document point at?". The answer lives here once:
 * two copies of a regex drift apart at the first edit made to only one.
 *
 * Nothing is cached: the index is recomputed on every run, because a stored index is a second copy
 * of the truth that goes stale at the first commit nobody re-runs it after.
 *
 * What counts as a source file, which folders are generated and which docs describe the past start from generic
 * defaults; a project extends them in `.claude/backlog.json` (see `project.mjs`).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DEFAULTS } from "./project.mjs";

// ─── Walking the repo ─────────────────────────────────────────────────────────────────────────────

/** Generated/IDE folders that may appear anywhere — never documents, never referenced sources. */
const SKIPPED_ANYWHERE = new Set([".git", "node_modules", ".vs", ".idea", ".venv", "venv", "__pycache__"]);
/** Generated root folders, skipped when the tree is not a git work tree (in one, git's ignore rules decide). */
const SKIPPED_AT_ROOT = ["dist", "build", "out", "bin", "obj", "coverage", "target"];

/**
 * Every file of the repo under `root`, as root-relative forward-slash paths: in a git work tree, what git keeps —
 * tracked and new files, the ignored ones never (walked from the disk, a doc citing a git-ignored file passed on the
 * machine that had it and failed in the CI's checkout); outside one, the folders walked. Files with an
 * `ignoreExtensions` extension (generated companions) are left out.
 */
export function allFiles(root, config = DEFAULTS) {
  const ignored = config.ignoreExtensions.map((e) => "." + e.replace(/^\./, "").toLowerCase());
  return (gitFiles(root) ?? walk(root, new Set([...SKIPPED_AT_ROOT, ...config.skipFolders])))
    .filter((f) => !ignored.some((e) => f.toLowerCase().endsWith(e)));
}

/** What git keeps under `root` and is on disk (a tracked file deleted but not staged is gone); null: not a repo. */
function gitFiles(root) {
  let listed;
  try {
    listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
                          { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
  return [...new Set(listed.split("\0").filter(Boolean))].filter((f) => existsSync(path.join(root, f)));
}

/** Every file under `startDir`, the generated folders skipped (a tree outside git: no ignore rules to read). */
function walk(root, skipped, startDir = root, out = []) {
  const relDir = path.relative(root, startDir).split(path.sep).join("/");
  for (const entry of readdirSync(startDir, { withFileTypes: true })) {
    const name = entry.name;
    const rel = relDir ? `${relDir}/${name}` : name;
    if (entry.isDirectory()) {
      if (SKIPPED_ANYWHERE.has(name) || (!relDir && skipped.has(name)) || skipped.has(rel)) continue;
      walk(root, skipped, path.join(startDir, name), out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

// ─── The shapes of a reference ────────────────────────────────────────────────────────────────────

/** Text files a `path:line` pointer can target — a line number only means something in text. */
export const LINE_EXTENSIONS = [
  "md", "txt", "json", "yml", "yaml", "toml", "xml", "ini", "sql", "csv",
  "js", "mjs", "cjs", "jsx", "ts", "tsx", "vue", "svelte", "css", "scss", "html",
  "py", "rb", "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs", "php", "lua",
  "sh", "ps1", "psm1", "bat",
];
/** Binary files a doc may name by path, but never by line. */
export const ASSET_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "ico"];

// Longest first, so `json` is tried before `js` without relying on backtracking.
const alternation = (exts) =>
  [...new Set(exts.map((e) => e.replace(/^\./, "")))].sort((a, b) => b.length - a.length).join("|");

/** A markdown link: `[text](target)`. */
export const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

/**
 * The reference shapes for a project's extensions. Built per config, so a project naming its own file kinds
 * (`gd`, `prefab`) has them read like the defaults.
 */
export function vocabulary(config = DEFAULTS) {
  const line = [...LINE_EXTENSIONS, ...config.lineExtensions];
  const asset = [...ASSET_EXTENSIONS, ...config.assetExtensions];
  return {
    /**
     * A `path/file.ext:123` pointer. The path may be abbreviated (resolved by suffix by the caller).
     * The `:` inside the lookbehind keeps `https://host/app.js:80` from being read as a repo file.
     */
    FILE_LINE: new RegExp(String.raw`(?<![\w.\/:-])([\w.\/-]+\.(?:${alternation(line)})):(\d+)`, "gi"),
    /** A backticked path with at least one folder: `` `src/billing/invoice.ts` ``. */
    BARE: new RegExp(String.raw`\`([\w.\/@-]*\/[\w.\/@-]+\.(?:${alternation([...line, ...asset])}))\``, "gi"),
    /** The "sources" of the reverse index: what a doc can describe (other docs are linked, not indexed). */
    isSource: new RegExp(`\\.(?:${alternation([...line, ...asset].filter((e) => e !== "md"))})$`, "i"),
  };
}

const DEFAULT_VOCABULARY = vocabulary();
/** The default shapes (no project extensions). */
export const { FILE_LINE, BARE } = DEFAULT_VOCABULARY;

/**
 * Documents that describe the PAST: a change made today cannot make them false, so reporting them
 * would be noise by construction. Every exclusion added here is a document nobody checks again —
 * a project widens it (`pastPaths`) only with a written reason.
 */
export const describesThePast = (rel, config = DEFAULTS) =>
  rel.endsWith("BACKLOG-HISTORY.md") ||
  rel.split("/").includes("archive") ||
  config.pastPaths.some((p) => rel.startsWith(p));

/**
 * Resolve a reference to exactly ONE file. Docs abbreviate paths (`billing/invoice.ts`), so it
 * resolves by suffix — but two candidates are an ambiguity, not a match, and give `null`.
 */
export const createResolver = (sources) => {
  const listing = [...sources];
  return (ref) => {
    const clean = ref.split("#")[0].replace(/^\.\//, "");
    if (sources.has(clean)) return clean;
    const candidates = listing.filter((f) => f.endsWith("/" + clean));
    return candidates.length === 1 ? candidates[0] : null;
  };
};

/** The files ONE text names, already resolved. Pure: the caller passes the text in. */
export function namedFiles(text, resolve, shapes = DEFAULT_VOCABULARY) {
  const found = new Set();
  for (const re of [LINK, shapes.FILE_LINE, shapes.BARE]) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const r = resolve(m[1]);
      if (r) found.add(r);
    }
  }
  return found;
}

// ─── Entry citations ──────────────────────────────────────────────────────────────────────────────

/**
 * The backlog entries a text CITES. To cite is to LINK: `[[BKLG-NNN]]`, not a bare `BKLG-NNN` —
 * a bare id inside a URL, a code block or a folder name says nothing about what the doc discusses.
 */
export function citedEntries(text) {
  return new Set([...text.matchAll(/\[\[(BKLG-\d+)\]\]/g)].map((m) => m[1]));
}

/**
 * The twin of `citedEntries`: bare mentions that SHOULD have been citations. Kept next to it so
 * the two exclusion lists cannot drift apart. Not reported:
 * - identity: a line OPENING with the id (`## BKLG-NNN — Title`, `- **BKLG-NNN**` history line);
 * - guarded: inside backticks, a link's text, a URL or a path;
 * - inside a ``` fence;
 * - ranges (`BKLG-NNN/MMM`): the second half is not an id, linking the first alone would lie.
 */
const IDENTITY = /^(#{1,6} BKLG-\d+|- \*\*BKLG-\d+\*\*)/;
const GUARDED = [/`[^`]*`/g, /\[[^\]]*\]/g, /https?:\/\/\S+/g, /[\w.\/-]*\/[\w.\/-]+/g];

export function bareMentions(text) {
  const found = [];
  let insideCode = false;
  text.split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      insideCode = !insideCode;
      return;
    }
    if (insideCode || IDENTITY.test(line)) return;
    const zone = GUARDED.flatMap((re) => [...line.matchAll(re)].map((m) => [m.index, m.index + m[0].length]));
    for (const m of line.matchAll(/(\[\[)?BKLG-\d+/g)) {
      if (m[1]) continue;
      if (zone.some(([a, b]) => m.index >= a && m.index < b)) continue;
      if (/^\/\d/.test(line.slice(m.index + m[0].length))) continue;
      found.push({ line: i + 1, id: m[0], text: line.trim() });
    }
  });
  return found;
}

// ─── The reverse index ────────────────────────────────────────────────────────────────────────────

/**
 * For every live document: the source files it names and the entries it cites.
 * `architectureOnly` narrows to the project's architecture folder (backlog-anchor's question).
 */
export function docIndex(root, { architectureOnly = false, config = DEFAULTS } = {}) {
  const all = allFiles(root, config);
  const shapes = vocabulary(config);
  const sources = new Set(all.filter((f) => shapes.isSource.test(f)));
  const resolve = createResolver(sources);
  const archPrefix = config.architectureDir + "/";
  const alive = all.filter(
    (f) => f.endsWith(".md") && !describesThePast(f, config) && (!architectureOnly || f.startsWith(archPrefix)),
  );
  const namesFile = new Map();
  const citesEntry = new Map();
  for (const doc of alive) {
    const text = readFileSync(path.join(root, doc), "utf8");
    const files = namedFiles(text, resolve, shapes);
    if (files.size) namesFile.set(doc, files);
    const entries = citedEntries(text);
    if (entries.size) citesEntry.set(doc, entries);
  }
  return { sources, namesFile, citesEntry, all };
}
