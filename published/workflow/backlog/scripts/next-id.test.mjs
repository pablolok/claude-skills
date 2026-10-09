/**
 * Tests of `next-id`: the next entry id comes from the ids the register's own documents CLAIM, and only from them.
 *
 * Each "must count" case sits next to a "must not count" one on the same tree: the failure this command exists to
 * prevent is a mention handing out a wrong number — outside the register (a bridge doc, another project's plan), or
 * inside it (a history line citing another project's entry). A claim is a card heading, a history line, or an activity
 * folder's name; a mention above the highest claim is a warning on stderr, never the next number.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nextId, registerIds, unclaimedWarning } from "./next-id.mjs";
import { parseConfig } from "./project.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "next-id.mjs");

/** `{ "path/file": "contents" }` → a temporary git work tree (git-aware like the gates: new files count too). */
function onTree(files, fn) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "backlog-next-id-")));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    for (const [p, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
      writeFileSync(path.join(root, p), content, "utf8");
    }
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const REGISTER = {
  "docs/implementations/BACKLOG.md": "# Backlog\n\n## Open\n\n## BKLG-004 — the import\n- **Status**: open\n",
  "docs/implementations/BACKLOG-HISTORY.md": "- **BKLG-003** the export — shipped\n",
};

test("the highest claimed id + 1: the registers, the activity folders, the archive", () => {
  onTree({
    ...REGISTER,
    "docs/implementations/features/BKLG-006-sync/spec.md": "# The sync\n",
    "docs/implementations/archive/old/history-2025.md": "- **BKLG-005** the old one — shipped\n",
  }, (root) => {
    const found = registerIds(root, parseConfig(null));
    assert.equal(nextId(found.ids), "BKLG-007");
    assert.equal(found.files, 4, "it must have read every document of the backlog folder");
  });
});

test("a card moved whole into a document of the register still claims its id (## or ###)", () => {
  onTree({
    ...REGISTER,
    "docs/implementations/archive/old/card.md": "### BKLG-008 — the old card\n- **Status**: done\n",
  }, (root) => {
    assert.equal(nextId(registerIds(root, parseConfig(null)).ids), "BKLG-009");
  });
});

test("⛔ a mention INSIDE the register is not a claim: a history line citing another project's entries", () => {
  onTree({
    "docs/implementations/BACKLOG.md": "# Backlog\n\n## Open\n\n## BKLG-101 — the latest\n- **Status**: open\n",
    "docs/implementations/BACKLOG-HISTORY.md": [
      "- **BKLG-100** the sync — shipped, after BKLG-200 and BKLG-207 in the sister project",
      "- **BKLG-099** the import — mirrors their BKLG-202 · [doc](archive/import/plan.md)",
      "",
    ].join("\n"),
    "docs/implementations/features/sync/spec.md": "# The sync\n\nDepends on the sister project's BKLG-206.\n",
  }, (root) => {
    const found = registerIds(root, parseConfig(null));
    assert.equal(nextId(found.ids), "BKLG-102");
    assert.equal(
      unclaimedWarning(found.ids, found.mentioned),
      "BKLG-200…207 mentioned but never claimed — another project's ids?",
    );
  });
});

test("the warning names only the mentions above the highest claim, and stays silent without one", () => {
  assert.equal(unclaimedWarning([3, 4], [1, 2, 3, 4]), null, "a citation of an older entry is not a warning");
  assert.equal(unclaimedWarning([4], [4, 9]), "BKLG-009 mentioned but never claimed — another project's ids?");
  assert.equal(unclaimedWarning([], [12, 5]), "BKLG-005…012 mentioned but never claimed — another project's ids?");
  assert.equal(unclaimedWarning([], []), null);
});

test("⛔ a mention OUTSIDE the backlog folder is not the register's: a bridge doc citing another project's entry", () => {
  onTree({
    ...REGISTER,
    "docs/bridge/other-project.md": "Their BKLG-120 is our dependency.\n",
    "README.md": "See BKLG-099.\n",
  }, (root) => {
    assert.equal(nextId(registerIds(root, parseConfig(null)).ids), "BKLG-005");
  });
});

test("an id claimed only by a folder's name counts: the folder is created before anything cites it", () => {
  onTree({ ...REGISTER, "docs/implementations/bugs/BKLG-009-crash/plan.md": "# The crash\n" }, (root) => {
    assert.equal(nextId(registerIds(root, parseConfig(null)).ids), "BKLG-010");
  });
});

test("the backlog folder is the project's `docsDir`", () => {
  onTree({
    ".claude/backlog.json": JSON.stringify({ docsDir: "handbook/backlog" }),
    "handbook/backlog/BACKLOG.md": "## Open\n\n### BKLG-011 — x\n",
    "docs/implementations/BACKLOG.md": "## Open\n\n### BKLG-040 — another register\n",
  }, (root) => {
    const config = parseConfig(JSON.stringify({ docsDir: "handbook/backlog" }));
    assert.equal(nextId(registerIds(root, config).ids), "BKLG-012");
  });
});

test("an empty register starts at BKLG-001", () => {
  onTree({ "README.md": "BKLG-077 lives elsewhere\n" }, (root) => {
    const found = registerIds(root, parseConfig(null));
    assert.equal(nextId(found.ids), "BKLG-001");
    assert.equal(found.files, 0);
  });
});

test("the command prints the id alone on stdout, run from a subfolder of the project", () => {
  onTree({ ...REGISTER, "src/deep/x.txt": "x\n" }, (root) => {
    const out = execFileSync("node", [SCRIPT], {
      cwd: path.join(root, "src", "deep"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CLAUDE_PROJECT_DIR: "" },
    });
    assert.equal(out.trim(), "BKLG-005");
  });
});

test("the command keeps stdout to the id and warns on stderr about a mention above the highest claim", () => {
  onTree({
    ...REGISTER,
    "docs/implementations/BACKLOG-HISTORY.md": "- **BKLG-003** the export — shipped, like their BKLG-207\n",
  }, (root) => {
    const run = spawnSync("node", [SCRIPT], {
      cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: "" },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout.trim(), "BKLG-005");
    assert.match(run.stderr, /highest: BKLG-004 /);
    assert.match(run.stderr, /BKLG-207 mentioned but never claimed — another project's ids\?/);
  });
});
