// Tests for antigravity-plugins.mjs against a temp HOME and a temp fake clone.
// Run with:  node --test bootstrap/antigravity-plugins.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "antigravity-plugins.mjs");

/** A fake clone (with its own copy of the script, which finds the clone from its location) and an empty HOME. */
function setup({ withCopy = true } = {}) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "agy-plugins-")));
  const clone = path.join(root, "clone");
  const home = path.join(root, "home");
  mkdirSync(path.join(clone, "bootstrap"), { recursive: true });
  mkdirSync(home);
  copyFileSync(SCRIPT, path.join(clone, "bootstrap", "antigravity-plugins.mjs"));
  for (const p of ["published/workflow/backlog", "published/workflow/savvy-flow", "published/gamedev/gamedev-hair"]) {
    mkdirSync(path.join(clone, p), { recursive: true });
  }
  if (withCopy) mkdirSync(path.join(clone, "published-antigravity/workflow/savvy-flow"), { recursive: true });
  writeFileSync(path.join(clone, "install.config.json"), JSON.stringify({ skills: { backlog: { category: "workflow" } } }));
  const plugins = path.join(home, ".gemini", "config", "plugins.json");
  const exec = (...args) => spawnSync(process.execPath, [path.join(clone, "bootstrap", "antigravity-plugins.mjs"), ...args],
    { encoding: "utf8", env: { ...process.env, HOME: home, USERPROFILE: home } });
  return { root, clone, home, plugins, exec, read: () => JSON.parse(readFileSync(plugins, "utf8")) };
}

const expected = (clone) => [
  { path: path.join(clone, "published/gamedev") },
  { path: path.join(clone, "published/workflow"), exclude: ["savvy-flow"] },
  { path: path.join(clone, "published-antigravity/workflow") },
];

test("a fresh run creates the folder and the file with the computed entries", () => {
  const s = setup();
  const r = s.exec("--no-pull");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(s.read().entries, expected(s.clone));
  assert.ok(!existsSync(`${s.plugins}.bak`), "no backup when there was no file");
  assert.match(r.stdout, /3 added, 0 removed, 0 unchanged/);
  rmSync(s.root, { recursive: true, force: true });
});

test("a merge keeps foreign entries and other top-level keys", () => {
  const s = setup();
  mkdirSync(path.dirname(s.plugins), { recursive: true });
  const foreign = { path: "/somewhere/else", exclude: ["x"] };
  writeFileSync(s.plugins, JSON.stringify({ inherits: [{ path: "/a.json" }], entries: [foreign] }));
  assert.equal(s.exec("--no-pull").status, 0);
  const doc = s.read();
  assert.deepEqual(doc.inherits, [{ path: "/a.json" }]);
  assert.deepEqual(doc.entries, [foreign, ...expected(s.clone)]);
  assert.ok(existsSync(`${s.plugins}.bak`), "the old file is backed up");
  assert.deepEqual(JSON.parse(readFileSync(`${s.plugins}.bak`, "utf8")).entries, [foreign]);
  rmSync(s.root, { recursive: true, force: true });
});

test("stale entries inside the clone are removed or replaced", () => {
  const s = setup({ withCopy: false });
  mkdirSync(path.dirname(s.plugins), { recursive: true });
  const stale = [
    { path: path.join(s.clone, "published/workflow"), exclude: ["old"] },
    { path: path.join(s.clone, "published-antigravity/gone") },
    { path: "/keep/me" },
  ];
  writeFileSync(s.plugins, JSON.stringify({ entries: stale }));
  const r = s.exec("--no-pull");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(s.read().entries, [{ path: "/keep/me" },
    { path: path.join(s.clone, "published/gamedev") }, { path: path.join(s.clone, "published/workflow") }]);
  assert.match(r.stdout, /2 removed/);
  rmSync(s.root, { recursive: true, force: true });
});

test("a second run writes nothing", () => {
  const s = setup();
  assert.equal(s.exec("--no-pull").status, 0);
  const before = statSync(s.plugins).mtimeMs;
  rmSync(`${s.plugins}.bak`, { force: true });
  const r = s.exec("--no-pull");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(statSync(s.plugins).mtimeMs, before);
  assert.ok(!existsSync(`${s.plugins}.bak`), "no new backup either");
  assert.match(r.stdout, /already up to date/);
  assert.match(r.stdout, /0 added, 0 removed, 3 unchanged/);
  rmSync(s.root, { recursive: true, force: true });
});

test("excludes name the plugins with an Antigravity copy and the ones marked plugin:false", () => {
  const s = setup();
  mkdirSync(path.join(s.clone, "published/workflow/not-a-plugin"), { recursive: true });
  writeFileSync(path.join(s.clone, "install.config.json"),
    JSON.stringify({ skills: { "not-a-plugin": { category: "workflow", plugin: false } } }));
  assert.equal(s.exec("--no-pull").status, 0);
  const workflow = s.read().entries.find((e) => e.path.endsWith(path.join("published", "workflow")));
  assert.deepEqual(workflow.exclude, ["not-a-plugin", "savvy-flow"]);
  rmSync(s.root, { recursive: true, force: true });
});

test("--dry-run prints the JSON and writes nothing", () => {
  const s = setup();
  const r = s.exec("--dry-run", "--no-pull");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!existsSync(s.plugins));
  assert.ok(!existsSync(path.dirname(s.plugins)), "not even the folder");
  assert.match(r.stdout, /"exclude": \[\s*"savvy-flow"\s*\]/);
  rmSync(s.root, { recursive: true, force: true });
});

test("without --no-pull a clone that is not a git checkout skips the pull and says why", () => {
  const s = setup();
  const r = s.exec();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /pull: skipped \(not a git checkout\)/);
  rmSync(s.root, { recursive: true, force: true });
});

test("an invalid plugins.json is left alone", () => {
  const s = setup();
  mkdirSync(path.dirname(s.plugins), { recursive: true });
  writeFileSync(s.plugins, "{ nope");
  const r = s.exec("--no-pull");
  assert.equal(r.status, 1);
  assert.equal(readFileSync(s.plugins, "utf8"), "{ nope");
  rmSync(s.root, { recursive: true, force: true });
});
