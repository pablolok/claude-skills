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

test("citation: `wiki` by default, `bare` accepted, any other form fails naming the two", () => {
  assert.equal(parseConfig(null).citation, "wiki");
  assert.equal(parseConfig(JSON.stringify({ citation: "bare" })).citation, "bare");
  assert.throws(() => parseConfig(JSON.stringify({ citation: "[[{id}]]" })), /"citation" must be one of: wiki, bare/);
});

test("words.open names the open section: `Open` by default, the project's word when declared", () => {
  assert.equal(parseConfig(null).words.open, "Open");
  assert.equal(parseConfig(JSON.stringify({ words: { open: "Aperte" } })).words.open, "Aperte");
});

test("github: defaults, a project's labels, close comment and value words merged over them", () => {
  const d = parseConfig(null).github;
  assert.deepEqual(d.labels, {});
  assert.match(d.closeComment, /BACKLOG-HISTORY\.md/);
  const c = parseConfig(JSON.stringify({
    github: { labels: { "priority:high": "priorità:alta" }, closeComment: "Chiusa.", priorityWords: { alta: "high" } },
  })).github;
  assert.equal(c.labels["priority:high"], "priorità:alta");
  assert.equal(c.closeComment, "Chiusa.");
  assert.deepEqual(c.priorityWords, { alta: "high" });
  assert.deepEqual(c.statusWords, {});
});

test("⛔ github: an unknown key, an unknown label, a word mapped to no canonical value fail by name", () => {
  assert.throws(() => parseConfig(JSON.stringify({ github: { label: {} } })), /unknown github key "label"/);
  assert.throws(() => parseConfig(JSON.stringify({ github: { labels: { "priority:urgent": "x" } } })), /unknown github\.labels key "priority:urgent"/);
  assert.throws(() => parseConfig(JSON.stringify({ github: { statusWords: { aperta: "opened" } } })), /github\.statusWords\.aperta.*open, in-progress, blocked/);
  assert.throws(() => parseConfig(JSON.stringify({ github: { priorityWords: { alta: "urgent" } } })), /github\.priorityWords\.alta.*high, medium, low/);
  assert.throws(() => parseConfig(JSON.stringify({ github: { closeComment: " " } })), /github\.closeComment/);
});
