/**
 * Tests of `project.mjs`: where the project is, and what its `.claude/backlog.json` may say.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CONFIG_FILE, DEFAULTS, parseConfig, project, projectRoot } from "./project.mjs";

const inTemp = (fn) => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "backlog-project-")));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("no config file: the defaults", () => {
  assert.deepEqual(parseConfig(null), { ...DEFAULTS });
});

test("a config overrides only what it names, and normalises folder strings", () => {
  const c = parseConfig(JSON.stringify({ docsDir: "handbook\\backlog/", lineExtensions: ["gd"] }));
  assert.equal(c.docsDir, "handbook/backlog");
  assert.deepEqual(c.lineExtensions, ["gd"]);
  assert.equal(c.architectureDir, DEFAULTS.architectureDir);
});

test("⛔ an unknown key fails, naming it: a typo silently ignored is a rule silently off", () => {
  assert.throws(() => parseConfig(JSON.stringify({ pathException: {} })), /unknown key "pathException"/);
});

test("the history line's close fields take the project's names: a project closing with `Chiusa` declares it", () => {
  const c = parseConfig(JSON.stringify({ fieldNames: { Done: "Chiusa", Obsolete: "Superata" } }));
  assert.equal(c.fieldNames.Done, "Chiusa");
  assert.equal(c.fieldNames.Obsolete, "Superata");
});

test("⛔ a value of the wrong shape fails", () => {
  assert.throws(() => parseConfig(JSON.stringify({ lineExtensions: "gd" })), /"lineExtensions" has the wrong shape/);
  assert.throws(() => parseConfig(JSON.stringify({ pathExceptions: { "a/b.png": 3 } })), /"pathExceptions"/);
  assert.throws(() => parseConfig(JSON.stringify({ docsDir: "  " })), /"docsDir"/);
  assert.throws(() => parseConfig("[]"), /expected a JSON object/);
});

test("the root is CLAUDE_PROJECT_DIR when the harness sets it", () => {
  inTemp((root) => {
    assert.equal(projectRoot({ CLAUDE_PROJECT_DIR: root }, tmpdir()), path.resolve(root));
  });
});

test("else the git work tree of the cwd, even from a subfolder — never the scripts' own folder", () => {
  inTemp((root) => {
    execFileSync("git", ["init", "-q"], { cwd: root });
    mkdirSync(path.join(root, "src", "deep"), { recursive: true });
    assert.equal(realpathSync(projectRoot({}, path.join(root, "src", "deep"))), root);
  });
});

test("project() reads the register's paths from the config", () => {
  inTemp((root) => {
    mkdirSync(path.join(root, ".claude"));
    writeFileSync(path.join(root, CONFIG_FILE), JSON.stringify({ docsDir: "handbook/backlog" }));
    const p = project({ CLAUDE_PROJECT_DIR: root });
    assert.equal(p.backlog, "handbook/backlog/BACKLOG.md");
    assert.equal(p.history, "handbook/backlog/BACKLOG-HISTORY.md");
  });
});
