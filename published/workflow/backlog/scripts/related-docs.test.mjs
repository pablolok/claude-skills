/**
 * Tests of `related-docs.mjs`: the pure rule (`toCheck`) and the git read (`change`) with a fake —
 * plus one subprocess test for the property only the whole program has: it always exits 0.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { change, describesThePast, toCheck } from "./related-docs.mjs";

const scenario = (over = {}) => ({
  namesFile: new Map([
    ["docs/architecture/player.md", new Set(["src/player/Player.ts"])],
    ["docs/guides/b.md", new Set(["src/enemies/Slime.ts"])],
  ]),
  citesEntry: new Map([
    ["docs/architecture/player.md", new Set(["BKLG-001"])],
    ["docs/implementations/bugs/x/plan.md", new Set(["BKLG-001", "BKLG-009"])],
  ]),
  changedSources: ["src/player/Player.ts"],
  changedDocs: new Set(),
  touchedEntries: new Set(["BKLG-001"]),
  ...over,
});

test("lists the docs that cite the entry being worked on", () => {
  assert.deepEqual(toCheck(scenario()).perEntry, ["docs/architecture/player.md", "docs/implementations/bugs/x/plan.md"]);
});

test("control: another entry lists nothing", () => {
  assert.deepEqual(toCheck(scenario({ touchedEntries: new Set(["BKLG-077"]) })).perEntry, []);
});

test("a doc UPDATED in the change is not listed — whoever changed it already looked", () => {
  const { perEntry } = toCheck(scenario({ changedDocs: new Set(["docs/architecture/player.md"]) }));
  assert.deepEqual(perEntry, ["docs/implementations/bugs/x/plan.md"]);
});

test("a doc naming a touched file is in the files list", () => {
  assert.deepEqual(toCheck(scenario({ citesEntry: new Map(), touchedEntries: new Set() })).perFile, ["docs/architecture/player.md"]);
});

test("a doc in BOTH lists appears once, in the stronger one", () => {
  const { perEntry, perFile } = toCheck(scenario());
  assert.ok(perEntry.includes("docs/architecture/player.md"));
  assert.ok(!perFile.includes("docs/architecture/player.md"));
});

test("docs describing the PAST are excluded by construction", () => {
  assert.ok(describesThePast("docs/implementations/BACKLOG-HISTORY.md"));
  assert.ok(describesThePast("docs/implementations/archive/x/plan.md"));
  // Control: a LIVE doc is not excluded.
  assert.ok(!describesThePast("docs/architecture/player.md"));
  assert.ok(!describesThePast("docs/implementations/bugs/x/plan.md"));
});

test("a rename counts with the NEW name", () => {
  const { files } = change(null, () => "R  src/Old.ts -> src/New.ts\n M docs/a.md\n");
  assert.deepEqual(files, ["src/New.ts", "docs/a.md"]);
});

test("· a quoted path (spaces) is unquoted", () => {
  const { files } = change(null, () => ' M "assets/Level 5.png"\n');
  assert.deepEqual(files, ["assets/Level 5.png"]);
});

test("with no changes it invents nothing", () => {
  const { files, message } = change(null, () => "");
  assert.deepEqual(files, []);
  assert.equal(message, "");
});

/**
 * The only test running the whole script: the property under test IS the exit code. `toCheck`
 * would stay identical if someone put a `return 1` back, and every test above would still pass.
 * It asserts nothing about WHAT is printed — that depends on the repo's current docs.
 */
test("exits 0 on a real commit (HEAD), and lists the doc naming the file it touched", () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), "related-docs.mjs");
  const root = mkdtempSync(join(tmpdir(), "related-docs-"));
  try {
    const write = (rel, text) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    };
    const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
    git("init", "-q");
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "t");
    write("src/billing/invoice.ts", "export {}\n");
    write("docs/architecture/billing.md", "Invoices live in `billing/invoice.ts`.\n");
    git("add", ".");
    git("commit", "-q", "-m", "first");
    write("src/billing/invoice.ts", "export const x = 1;\n");
    git("commit", "-q", "-am", "touch the invoice");
    const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
    const output = execFileSync(process.execPath, [script, "HEAD"], { encoding: "utf8", cwd: tmpdir(), env });
    assert.match(output, /docs\/architecture\/billing\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
