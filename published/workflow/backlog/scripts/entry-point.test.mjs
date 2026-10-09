/**
 * Tests of `entry-point`: a script knows it was started — directly or through a symbolic link — and an import
 * never takes itself for the script.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isEntryPoint } from "./entry-point.mjs";

/** A link to `target` at `at`, or `null` where the system refuses one (a junction needs no privilege on Windows). */
function linkOrNull(target, at) {
  try {
    symlinkSync(target, at, "junction"); // the type is ignored outside Windows
    return at;
  } catch {
    return null;
  }
}

/** A folder holding `script.mjs` and `other.mjs`, and a link to it. */
function withLinkedFolder(fn) {
  // Not resolved on purpose: on macOS the temporary folder itself sits behind a link.
  const root = mkdtempSync(path.join(tmpdir(), "backlog-entry-point-"));
  try {
    const real = path.join(root, "real");
    mkdirSync(real);
    writeFileSync(path.join(real, "script.mjs"), "");
    writeFileSync(path.join(real, "other.mjs"), "");
    fn({ real, linked: linkOrNull(real, path.join(root, "link")) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("the script started by its own path is the entry point", () => {
  withLinkedFolder(({ real }) => {
    const script = path.join(real, "script.mjs");
    assert.equal(isEntryPoint(pathToFileURL(script).href, script), true);
  });
});

test("the script started through a symbolic link is still the entry point", (t) => {
  withLinkedFolder(({ real, linked }) => {
    if (!linked) return t.skip("this system refuses to create the link");
    const url = pathToFileURL(path.join(real, "script.mjs")).href;
    assert.equal(isEntryPoint(url, path.join(linked, "script.mjs")), true);
  });
});

test("a module imported while another script runs is not the entry point", () => {
  withLinkedFolder(({ real }) => {
    const url = pathToFileURL(path.join(real, "other.mjs")).href;
    assert.equal(isEntryPoint(url, path.join(real, "script.mjs")), false);
  });
});

test("no script path, or one that does not resolve, is not the entry point", () => {
  withLinkedFolder(({ real }) => {
    const url = pathToFileURL(path.join(real, "script.mjs")).href;
    assert.equal(isEntryPoint(url, undefined), false);
    assert.equal(isEntryPoint(url, path.join(real, "script")), false);
  });
});
