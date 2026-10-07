#!/usr/bin/env node
/**
 * **Where the project is, and what it declares about itself** — read once by every backlog script.
 *
 * The scripts live inside the installed skill (`.claude/skills/backlog/scripts/`, or a plugin cache far from the
 * project), so neither their own location nor the shell's drifting cwd is the project. The root is
 * `CLAUDE_PROJECT_DIR` when the harness sets it, else the git work tree the command runs in, else the cwd.
 *
 * The project's own values live in `.claude/backlog.json` (optional; every key has a default):
 *
 *   {
 *     "docsDir": "docs/implementations",              where BACKLOG.md, BACKLOG-HISTORY.md and the doc folders live
 *     "architectureDir": "docs/architecture",         the stable docs the `Architecture` field points at
 *     "lineExtensions": ["gd"],                       extra text extensions a `path:line` pointer may name
 *     "assetExtensions": ["prefab"],                  extra binary extensions a backticked path may name
 *     "ignoreExtensions": ["meta"],                   files left out of the index (generated companions)
 *     "skipFolders": ["Library"],                     extra generated root folders (used outside git only)
 *     "instructionPaths": ["docs/guides/"],           extra docs whose backticked paths must exist
 *     "pastPaths": ["docs/old-notes/"],               extra docs that describe the past (citations not checked)
 *     "pathExceptions": { "a/b.png": "why it is not a file of the repo" },
 *     "architectureExclusions": { "docs/architecture/glossary.md": "why it has no defects of its own" },
 *     "fieldNames": { "Architecture": "Architettura" },  the project's name for an entry field (and the close fields)
 *     "words": { "openDefects": "I difetti aperti", ... }  the words the gates look for in the documents
 *     "citation": "wiki",                             how a document cites an entry: `[[BKLG-NNN]]` (wiki) or the id alone (bare)
 *     "github": { "labels": {...}, "closeComment": "...", "statusWords": {...}, "priorityWords": {...} }
 *                                                     what the GitHub mirror writes, and the project's Status/Priority words
 *   }
 *
 * `fieldNames` and `words` exist because the gates search documents for words, and the words are the project's:
 * a register written in another language names its fields and sections in it. Each key has an English default.
 *
 * `citation` is a closed choice, not a pattern: a pattern that matches nothing blinds every gate without an error,
 * and the two forms are the ones registers use.
 *
 * The GitHub repo and its default branch are not configured: they are read from git (`origin`), so they cannot
 * drift from it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** The project's config file, relative to its root. */
export const CONFIG_FILE = ".claude/backlog.json";

/**
 * The entry fields, by their canonical (English) name: those the scripts read, and the history line's close fields
 * (`Done`, `Obsolete`) — no gate parses those, but a project's own tools may, so the close line is written under
 * the project's name for them.
 */
export const FIELDS = Object.freeze([
  "Status", "Priority", "Added", "Manual", "Architecture", "Doc", "Summary", "Issue", "Done", "Obsolete",
]);

/** The words the gates look for in the documents, with their English defaults. */
export const WORDS = Object.freeze({
  /** BACKLOG.md's section holding the open entries (`## Open`). */
  open: "Open",
  /** The architecture doc's section listing its open defects. */
  openDefects: "Open defects",
  /** The architecture doc's section with one row per entry that worked on it. */
  contributions: "Who worked on it",
  /** An optional table mapping each open defect to the entry that will close it. */
  owners: "Defect owners",
  /** The column heading in which a defect row names the entry that closes it. */
  ownerColumn: "closed by",
  /** The column heading of a defect row's declared state (closed-defects reads tables that have both columns). */
  stateColumn: "state",
  /** Words that declare a defect closed in its state cell (a ✅ always does). */
  closed: ["closed", "done", "fixed"],
  /** Words that say "none": an `Architecture` field declaring no doc, an owner cell naming nobody (whole words). */
  none: ["none", "nobody"],
  /** Words marking a history line of an entry that was REOPENED (closed twice is then the history, not a mistake). */
  reopened: ["reopened"],
  /** A line listing retired defect numbers, kept in the defects section but not open. */
  retired: ["retired"],
  /** Table headings that say the table is not about open defects (accepted limits, retired ones). */
  nonDefectHeadings: ["limit", "retired"],
});

/** How a document cites an entry: `wiki` = `[[BKLG-NNN]]`, `bare` = the id alone. */
export const CITATION_FORMS = Object.freeze(["wiki", "bare"]);

/** The canonical statuses and priorities the GitHub mirror labels; a project maps its own words onto them. */
export const STATUSES = Object.freeze(["open", "in-progress", "blocked"]);
export const PRIORITIES = Object.freeze(["high", "medium", "low"]);

/** The labels the mirror owns, by canonical name; `github.labels` renames any of them. */
export const GITHUB_LABELS = Object.freeze([
  "backlog",
  ...STATUSES.map((s) => `status:${s}`),
  ...PRIORITIES.map((p) => `priority:${p}`),
  "feature", "bug", "analysis", "diagnostic",
]);

/** What the GitHub mirror writes into the project's GitHub, and how it reads Status/Priority values. */
export const GITHUB = Object.freeze({
  /** canonical label → the project's label name. */
  labels: Object.freeze({}),
  /** The comment left on an issue the mirror closes. */
  closeComment: "Resolved via the `backlog` skill — moved to BACKLOG-HISTORY.md.",
  /** The project's Status word → a canonical status (the canonical words are always recognised). */
  statusWords: Object.freeze({}),
  /** The project's Priority word → a canonical priority (the canonical words are always recognised). */
  priorityWords: Object.freeze({}),
});

/** Every key the config may carry, with its default. A key not listed here is a typo and is reported. */
export const DEFAULTS = Object.freeze({
  docsDir: "docs/implementations",
  architectureDir: "docs/architecture",
  lineExtensions: [],
  assetExtensions: [],
  ignoreExtensions: [],
  skipFolders: [],
  instructionPaths: [],
  pastPaths: [],
  pathExceptions: {},
  architectureExclusions: {},
  fieldNames: {},
  words: WORDS,
  citation: "wiki",
  github: GITHUB,
});

const isStringMap = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "string");
const isStringList = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
const sameShape = (expected, value) =>
  Array.isArray(expected) ? isStringList(value) : typeof expected === "string" ? typeof value === "string" && value.trim() !== "" : isStringMap(value);

/** A nested map whose keys are fixed (`fieldNames`, `words`): an unknown key is a typo, reported by name. */
function checkKeys(key, value, known) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${CONFIG_FILE}: "${key}" must be an object`);
  for (const k of Object.keys(value)) {
    if (!known.includes(k)) throw new Error(`${CONFIG_FILE}: unknown ${key} key "${k}" (known: ${known.join(", ")})`);
  }
}

/** A map of words onto a closed set of canonical values (`github.statusWords`): each value must be one of them. */
function checkWordMap(key, value, allowed) {
  if (!isStringMap(value)) throw new Error(`${CONFIG_FILE}: "${key}" must map words to strings`);
  for (const [word, canonical] of Object.entries(value)) {
    if (!allowed.includes(canonical)) {
      throw new Error(`${CONFIG_FILE}: "${key}.${word}" is "${canonical}", not one of: ${allowed.join(", ")}`);
    }
  }
}

/** The `github` object: fixed keys, labels among the canonical ones, words mapped onto canonical values. */
function parseGithub(value) {
  checkKeys("github", value, Object.keys(GITHUB));
  const github = { ...GITHUB, ...value };
  checkKeys("github.labels", github.labels, GITHUB_LABELS);
  if (!isStringMap(github.labels) || Object.values(github.labels).some((l) => l.trim() === "")) {
    throw new Error(`${CONFIG_FILE}: "github.labels" values must be non-empty strings`);
  }
  if (typeof github.closeComment !== "string" || github.closeComment.trim() === "") {
    throw new Error(`${CONFIG_FILE}: "github.closeComment" must be a non-empty string`);
  }
  checkWordMap("github.statusWords", github.statusWords, STATUSES);
  checkWordMap("github.priorityWords", github.priorityWords, PRIORITIES);
  return github;
}

/** The project's name for a canonical entry field (`Architecture` → `Architettura`). */
export const fieldName = (config, canonical) => config.fieldNames?.[canonical] ?? canonical;

/** The project root: `CLAUDE_PROJECT_DIR`, else the git work tree of `cwd`, else `cwd`. */
export function projectRoot(env = process.env, cwd = process.cwd()) {
  if (env.CLAUDE_PROJECT_DIR) return path.resolve(env.CLAUDE_PROJECT_DIR);
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (top) return path.resolve(top);
  } catch {
    // not a git work tree: the cwd is all there is
  }
  return path.resolve(cwd);
}

/**
 * The config merged over the defaults. Pure over its input: `text` is the file's content or null when absent.
 * Fails on an unknown key or a value of the wrong shape — a typo silently ignored is a rule silently off.
 */
export function parseConfig(text) {
  if (text === null || text === undefined) return { ...DEFAULTS };
  const raw = JSON.parse(text);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${CONFIG_FILE}: expected a JSON object`);
  }
  const config = { ...DEFAULTS };
  for (const [key, value] of Object.entries(raw)) {
    if (!(key in DEFAULTS)) throw new Error(`${CONFIG_FILE}: unknown key "${key}" (known: ${Object.keys(DEFAULTS).join(", ")})`);
    if (key === "fieldNames") {
      checkKeys(key, value, FIELDS);
      if (!isStringMap(value)) throw new Error(`${CONFIG_FILE}: "fieldNames" values must be strings`);
      config.fieldNames = value;
      continue;
    }
    if (key === "words") {
      checkKeys(key, value, Object.keys(WORDS));
      for (const [k, v] of Object.entries(value)) {
        if (!sameShape(WORDS[k], v)) throw new Error(`${CONFIG_FILE}: "words.${k}" has the wrong shape (expected ${JSON.stringify(WORDS[k])}-like)`);
      }
      config.words = { ...WORDS, ...value };
      continue;
    }
    if (key === "citation") {
      if (!CITATION_FORMS.includes(value)) throw new Error(`${CONFIG_FILE}: "citation" must be one of: ${CITATION_FORMS.join(", ")}`);
      config.citation = value;
      continue;
    }
    if (key === "github") {
      config.github = parseGithub(value);
      continue;
    }
    const expected = DEFAULTS[key];
    if (!sameShape(expected, value)) throw new Error(`${CONFIG_FILE}: "${key}" has the wrong shape (expected ${JSON.stringify(expected)}-like)`);
    config[key] = typeof value === "string" ? value.replace(/\\/g, "/").replace(/\/+$/, "") : value;
  }
  return config;
}

/** The project's config, read from `<root>/.claude/backlog.json`. */
export function loadConfig(root) {
  const file = path.join(root, CONFIG_FILE);
  return parseConfig(existsSync(file) ? readFileSync(file, "utf8") : null);
}

/** Root, config and the register's paths in one place, so no script restates them. */
export function project(env = process.env, cwd = process.cwd()) {
  const root = projectRoot(env, cwd);
  const config = loadConfig(root);
  return {
    root,
    config,
    backlog: `${config.docsDir}/BACKLOG.md`,
    history: `${config.docsDir}/BACKLOG-HISTORY.md`,
  };
}
