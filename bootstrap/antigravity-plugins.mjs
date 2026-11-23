#!/usr/bin/env node
/**
 * Load this clone's plugins into Google Antigravity (`agy`), which has no custom marketplace: it reads the plugin
 * folders listed in `~/.gemini/config/plugins.json`, `entries[]`, each scanned ONE level deep (one plugin per
 * sub-folder). This tool keeps the entries that point into this clone up to date and touches nothing else.
 *
 *   node bootstrap/antigravity-plugins.mjs              # git pull --ff-only when safe, then write the entries
 *   node bootstrap/antigravity-plugins.mjs --no-pull    # skip the pull
 *   node bootstrap/antigravity-plugins.mjs --dry-run    # print the resulting plugins.json, write nothing
 *
 * Entries it writes:
 *   - one per `published/<category>/` (the plugins Claude Code installs, with their `.antigravity-plugin/plugin.json`);
 *   - one per `published-antigravity/<category>/` (the generated copy of a plugin that ships Claude-format agents,
 *     which Antigravity cannot load as published);
 *   - an `exclude` on the `published/` entry naming every plugin that has such a copy, so each loads once. `exclude`
 *     is a list of patterns matched against the plugin folder names (json_configs.md); plain names are valid patterns.
 *
 * Plugins `install.config.json` marks `"plugin": false` are not plugins (the Claude marketplace lists none of them),
 * so they are excluded the same way if a folder of that name is ever published. Empty bundle skeletons are not
 * published, hence never scanned. The Claude bootstrap (`claude-skills.mjs`) reads no such flag: it copies the skills
 * a project names and only those; this tool applies the marketplace's own rule instead.
 *
 * Merge rules: every entry that does not point inside this clone is kept as is (with every other top-level key);
 * the ones that do are replaced by the computed ones. The old file is copied to `plugins.json.bak` before a write,
 * the write is atomic (temp file + rename), and nothing is written when the content would not change.
 * Never runs `agy plugin install`, `import` or `link`. Node >= 20, no dependencies.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLISHED = "published";
const PUBLISHED_ANTIGRAVITY = "published-antigravity";
const INSTALL_CONFIG = "install.config.json";
const GIT_TIMEOUT_MS = 60_000;

// ============================================================
// Pure decisions (exported for tests)
// ============================================================

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const subdirs = (dir) => (isDir(dir)
  ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name).sort()
  : []);

/** The plugin names `install.config.json` says are not plugins (`"plugin": false`). */
export function notPlugins(config) {
  return Object.entries(config?.skills ?? {}).filter(([, v]) => v?.plugin === false).map(([name]) => name).sort();
}

/**
 * The entries for this clone: one per `published/<category>/` (excluding plugins with an Antigravity copy and the
 * ones that are not plugins) and one per `published-antigravity/<category>/` that holds a plugin.
 * @param {string} clone
 * @param {object|null} config the parsed install.config.json
 */
export function computeEntries(clone, config) {
  const skip = new Set(notPlugins(config));
  const entries = [];
  const copies = new Set();
  const antigravityRoot = path.join(clone, PUBLISHED_ANTIGRAVITY);
  for (const category of subdirs(antigravityRoot)) {
    const plugins = subdirs(path.join(antigravityRoot, category));
    plugins.forEach((p) => copies.add(p));
    if (plugins.length > 0) entries.push({ path: path.join(antigravityRoot, category) });
  }
  const publishedRoot = path.join(clone, PUBLISHED);
  const published = [];
  for (const category of subdirs(publishedRoot)) {
    const plugins = subdirs(path.join(publishedRoot, category));
    if (plugins.length === 0) continue;
    const exclude = plugins.filter((p) => copies.has(p) || skip.has(p));
    published.push({ path: path.join(publishedRoot, category), ...(exclude.length > 0 ? { exclude } : {}) });
  }
  return [...published, ...entries];
}

/** True when an entry's path lies inside `clone` (a `~/` path is resolved against `home`). */
export function pointsInside(entryPath, clone, home) {
  if (typeof entryPath !== "string") return false;
  const resolved = entryPath.startsWith("~/") ? path.join(home, entryPath.slice(2)) : entryPath;
  if (!path.isAbsolute(resolved)) return false;
  const rel = path.relative(path.resolve(clone), path.resolve(resolved));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Merge the computed entries into the existing document.
 * @returns {{doc: object, added: object[], removed: object[], unchanged: object[]}}
 */
export function mergeEntries(existing, computed, clone, home) {
  const doc = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...existing } : {};
  const current = Array.isArray(doc.entries) ? doc.entries : [];
  const foreign = current.filter((e) => !pointsInside(e?.path, clone, home));
  const stale = current.filter((e) => pointsInside(e?.path, clone, home));
  const key = (e) => JSON.stringify(e);
  const staleKeys = new Set(stale.map(key));
  const computedKeys = new Set(computed.map(key));
  doc.entries = [...foreign, ...computed];
  return {
    doc,
    added: computed.filter((e) => !staleKeys.has(key(e))),
    removed: stale.filter((e) => !computedKeys.has(key(e))),
    unchanged: computed.filter((e) => staleKeys.has(key(e))),
  };
}

// ============================================================
// I/O
// ============================================================

const git = (args, cwd) => spawnSync("git", args, {
  cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: GIT_TIMEOUT_MS,
  env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
});

/** `git pull --ff-only` when the clone is a clean checkout of its default branch; otherwise says why it did not. */
function pullIfSafe(clone) {
  if (!existsSync(path.join(clone, ".git"))) return { pulled: false, why: "not a git checkout" };
  const status = git(["status", "--porcelain"], clone);
  if (status.status !== 0) return { pulled: false, why: "git status failed" };
  if (status.stdout.trim() !== "") return { pulled: false, why: "uncommitted changes" };
  const branch = git(["symbolic-ref", "--short", "HEAD"], clone);
  if (branch.status !== 0) return { pulled: false, why: "detached HEAD" };
  const current = branch.stdout.trim();
  const head = git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], clone);
  const defaults = head.status === 0 ? [head.stdout.trim().replace(/^origin\//, "")] : ["main", "master"];
  if (!defaults.includes(current)) return { pulled: false, why: `on branch ${current}, not the default branch` };
  const pull = git(["pull", "--ff-only"], clone);
  if (pull.status !== 0) return { pulled: false, why: `git pull failed: ${(pull.stderr || "").trim().split("\n")[0]}` };
  return { pulled: true, why: pull.stdout.trim().split("\n").at(-1) };
}

const readJsonIfAny = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);

/** Runs the tool; returns the exit code. `out` receives the lines to print. */
export function run(argv, { home, cloneRoot, out = console.log } = {}) {
  const flags = new Set(argv);
  const unknown = argv.filter((a) => a !== "--dry-run" && a !== "--no-pull");
  if (unknown.length > 0) {
    out(`unknown argument ${unknown.join(" ")}\nusage: node bootstrap/antigravity-plugins.mjs [--dry-run] [--no-pull]`);
    return 2;
  }
  const clone = cloneRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const homeDir = home ?? process.env.HOME ?? process.env.USERPROFILE ?? homedir();
  const dryRun = flags.has("--dry-run");

  let pullLine;
  if (flags.has("--no-pull")) pullLine = "pull: skipped (--no-pull)";
  else {
    const r = pullIfSafe(clone);
    pullLine = r.pulled ? `pull: done (${r.why})` : `pull: skipped (${r.why})`;
  }

  const target = path.join(homeDir, ".gemini", "config", "plugins.json");
  let existing;
  try {
    existing = readJsonIfAny(target);
  } catch (error) {
    out(`${target} is not valid JSON (${error.message}); fix or remove it, nothing was changed`);
    return 1;
  }
  const config = readJsonIfAny(path.join(clone, INSTALL_CONFIG));
  const result = mergeEntries(existing, computeEntries(clone, config), clone, homeDir);
  const text = `${JSON.stringify(result.doc, null, 2)}\n`;
  const same = existing !== null && `${JSON.stringify(existing, null, 2)}\n` === text;
  const summary = `entries: ${result.added.length} added, ${result.removed.length} removed, ${result.unchanged.length} unchanged`;

  if (dryRun) {
    out(text.trimEnd());
    out(`${pullLine}\n${summary}\n(dry run: ${target} not written)`);
    return 0;
  }
  if (same) {
    out(`${pullLine}\n${summary}\n${target} already up to date`);
    return 0;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  if (existing !== null) copyFileSync(target, `${target}.bak`);
  const temp = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temp, text);
    renameSync(temp, target);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
  out(`${pullLine}\n${summary}\nwrote ${target}${existing !== null ? ` (previous copy: ${target}.bak)` : ""}`);
  return 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = run(process.argv.slice(2));
}
