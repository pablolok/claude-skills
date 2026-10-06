/**
 * Where the project is, and where the retrospective keeps its state (`.claude/.state/`).
 *
 * `process.cwd()` is NOT the project: the shell the model works in drifts into subfolders, and a hook that trusts
 * it writes its state in the wrong place, silently. These hooks are installed at
 * `<root>/.claude/skills/skill-retrospective/hooks/`, four folders below the project, which does not move;
 * `CLAUDE_PROJECT_DIR`, when the harness sets it, is the same place and wins (tests point it at a temporary folder).
 *
 * The state folder ignores itself (a `.gitignore` holding `*`), so installing the skill never has to edit the
 * project's own `.gitignore`: the state is per machine and never belongs in git.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The last retrospective's commit; the skill writes it. */
export const MARK = "last-retrospective";
/** The skills used since then, one per line; the skill empties it. */
export const USED = "skills-used.txt";

/** The project root: `CLAUDE_PROJECT_DIR`, else the folder four above the hooks. */
export function projectRoot(env = process.env) {
  if (env.CLAUDE_PROJECT_DIR) return env.CLAUDE_PROJECT_DIR;
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

/** The state folder, created on first use together with the `.gitignore` that keeps it out of git. */
export function stateDir(env = process.env) {
  const dir = join(projectRoot(env), ".claude", ".state");
  mkdirSync(dir, { recursive: true });
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
  return dir;
}
