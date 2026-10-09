#!/usr/bin/env node
/**
 * Run one of the `backlog` skill's gates on this project from places that have no Claude session: CI, git hooks,
 * package scripts. Copy this file into the project (e.g. `scripts/backlog-gate.mjs`) and commit it; it is the only
 * place the project pins the skill's version.
 *
 *   node scripts/backlog-gate.mjs check-doc-refs
 *   node scripts/backlog-gate.mjs backlog-anchor --all
 *   node scripts/backlog-gate.mjs next-id
 *   node scripts/backlog-gate.mjs backlog-github-sync sync-all --execute
 *
 * Where the skill comes from, first match wins:
 *   1. BACKLOG_SKILL_DIR — a folder holding the skill (its `scripts/` inside);
 *   2. `.claude/skills/backlog` in the project, when the project keeps a copy of the skill there at this same version;
 *   3. a shallow clone of the skill repo at the pinned tag, cached under CLAUDE_SKILLS_CACHE (default: the user's
 *      `.cache/claude-skills`) — fetched once, then reused offline.
 * The gate runs with CLAUDE_PROJECT_DIR set to this project, whatever the cwd.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The skill and the version this project uses: change it here to upgrade. */
const SKILL = "backlog";
const VERSION = "1.5.1";
const REPO_URL = "https://github.com/pablolok/claude-skills.git";
const PUBLISHED_PATH = "published/workflow/backlog";

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

/** The skill's folder, fetching the pinned tag once when no local copy matches. */
function skillDir(root) {
  if (process.env.BACKLOG_SKILL_DIR) return process.env.BACKLOG_SKILL_DIR;
  const installed = path.join(root, ".claude", "skills", SKILL);
  if (versionOf(installed) === VERSION) return installed;
  const tag = `${SKILL}@${VERSION}`;
  const cache = process.env.CLAUDE_SKILLS_CACHE || path.join(homedir(), ".cache", "claude-skills");
  const clone = path.join(cache, tag);
  if (!existsSync(path.join(clone, PUBLISHED_PATH, "scripts"))) {
    mkdirSync(cache, { recursive: true });
    const r = spawnSync("git", ["-c", "advice.detachedHead=false", "clone", "-q", "--depth", "1", "--branch", tag, REPO_URL, clone], { stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`backlog-gate: could not fetch ${tag} from ${REPO_URL} (offline? set BACKLOG_SKILL_DIR).`);
      process.exit(2);
    }
  }
  return path.join(clone, PUBLISHED_PATH);
}

const [gate, ...args] = process.argv.slice(2);
if (!gate) {
  console.error("usage: node backlog-gate.mjs <gate> [args]   e.g. check-doc-refs, backlog-anchor --all");
  process.exit(2);
}
const root = projectRoot();
const script = path.join(skillDir(root), "scripts", `${gate.replace(/\.mjs$/, "")}.mjs`);
if (!existsSync(script)) {
  console.error(`backlog-gate: no gate "${gate}" in ${SKILL}@${VERSION}`);
  process.exit(2);
}
const run = spawnSync(process.execPath, [script, ...args], {
  stdio: "inherit", env: { ...process.env, CLAUDE_PROJECT_DIR: root },
});
process.exit(run.status ?? 1);
