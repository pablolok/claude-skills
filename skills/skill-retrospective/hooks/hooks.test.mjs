// node --test skills/skill-retrospective/hooks/hooks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  archiveDirs, archivedFolders, retroText, stopReason, ARCHIVE_ENV, DEFAULT_ARCHIVE_DIRS, DEFAULT_COMMITS,
} from "./retrospective-hint.mjs";
import { isNew, skillName } from "./log-skill-use.mjs";
import { projectRoot, stateDir } from "./state.mjs";

const HOOKS = dirname(fileURLToPath(import.meta.url));
const quiet = { commits: 0, archived: 0, threshold: DEFAULT_COMMITS, alreadyBlocked: false };

test("a stop asks for the retrospective once enough commits piled up", () => {
  assert.equal(stopReason({ ...quiet, commits: DEFAULT_COMMITS - 1 }), null);
  assert.match(stopReason({ ...quiet, commits: DEFAULT_COMMITS }), /8 commits/);
});

test("an archived entry asks for it whatever the commit count", () => {
  assert.match(stopReason({ ...quiet, archived: 1 }), /1 backlog entry was archived/);
  assert.match(stopReason({ ...quiet, archived: 2 }), /2 backlog entries were archived/);
});

test("a stop already blocked by the hook is let through (no loop)", () => {
  assert.equal(stopReason({ ...quiet, commits: 50, archived: 3, alreadyBlocked: true }), null);
});

test("the request names the skills to rewrite and forbids a lessons log", () => {
  const text = retroText("Done.", ["backlog", "refactor"]);
  assert.match(text, /backlog, refactor/);
  assert.match(text, /never append a lessons log/);
  assert.equal(retroText(null, ["x"]), null);
  assert.match(retroText("Done.", []), /git log/);
});

test("a general lesson goes to the skill's source — for a plugin, the skill repository it comes from — and is " +
  "committed the project's way", () => {
  const text = retroText("Done.", ["backlog"]);
  assert.match(text, /skill repository the plugin comes from/);
  assert.match(text, /an issue there/);
  assert.match(text, /project's commit conventions/);
  assert.doesNotMatch(text, /user-level skills/, "a collaborator's lessons on a plugin do not go to their own ~/.claude");
});

test("only a file moved INTO the archive counts, once per folder", () => {
  const out = [
    "docs/implementations/archive/old-bug/plan.md",
    "docs/implementations/archive/old-bug/notes.md",
    "docs/implementations/archive/feature-x/spec.md",
    "docs/implementations/BACKLOG.md",
  ].join("\n");
  assert.deepEqual([...archivedFolders(out)].sort(), ["feature-x", "old-bug"]);
  assert.equal(archivedFolders("docs/architecture/x.md").size, 0);
});

test("the archive folders come from SKILL_RETRO_ARCHIVE_DIRS, normalized, with the default when unset", () => {
  assert.deepEqual(archiveDirs({}), DEFAULT_ARCHIVE_DIRS);
  assert.deepEqual(archiveDirs({ [ARCHIVE_ENV]: " , " }), DEFAULT_ARCHIVE_DIRS);
  assert.deepEqual(archiveDirs({ [ARCHIVE_ENV]: "Tasks\\archive\\, /old/done/" }), ["Tasks/archive", "old/done"]);
});

/** A project folder whose `.claude/backlog.json` holds `text` (none when null). */
function projectWithBacklogConfig(text) {
  const root = mkdtempSync(join(tmpdir(), "retro-backlog-cfg-"));
  if (text !== null) {
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude/backlog.json"), text);
  }
  return root;
}

test("the archive folder follows the project's backlog docsDir; SKILL_RETRO_ARCHIVE_DIRS still wins", () => {
  const root = projectWithBacklogConfig(JSON.stringify({ docsDir: "handbook\\backlog/" }));
  assert.deepEqual(archiveDirs({}, root), ["handbook/backlog/archive"]);
  assert.deepEqual(archiveDirs({ [ARCHIVE_ENV]: "Tasks/archive" }, root), ["Tasks/archive"]);
});

test("· no backlog config, one without docsDir, or one that does not parse: the default", () => {
  assert.deepEqual(archiveDirs({}, projectWithBacklogConfig(null)), DEFAULT_ARCHIVE_DIRS);
  assert.deepEqual(archiveDirs({}, projectWithBacklogConfig(JSON.stringify({ pastPaths: [] }))), DEFAULT_ARCHIVE_DIRS);
  assert.deepEqual(archiveDirs({}, projectWithBacklogConfig("{ not json")), DEFAULT_ARCHIVE_DIRS);
  assert.deepEqual(archiveDirs({}, projectWithBacklogConfig(JSON.stringify({ docsDir: 3 }))), DEFAULT_ARCHIVE_DIRS);
});

test("a configured archive folder counts its first-level folders, and only those", () => {
  const out = [
    "Tasks/archive/bugs/EU-1-x/TASK.md",
    "Tasks/archive/epics/EU-2/bugs/EU-3-y/TASK.md",
    "Tasks/archive/README.md",
    "docs/implementations/archive/old-bug/plan.md",
  ].join("\n");
  assert.deepEqual([...archivedFolders(out, ["Tasks/archive"])].sort(), ["bugs", "epics"]);
  assert.equal(archivedFolders(out, ["Tasks/archived"]).size, 0);
});

test("the skill log keeps each name once and drops plugin prefixes", () => {
  assert.equal(skillName({ skill: "superpowers:brainstorming" }), "brainstorming");
  assert.equal(skillName(undefined), "");
  assert.equal(isNew("a\nb\n", "b"), false);
  assert.equal(isNew("a\n", "b"), true);
  assert.equal(isNew("", ""), false);
});

test("⭐ the project is CLAUDE_PROJECT_DIR alone — NOT the shell's folder, NOT the hooks' folder", () => {
  const before = process.cwd();
  try {
    process.chdir(tmpdir());
    assert.equal(projectRoot({ CLAUDE_PROJECT_DIR: "/x" }), "/x");
    assert.equal(projectRoot({}), undefined);
    assert.equal(projectRoot({ CLAUDE_PROJECT_DIR: "" }), undefined);
  } finally {
    process.chdir(before);
  }
});

test("the state folder keeps itself out of git", () => {
  const root = mkdtempSync(join(tmpdir(), "retro-"));
  const dir = stateDir({ CLAUDE_PROJECT_DIR: root });
  assert.equal(readFileSync(join(dir, ".gitignore"), "utf8"), "*\n");
});

function run(hook, payload, root, extraEnv = {}) {
  // the machine's own SKILL_RETRO_* settings must not leak into the hook under test
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("SKILL_RETRO_")));
  try {
    const stdout = execFileSync("node", [join(HOOKS, hook)], {
      input: JSON.stringify(payload), env: { ...inherited, CLAUDE_PROJECT_DIR: root, ...extraEnv }, encoding: "utf8",
    });
    return stdout;
  } catch (error) {
    assert.fail(`${hook} must exit 0: ${error.message}`);
  }
}

test("end to end: logged skills, a silent first stop, a held stop after an archive, released the second time", () => {
  const root = mkdtempSync(join(tmpdir(), "retro-e2e-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(root, "docs/implementations/features/x"), { recursive: true });
  writeFileSync(join(root, "docs/implementations/features/x/spec.md"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "init");

  run("log-skill-use.mjs", { tool_input: { skill: "plugin:backlog" } }, root);
  run("log-skill-use.mjs", { tool_input: { skill: "backlog" } }, root);
  assert.equal(readFileSync(join(root, ".claude/.state/skills-used.txt"), "utf8"), "backlog\n");

  assert.equal(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root), "");
  assert.ok(existsSync(join(root, ".claude/.state/last-retrospective")));

  mkdirSync(join(root, "docs/implementations/archive"), { recursive: true });
  git("mv", "docs/implementations/features/x", "docs/implementations/archive/x");
  git("commit", "-qm", "close");
  const held = JSON.parse(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root));
  assert.equal(held.decision, "block");
  assert.match(held.reason, /skill-retrospective skill on: backlog/);

  assert.equal(run("retrospective-hint.mjs", { hook_event_name: "Stop", stop_hook_active: true }, root), "");
});

test("end to end: an archive under SKILL_RETRO_ARCHIVE_DIRS holds the stop, the default folder alone does not", () => {
  const root = mkdtempSync(join(tmpdir(), "retro-cfg-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(root, "Tasks/bugs/EU-1-x"), { recursive: true });
  writeFileSync(join(root, "Tasks/bugs/EU-1-x/TASK.md"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "init");
  const cfg = { [ARCHIVE_ENV]: "Tasks/archive" };
  assert.equal(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root, cfg), "");

  mkdirSync(join(root, "Tasks/archive/bugs"), { recursive: true });
  git("mv", "Tasks/bugs/EU-1-x", "Tasks/archive/bugs/EU-1-x");
  git("commit", "-qm", "archive");
  assert.equal(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root), "");
  const held = JSON.parse(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root, cfg));
  assert.equal(held.decision, "block");
  assert.match(held.reason, /1 backlog entry was archived/);
});

test("end to end: an archive under the backlog's docsDir holds the stop, with no environment variable", () => {
  const root = mkdtempSync(join(tmpdir(), "retro-docsdir-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(join(root, ".claude/backlog.json"), JSON.stringify({ docsDir: "handbook/backlog" }));
  mkdirSync(join(root, "handbook/backlog/bugs/x"), { recursive: true });
  writeFileSync(join(root, "handbook/backlog/bugs/x/plan.md"), "a\n");
  git("add", "-A");
  git("commit", "-qm", "init");
  assert.equal(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root), "");

  mkdirSync(join(root, "handbook/backlog/archive"), { recursive: true });
  git("mv", "handbook/backlog/bugs/x", "handbook/backlog/archive/x");
  git("commit", "-qm", "close");
  const held = JSON.parse(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root));
  assert.equal(held.decision, "block");
  assert.match(held.reason, /1 backlog entry was archived/);
});

test("outside a git repository the stop hook stays silent (fail-open)", () => {
  const root = mkdtempSync(join(tmpdir(), "retro-nogit-"));
  assert.equal(run("retrospective-hint.mjs", { hook_event_name: "Stop" }, root), "");
});

test("⭐ without CLAUDE_PROJECT_DIR both hooks exit 0 and write no state anywhere", () => {
  // The hooks run from the plugin cache: copied four folders deep, where an old fallback would take the project.
  const sandbox = mkdtempSync(join(tmpdir(), "retro-noproject-"));
  const hooks = join(sandbox, "cache", "a", "b", "c", "hooks");
  cpSync(HOOKS, hooks, { recursive: true });
  const cwd = join(sandbox, "shell");
  mkdirSync(cwd);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "CLAUDE_PROJECT_DIR"));
  const payloads = { "log-skill-use.mjs": { tool_input: { skill: "backlog" } }, "retrospective-hint.mjs": { hook_event_name: "Stop" } };
  for (const [hook, payload] of Object.entries(payloads)) {
    const stdout = execFileSync("node", [join(hooks, hook)], { input: JSON.stringify(payload), env, cwd, encoding: "utf8" });
    assert.equal(stdout, "", hook);
  }
  for (const place of [join(sandbox, "cache"), cwd]) {
    assert.equal(existsSync(join(place, ".claude")), false, `state written under ${place}`);
  }
  assert.equal(projectRoot({}), undefined);
  assert.equal(stateDir({}), null);
});
