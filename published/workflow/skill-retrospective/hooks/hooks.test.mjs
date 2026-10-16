// node --test skills/skill-retrospective/hooks/hooks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isNew, skillName } from "./log-skill-use.mjs";
import { projectRoot, stateDir } from "./state.mjs";
import { isEntryPoint } from "./entry-point.mjs";

const HOOKS = dirname(fileURLToPath(import.meta.url));

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
  try {
    const stdout = execFileSync("node", [join(HOOKS, hook)], {
      input: JSON.stringify(payload), env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...extraEnv }, encoding: "utf8",
    });
    return stdout;
  } catch (error) {
    assert.fail(`${hook} must exit 0: ${error.message}`);
  }
}

test("end to end: each skill run is logged once, under the project, without its plugin prefix", () => {
  const root = mkdtempSync(join(tmpdir(), "retro-e2e-"));
  try {
    for (const skill of ["backlog", "backlog:backlog", "verification-gates"]) {
      assert.equal(run("log-skill-use.mjs", { tool_input: { skill } }, root), "");
    }
    const logged = readFileSync(join(root, ".claude", ".state", "skills-used.txt"), "utf8");
    assert.equal(logged, "backlog\nverification-gates\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the plugin wires no Stop hook: the retrospective is asked for by the close of the work, never by a held turn", () => {
  const entry = JSON.parse(readFileSync(join(HOOKS, "..", "plugin-entry.json"), "utf8"));
  assert.deepEqual(Object.keys(entry.hooks), ["PostToolUse"]);
  assert.equal(existsSync(join(HOOKS, "retrospective-hint.mjs")), false);
});

test("⭐ without CLAUDE_PROJECT_DIR the hook exits 0 and write no state anywhere", () => {
  // The hooks run from the plugin cache: copied four folders deep, where an old fallback would take the project.
  const sandbox = mkdtempSync(join(tmpdir(), "retro-noproject-"));
  const hooks = join(sandbox, "cache", "a", "b", "c", "hooks");
  cpSync(HOOKS, hooks, { recursive: true });
  const cwd = join(sandbox, "shell");
  mkdirSync(cwd);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "CLAUDE_PROJECT_DIR"));
  const payloads = { "log-skill-use.mjs": { tool_input: { skill: "backlog" } } };
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

test("a hook started through a symbolic link still runs; an imported module never takes itself for the hook", (t) => {
  // Not resolved on purpose: on macOS the temporary folder itself sits behind a link.
  const root = mkdtempSync(join(tmpdir(), "retro-entry-point-"));
  try {
    const real = join(root, "real");
    mkdirSync(real);
    writeFileSync(join(real, "hook.mjs"), "");
    writeFileSync(join(real, "other.mjs"), "");
    const url = pathToFileURL(join(real, "hook.mjs")).href;
    assert.equal(isEntryPoint(url, join(real, "hook.mjs")), true);
    assert.equal(isEntryPoint(pathToFileURL(join(real, "other.mjs")).href, join(real, "hook.mjs")), false);
    assert.equal(isEntryPoint(url, undefined), false);
    try {
      symlinkSync(real, join(root, "link"), "junction"); // a junction needs no privilege on Windows
    } catch {
      return t.skip("this system refuses to create the link");
    }
    assert.equal(isEntryPoint(url, join(root, "link", "hook.mjs")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
