/**
 * Where the project is, and where the retrospective keeps its state (`.claude/.state/`).
 *
 * The project is `CLAUDE_PROJECT_DIR`, which the harness sets for every hook (tests point it at a temporary folder),
 * and nothing else. `process.cwd()` is NOT the project: the shell the model works in drifts into subfolders. Nor is
 * the hooks' own folder: they run from the plugin, installed in the user's plugin cache, far from any project.
 * Without `CLAUDE_PROJECT_DIR` there is no project: both hooks do nothing and write no state anywhere (fail-open).
 *
 * The state folder ignores itself (a `.gitignore` holding `*`), so the skill never has to edit the project's own
 * `.gitignore`: the state is per machine and never belongs in git.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The last retrospective's commit; the skill writes it. */
export const MARK = "last-retrospective";
/** The skills used since then, one per line; the skill empties it. */
export const USED = "skills-used.txt";

/** The project root: `CLAUDE_PROJECT_DIR`, or `undefined` when the harness did not set it. */
export function projectRoot(env = process.env) {
  return env.CLAUDE_PROJECT_DIR || undefined;
}

/**
 * The state folder, created on first use together with the `.gitignore` that keeps it out of git; `null`, with
 * nothing created, when there is no project.
 */
export function stateDir(env = process.env) {
  const root = projectRoot(env);
  if (!root) return null;
  const dir = join(root, ".claude", ".state");
  mkdirSync(dir, { recursive: true });
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
  return dir;
}
