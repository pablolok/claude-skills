#!/usr/bin/env node
/**
 * Run the `mermaid-diagrams` skill's validator or renderer on this project with one stable command, whatever
 * version of the plugin is installed (the plugin cache path changes with every version). Copy this file into the
 * project (e.g. `scripts/mermaid.mjs`) and commit it; it is the only place the project pins the skill's version.
 *
 *   node scripts/mermaid.mjs check <file.md> [file.md ...]     # check-mermaid.mjs: parse + render under jsdom
 *   node scripts/mermaid.mjs render <diagrams-folder>          # render-svg.mjs: every .mmd to a sibling .svg
 *
 * Other arguments pass through, the exit code is the script's, and the cwd stays the caller's: the scripts resolve
 * mermaid, jsdom and mermaid-cli from the cwd first, then from the skill's own folder.
 *
 * Where the skill comes from, first match wins:
 *   1. MERMAID_SKILL_DIR — a folder holding the skill (check-mermaid.mjs inside);
 *   2. `.claude/skills/mermaid-diagrams` in the project, when the project keeps a copy of the skill there at this
 *      same version;
 *   3. a shallow clone of the skill repo at the pinned tag, cached under CLAUDE_SKILLS_CACHE (default: the user's
 *      `.cache/claude-skills`) — fetched once, then reused offline. A clone has no node_modules: when mermaid or
 *      jsdom resolve neither from the cwd nor from the clone, the skill's own package.json is installed there once
 *      (`bun install`, or `npm install` without bun).
 *
 * Same shape and names as the `backlog` skill's bootstrap/backlog-gate.mjs, on purpose: the two are meant to merge
 * into one generic launcher (a skill name, its published path and its subcommands as the only differences).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The skill and the version this project uses: change it here to upgrade. */
const SKILL = "mermaid-diagrams";
const VERSION = "1.1.1";
const REPO_URL = "https://github.com/pablolok/claude-skills.git";
const PUBLISHED_PATH = "published/workflow/mermaid-diagrams";

/** The subcommands and the skill script each one runs. */
const COMMANDS = { check: "check-mermaid.mjs", render: "render-svg.mjs" };
/** What the scripts import; a cached clone without them gets the skill's package.json installed. */
const DEPENDENCIES = ["mermaid", "jsdom"];

const projectRoot = () => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: path.dirname(fileURLToPath(import.meta.url)), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
};

const versionOf = (dir) => {
  try {
    return JSON.parse(readFileSync(path.join(dir, "metadata.json"), "utf8")).version;
  } catch {
    return null;
  }
};

/** The skill's folder, fetching the pinned tag once when no local copy matches; `cached` when it is that clone. */
function skillDir(root) {
  if (process.env.MERMAID_SKILL_DIR) return { dir: process.env.MERMAID_SKILL_DIR, cached: false };
  const installed = path.join(root, ".claude", "skills", SKILL);
  if (versionOf(installed) === VERSION) return { dir: installed, cached: false };
  const tag = `${SKILL}@${VERSION}`;
  const cache = process.env.CLAUDE_SKILLS_CACHE || path.join(homedir(), ".cache", "claude-skills");
  const clone = path.join(cache, tag);
  if (!existsSync(path.join(clone, PUBLISHED_PATH, COMMANDS.check))) {
    mkdirSync(cache, { recursive: true });
    const r = spawnSync("git", ["-c", "advice.detachedHead=false", "clone", "-q", "--depth", "1", "--branch", tag, REPO_URL, clone], { stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`mermaid: could not fetch ${tag} from ${REPO_URL} (offline? set MERMAID_SKILL_DIR).`);
      process.exit(2);
    }
  }
  return { dir: path.join(clone, PUBLISHED_PATH), cached: true };
}

/** True when `name` resolves from one of `roots` — the same lookup the skill's scripts make. */
const resolvable = (name, roots) => roots.some((root) => {
  try {
    createRequire(path.join(root, "package.json")).resolve(name);
    return true;
  } catch {
    return false;
  }
});

/** Install the skill's own dependencies in the cached clone, once: bun when it is on PATH, npm otherwise. */
function installDependencies(dir) {
  const hasBun = spawnSync("bun", ["--version"], { stdio: "ignore" }).status === 0;
  const tool = hasBun ? "bun" : "npm";
  console.log(`mermaid: installing the skill's dependencies in ${dir} (${tool} install), once.`);
  // npm is npm.cmd on Windows, which spawnSync runs only through a shell.
  const r = spawnSync(tool, ["install"], {
    cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: !hasBun && process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error(`mermaid: ${tool} install failed in ${dir}\n${r.stderr ?? r.error ?? ""}`);
    process.exit(2);
  }
}

const [command, ...args] = process.argv.slice(2);
if (!Object.hasOwn(COMMANDS, command ?? "")) {
  console.error("usage: node mermaid.mjs check <file.md> [file.md ...]\n       node mermaid.mjs render <diagrams-folder>");
  process.exit(2);
}
const { dir, cached } = skillDir(projectRoot());
const script = path.join(dir, COMMANDS[command]);
if (!existsSync(script)) {
  console.error(`mermaid: no ${COMMANDS[command]} in ${dir} (${SKILL}@${VERSION})`);
  process.exit(2);
}
if (cached && !DEPENDENCIES.every((name) => resolvable(name, [process.cwd(), dir]))) installDependencies(dir);
const run = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
process.exit(run.status ?? 1);
