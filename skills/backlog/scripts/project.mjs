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
 *     "pathExceptions": { "a/b.png": "why it is not a file of the repo" }
 *   }
 *
 * The GitHub repo and its default branch are not configured: they are read from git (`origin`), so they cannot
 * drift from it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** The project's config file, relative to its root. */
export const CONFIG_FILE = ".claude/backlog.json";

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
});

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
    const expected = DEFAULTS[key];
    const ok = Array.isArray(expected)
      ? Array.isArray(value) && value.every((v) => typeof v === "string")
      : typeof expected === "string"
        ? typeof value === "string" && value.trim() !== ""
        : value !== null && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((v) => typeof v === "string");
    if (!ok) throw new Error(`${CONFIG_FILE}: "${key}" has the wrong shape (expected ${JSON.stringify(expected)}-like)`);
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
