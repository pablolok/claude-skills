#!/usr/bin/env node
/**
 * Stop hook — the moment to run `skill-retrospective`: what the work taught goes back into the skills that served
 * it, rewritten in place, never appended as a log.
 *
 * The turn is held ONCE (never when `stop_hook_active`) when, since the last retrospective, either
 *  - a backlog entry was archived: a folder moved under docs/implementations/archive/ (a convention; a project
 *    without that folder simply never matches), or
 *  - at least SKILL_RETRO_COMMITS commits (default 8) piled up — a long piece of work.
 *
 * The last retrospective is the commit in .claude/.state/last-retrospective (the skill writes it); the skills used
 * are in .claude/.state/skills-used.txt (log-skill-use.mjs). With no baseline the hook writes HEAD as the baseline and
 * says nothing: counting the whole history would hold the first turn on a new machine for nothing.
 * Fail-open: any error (no git, no commits, unreadable input) exits 0 with no output.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { MARK, USED, projectRoot, stateDir } from "./state.mjs";

export const DEFAULT_COMMITS = 8;
export const COMMITS_ENV = "SKILL_RETRO_COMMITS";
const ARCHIVE = /^docs\/implementations\/archive\/([^/]+)\//;

/** What to tell the model: run the retrospective on these skills (null when there is nothing to say). */
export function retroText(reason, skills) {
  if (!reason) return null;
  const list = skills.length ? skills.join(", ") : "the skills the work used (see git log since the last retrospective)";
  return `${reason} Before the next piece of work, run the skill-retrospective skill on: ${list}. ` +
    "Rewrite those skills in place with what this work taught — fix the step, delete what proved wrong or useless, " +
    "keep them short — never append a lessons log. Project lessons go in the project's skills, general ones stay " +
    "generic in the user-level skills; a skill installed as a copy is changed at its source.";
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

/** The distinct archive folders that received a renamed file, from `git log --name-only` output. */
export function archivedFolders(nameOnlyOutput) {
  const folders = new Set();
  for (const line of String(nameOnlyOutput).split(/\r?\n/)) {
    const match = line.trim().match(ARCHIVE);
    if (match) folders.add(match[1]);
  }
  return folders;
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function main(input, env) {
  const event = JSON.parse(input || "{}");
  const root = projectRoot(env);
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
    ).size,
    threshold: Number(env[COMMITS_ENV]) || DEFAULT_COMMITS,
    alreadyBlocked: event.stop_hook_active === true,
  });
  const usedFile = join(dir, USED);
  const skills = (existsSync(usedFile) ? readFileSync(usedFile, "utf8") : "").split(/\r?\n/).filter(Boolean);
  const text = retroText(reason, skills);
  return text && { decision: "block", reason: text };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
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
