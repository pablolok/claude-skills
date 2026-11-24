#!/usr/bin/env node
/**
 * Stop hook — the moment to run `skill-retrospective`: what the work taught goes back into the skills that served
 * it, rewritten in place, never appended as a log.
 *
 * The turn is held ONCE (never when `stop_hook_active`) when, since the last retrospective, either
 *  - a backlog entry was archived: a folder moved under an archive folder — the comma-separated paths in
 *    SKILL_RETRO_ARCHIVE_DIRS when set, else `<docsDir>/archive` when the project's .claude/backlog.json declares a
 *    docsDir, else docs/implementations/archive/ (a project without one simply never matches), or
 *  - at least SKILL_RETRO_COMMITS commits (default 8) piled up — a long piece of work.
 *
 * The last retrospective is the commit in .claude/.state/last-retrospective (the skill writes it); the skills used
 * are in .claude/.state/skills-used.txt (log-skill-use.mjs). With no baseline the hook writes HEAD as the baseline and
 * says nothing: counting the whole history would hold the first turn on a new machine for nothing.
 * Fail-open: any error (no git, no commits, unreadable input) exits 0 with no output; without CLAUDE_PROJECT_DIR
 * (no project) it does nothing.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MARK, USED, projectRoot, stateDir } from "./state.mjs";
import { isEntryPoint } from "./entry-point.mjs";

export const DEFAULT_COMMITS = 8;
export const COMMITS_ENV = "SKILL_RETRO_COMMITS";
export const ARCHIVE_ENV = "SKILL_RETRO_ARCHIVE_DIRS";
export const DEFAULT_ARCHIVE_DIRS = ["docs/implementations/archive"];

/** The backlog skill's project config, read for its `docsDir` (this plugin cannot import that one). */
export const BACKLOG_CONFIG = ".claude/backlog.json";

const normalized = (dir) => dir.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

/** `<docsDir>/archive` from the project's backlog config; null when it has none, or no readable `docsDir`. */
function backlogArchive(root) {
  if (!root) return null;
  try {
    const docsDir = JSON.parse(readFileSync(join(root, BACKLOG_CONFIG), "utf8"))?.docsDir;
    return typeof docsDir === "string" && normalized(docsDir) ? `${normalized(docsDir)}/archive` : null;
  } catch {
    return null; // absent or unreadable: the default
  }
}

/**
 * The archive folders, repo-relative with forward slashes: SKILL_RETRO_ARCHIVE_DIRS when set, else `<docsDir>/archive`
 * from the project's backlog config (`.claude/backlog.json`), else the default.
 */
export function archiveDirs(env, root) {
  const dirs = String(env?.[ARCHIVE_ENV] ?? "")
    .split(",")
    .map(normalized)
    .filter(Boolean);
  if (dirs.length) return dirs;
  const fromBacklog = backlogArchive(root);
  return fromBacklog ? [fromBacklog] : DEFAULT_ARCHIVE_DIRS;
}

/** What to tell the model: run the retrospective on these skills (null when there is nothing to say). */
export function retroText(reason, skills) {
  if (!reason) return null;
  const list = skills.length ? skills.join(", ") : "the skills the work used (see git log since the last retrospective)";
  return `${reason} Before the next piece of work, run the skill-retrospective skill on: ${list}. ` +
    "Rewrite those skills in place with what this work taught — fix the step, delete what proved wrong or useless, " +
    "keep them short — never append a lessons log. Project lessons go in the project's skills; general ones stay " +
    "generic and go to the skill's source — for a plugin, the skill repository the plugin comes from: look for its clone " +
    "(CLAUDE_SKILLS_REPO, or a local repository with that remote) and edit there if the person maintains it; otherwise " +
    "report the lesson and open nothing unasked. Never the installed copy. Commit following the project's commit conventions.";
}

/** The reason to hold the stop, or null: an archived entry, or enough commits since the last retrospective. */
export function stopReason({ commits, archived, threshold, alreadyBlocked }) {
  if (alreadyBlocked) return null;
  if (archived > 0) {
    return `${archived} backlog ${archived === 1 ? "entry was" : "entries were"} archived since the last skill retrospective: a piece of work has closed.`;
  }
  if (commits >= threshold) return `${commits} commits since the last skill retrospective: a piece of work has closed.`;
  return null;
}

/**
 * The distinct folders that received a renamed file directly under one of the archive folders, from
 * `git log --name-only` output. Only the first level counts: in a nested archive (archive/<type>/<entry>/) the
 * number is a lower bound, which is enough to know that something closed.
 */
export function archivedFolders(nameOnlyOutput, dirs = DEFAULT_ARCHIVE_DIRS) {
  const folders = new Set();
  for (const line of String(nameOnlyOutput).split(/\r?\n/)) {
    const path = line.trim();
    for (const dir of dirs) {
      if (!path.startsWith(`${dir}/`)) continue;
      const [entry, ...rest] = path.slice(dir.length + 1).split("/");
      if (entry && rest.length) folders.add(entry);
    }
  }
  return folders;
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function main(input, env) {
  const event = JSON.parse(input || "{}");
  const root = projectRoot(env);
  if (!root) return null;
  const dir = stateDir(env);
  const markFile = join(dir, MARK);
  const mark = existsSync(markFile) ? readFileSync(markFile, "utf8").trim() : "";
  if (!mark) {
    writeFileSync(markFile, git(root, ["rev-parse", "HEAD"]) + "\n");
    return null;
  }
  const range = `${mark}..HEAD`;
  const reason = stopReason({
    commits: Number(git(root, ["rev-list", "--count", range])),
    archived: archivedFolders(
      // No pathspec on purpose: limited to the archive path git sees an ADD, since the rename source is outside it.
      git(root, ["log", range, "-M", "--diff-filter=R", "--name-only", "--format="]),
      archiveDirs(env, root),
    ).size,
    threshold: Number(env[COMMITS_ENV]) || DEFAULT_COMMITS,
    alreadyBlocked: event.stop_hook_active === true,
  });
  const usedFile = join(dir, USED);
  const skills = (existsSync(usedFile) ? readFileSync(usedFile, "utf8") : "").split(/\r?\n/).filter(Boolean);
  const text = retroText(reason, skills);
  return text && { decision: "block", reason: text };
}

if (isEntryPoint(import.meta.url)) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try {
      const out = main(input, process.env);
      if (out) process.stdout.write(JSON.stringify(out));
    } catch { /* fail-open */ }
    process.exit(0);
  });
}
