/** Tests of `dashboard` run as a command: a project with no register is a state for the pane, a failure for the page. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "dashboard.mjs");

function inEmptyProject(fn) {
  const root = mkdtempSync(path.join(tmpdir(), "backlog-dashboard-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const run = (args) => spawnSync("node", [SCRIPT, ...args], { encoding: "utf8", timeout: 20000 });

test("--json in a project with no register answers where the register would be, and succeeds", () => {
  inEmptyProject((root) => {
    const result = run(["--json", "--root", root]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { root, missing: "docs/implementations/BACKLOG.md" });
  });
});

test("the page in a project with no register still refuses to start", () => {
  inEmptyProject((root) => {
    const result = run(["--root", root, "--no-open", "--port", "0"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /no register at docs\/implementations\/BACKLOG\.md/);
  });
});
