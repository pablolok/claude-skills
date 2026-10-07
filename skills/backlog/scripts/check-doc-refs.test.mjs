/**
 * Tests of `check-doc-refs`. Each builds a throwaway tree in the OS temp dir.
 *
 * Every "must not report" case sits next to a "must report" one on the same tree: this gate's real
 * failure mode is answering "0" without having looked.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { findBrokenRefs, orphanFolders } from "./check-doc-refs.mjs";
import { parseConfig } from "./project.mjs";

/** `{ "path/file": "contents" }` → a temporary root. */
function fakeTree(files) {
  const root = mkdtempSync(join(tmpdir(), "check-doc-refs-"));
  for (const [p, content] of Object.entries(files)) {
    const full = join(root, p);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
  }
  return root;
}

const onTree = (files, fn, options) => {
  const root = fakeTree(files);
  try { fn(findBrokenRefs(root, options)); } finally { rmSync(root, { recursive: true, force: true }); }
};

const withFolders = (files, fn) => {
  const root = fakeTree(files);
  try { fn(orphanFolders(root)); } finally { rmSync(root, { recursive: true, force: true }); }
};

const rules = (outcome) => outcome.broken.map((r) => r.rule);
const refs = (outcome) => outcome.broken.map((r) => r.ref);
const ofRule = (outcome, rule) => outcome.broken.filter((r) => r.rule === rule);

test("a broken relative link is found — and a good one is not", () => {
  onTree({
    "src/app/Real.cs": "class Real {}\n",
    "docs/guide.md": "[exists](../src/app/Real.cs) and [does not](../src/app/Ghost.cs)\n",
  }, (outcome) => {
    assert.deepEqual(rules(outcome), ["link"]);
    assert.match(outcome.broken[0].ref, /Ghost/);
    assert.equal(outcome.examined.link, 2, "it must have LOOKED at both");
  });
});

test("· a link to a folder resolves", () => {
  onTree({ "src/app/Real.cs": "x\n", "docs/guide.md": "[scripts](../src/app)\n" }, (outcome) => {
    assert.deepEqual(outcome.broken, []);
    assert.equal(outcome.examined.link, 1);
  });
});

test("archive/ is excluded by construction: it documents the past", () => {
  const broken = "[gone](../src/app/Ghost.cs)\n";
  onTree({ "src/app/Real.cs": "x\n", "docs/implementations/archive/old/plan.md": broken }, (outcome) => {
    assert.equal(outcome.broken.length, 0);
    assert.equal(outcome.examined.link, 0, "it must not even look");
  });
  // Control: THE SAME text outside archive/ is reported.
  onTree({ "src/app/Real.cs": "x\n", "docs/implementations/live/plan.md": broken }, (outcome) => {
    assert.deepEqual(rules(outcome), ["link"]);
  });
});

test("a file:line past the end of the file is found — inside the file is not", () => {
  onTree({
    "src/app/Short.cs": "one\ntwo\nthree\n",
    "docs/note.md": "see src/app/Short.cs:2 and also src/app/Short.cs:99\n",
  }, (outcome) => {
    assert.deepEqual(rules(outcome), ["line"]);
    assert.match(outcome.broken[0].ref, /:99$/);
    assert.equal(outcome.examined.line, 2);
  });
});

test("an ABBREVIATED bare path resolves by suffix, a dead one does not", () => {
  onTree({
    "src/app/Enemies/Spawning/WaveSpawner.cs": "x\n",
    "CLAUDE.md": "lives in `Spawning/WaveSpawner.cs`, not in `Spawning/OldSpawner.cs`\n",
  }, (outcome) => {
    assert.deepEqual(rules(outcome), ["path"], "the abbreviation is NOT a dead path");
    assert.deepEqual(refs(outcome), ["Spawning/OldSpawner.cs"]);
    assert.equal(outcome.examined.path, 2);
  });
});

test("· asset paths are checked too, a project's own kinds once declared", () => {
  const files = {
    "public/img/logo.png": "x\n",
    "assets/enemies/Slime.prefab": "x\n",
    ".claude/skills/x/SKILL.md": "use `img/logo.png`, `img/ghost.png`, `enemies/Slime.prefab` and `enemies/Ghost.prefab`\n",
  };
  onTree(files, (outcome) => {
    assert.deepEqual(refs(outcome), ["img/ghost.png"]);
  });
  const config = parseConfig(JSON.stringify({ assetExtensions: ["prefab"] }));
  onTree(files, (outcome) => {
    assert.deepEqual(refs(outcome), ["img/ghost.png", "enemies/Ghost.prefab"]);
  }, { config });
});

test("· the project's pathExceptions are excused with their reason", () => {
  const config = parseConfig(JSON.stringify({ pathExceptions: { "local/notes.md": "each machine's own notes: git-ignored" } }));
  onTree({ "CLAUDE.md": "keep yours in `local/notes.md`\n" }, (outcome) => {
    assert.equal(outcome.broken.length, 0);
    assert.equal(outcome.excused[0].reason, "each machine's own notes: git-ignored");
  }, { config });
});

test("bare paths are checked ONLY where they are instructions or describe the present", () => {
  const text = "the file `src/app/Ghost.cs` does not exist\n";
  onTree({ "src/app/Real.cs": "x\n", "docs/implementations/BACKLOG.md": text }, (outcome) => {
    assert.equal(outcome.broken.length, 0, "a register cites deleted files on purpose");
    assert.equal(outcome.examined.path, 0);
  });
  // Control: the same sentence in each in-scope place is reported.
  for (const doc of ["CLAUDE.md", "AGENTS.md", ".claude/skills/s/SKILL.md", "docs/architecture/combat.md"]) {
    onTree({ "src/app/Real.cs": "x\n", [doc]: text }, (outcome) => {
      assert.deepEqual(rules(outcome), ["path"], doc);
    });
  }
  // A project's instructionPaths join the scope; without them a guide is not judged.
  onTree({ "src/app/Real.cs": "x\n", "docs/guides/how.md": text }, (outcome) => {
    assert.equal(outcome.examined.path, 0);
  });
  const config = parseConfig(JSON.stringify({ instructionPaths: ["docs/guides/"] }));
  onTree({ "src/app/Real.cs": "x\n", "docs/guides/how.md": text }, (outcome) => {
    assert.deepEqual(rules(outcome), ["path"]);
  }, { config });
});

test("a regex between backticks is not a markdown link", () => {
  onTree({ "src/app/Real.cs": "x\n", "docs/note.md": "the capture is `[^\"']+` and nothing else\n" }, (outcome) => {
    assert.equal(outcome.broken.length, 0);
  });
});

test("inside a fenced block links are not read", () => {
  onTree({ "docs/note.md": "```cs\nvar r = \"[x](nowhere.cs)\";\n```\n" }, (outcome) => {
    assert.equal(outcome.broken.length, 0);
    assert.equal(outcome.examined.link, 0);
  });
});

test("a declared exception is EXCUSED, and appears in the looked-at list", () => {
  const exceptions = new Map([["src/app/Template.cs", "a TEMPLATE name the guide tells you to create"]]);
  onTree({ "CLAUDE.md": "create `src/app/Template.cs`\n" }, (outcome) => {
    assert.equal(outcome.broken.length, 0);
    assert.equal(outcome.excused.length, 1);
    assert.equal(outcome.excused[0].ref, "src/app/Template.cs");
    assert.ok(outcome.excused[0].reason.length > 0, "an excuse without a reason is not one");
  }, { exceptions });
  // Control: without the exception the same path is broken.
  onTree({ "CLAUDE.md": "create `src/app/Template.cs`\n" }, (outcome) => {
    assert.deepEqual(rules(outcome), ["path"]);
  });
});

// ── Rule 4: citations ────────────────────────────────────────────────────────────────────────────

test("a bare entry mention in a live doc is reported; a citation is counted", () => {
  onTree({ "docs/architecture/combat.md": "opened by BKLG-001, closed by [[BKLG-002]]\n" }, (outcome) => {
    assert.deepEqual(rules(outcome), ["citation"]);
    assert.equal(outcome.examined.entry, 1);
  });
});

test("⛔ the history register keeps its bare ids", () => {
  onTree({ "docs/implementations/BACKLOG-HISTORY.md": "- **BKLG-001** done — followed up by BKLG-002\n" }, (outcome) => {
    assert.deepEqual(outcome.broken, []);
  });
});

// ── Rule 5: folder ⟺ card ────────────────────────────────────────────────────────────────────────

test("a folder no OPEN entry claims is an orphan — a claimed one is not", () => {
  withFolders({
    "docs/implementations/BACKLOG.md":
      "## Pending verification\nNothing pending.\n\n## Open\n\n## BKLG-001 — live\n- **Doc**: [bugs/live/plan.md](bugs/live/plan.md)\n",
    "docs/implementations/bugs/live/plan.md": "# live\n",
    "docs/implementations/bugs/orphan/plan.md": "# orphan\n",
  }, (outcome) => {
    assert.deepEqual(outcome.orphans, ["bugs/orphan"]);
    // Control: if the live one came out orphan too, the gate would not be reading.
    assert.deepEqual(outcome.claimed, ["bugs/live"]);
  });
});

test("a mention OUTSIDE the Open section does not claim: that is how a folder gets left behind", () => {
  withFolders({
    "docs/implementations/BACKLOG.md":
      "## Pending verification\n- **Playtest**: bugs/closed — check\n\n## Open\n\n## BKLG-002 — other\n- **Doc**: —\n",
    "docs/implementations/bugs/closed/plan.md": "# closed\n",
  }, (outcome) => {
    assert.deepEqual(outcome.orphans, ["bugs/closed"]);
  });
});

test("archive/ is not an activity kind: it is the other half of the invariant", () => {
  withFolders({
    "docs/implementations/BACKLOG.md": "## Open\n",
    "docs/implementations/archive/old/plan.md": "# old\n",
  }, (outcome) => {
    assert.deepEqual(outcome.orphans, []);
    assert.equal(outcome.registerRead, true, "without a register the green is worth nothing");
  });
});

test("without BACKLOG.md the gate SAYS so instead of saying zero", () => {
  withFolders({ "docs/implementations/bugs/something/plan.md": "# x\n" }, (outcome) => {
    assert.equal(outcome.registerRead, false);
    assert.deepEqual(outcome.orphans, []);
  });
});

// ── file:line calibration ────────────────────────────────────────────────────────────────────────

test("· an ABBREVIATED path with a line is judged, and a line past the end is red", () => {
  onTree({
    "src/app/Player/CartController.cs": "a\nb\nc\n",
    "docs/architecture/player.md": "see `Player/CartController.cs:400`",
  }, (outcome) => {
    assert.equal(outcome.examined.line, 1, "it must have READ it: the control case");
    assert.equal(ofRule(outcome, "line").length, 1);
  });
});

test("· and the same reference with an existing line is NOT red", () => {
  onTree({
    "src/app/Player/CartController.cs": "a\nb\nc\n",
    "docs/architecture/player.md": "see `Player/CartController.cs:2`",
  }, (outcome) => {
    assert.equal(outcome.examined.line, 1);
    assert.deepEqual(ofRule(outcome, "line"), []);
  });
});

test("⛔ an AMBIGUOUS path is not judged: it is counted", () => {
  onTree({
    "src/app/A/Health.cs": "x\n",
    "src/app/B/Health.cs": "x\n",
    "docs/architecture/doc.md": "see `Health.cs:900`",
  }, (outcome) => {
    assert.equal(outcome.examined.line, 0);
    assert.equal(outcome.examined.lineUnresolved, 1);
    assert.deepEqual(ofRule(outcome, "line"), []);
  });
});

test("⛔ a file that no longer exists is not judged: usually a rename told in the past", () => {
  onTree({ "docs/architecture/doc.md": "see `Never/Existed.cs:3`" }, (outcome) => {
    assert.equal(outcome.examined.lineUnresolved, 1);
    assert.deepEqual(ofRule(outcome, "line"), []);
  });
});

test("⛔ the history register leaves the rule: it says where the code was AT CLOSING", () => {
  onTree({
    "src/app/X.cs": "a\n",
    "docs/implementations/BACKLOG-HISTORY.md": "back then it was at `Scripts/X.cs:400`",
  }, (outcome) => {
    assert.equal(outcome.examined.line, 0);
    assert.deepEqual(ofRule(outcome, "line"), []);
  });
});

test("⚠️ DECLARED LIMIT: a pointer that slipped INSIDE the file passes", () => {
  onTree({
    "src/app/X.cs": "a\nb\nc\nd\ne\n",
    "docs/architecture/doc.md": "see `Scripts/X.cs:5`",
  }, (outcome) => assert.deepEqual(ofRule(outcome, "line"), []));
});
