/**
 * Tests of `docIndex.mjs` — the shared vocabulary of the doc gates.
 * Run with the built-in runner: `node --test <skill>/scripts/` (no package.json needed).
 *
 * Every "must not match" case sits next to a "must match" control: the failure mode of these tools
 * is not a false alarm, it is a silent "0" that never looked.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BARE,
  FILE_LINE,
  allFiles,
  bareMentions,
  citedEntries,
  createResolver,
  describesThePast,
  docIndex,
  namedFiles,
  vocabulary,
} from "./docIndex.mjs";
import { parseConfig } from "./project.mjs";

const sources = new Set([
  "src/billing/InvoiceService.ts",
  "src/orders/queue/OrderQueue.py",
  "public/img/logo.png",
  "scripts/tools/report.mjs",
]);
const resolve = createResolver(sources);

test("the three reference shapes are all recognised", () => {
  const text = [
    "a link [to the service](src/billing/InvoiceService.ts) and",
    "a pointer src/orders/queue/OrderQueue.py:42 and",
    "a bare path `scripts/tools/report.mjs` and an image `img/logo.png`.",
  ].join("\n");
  assert.deepEqual([...namedFiles(text, resolve)].sort(), [
    "public/img/logo.png",
    "scripts/tools/report.mjs",
    "src/billing/InvoiceService.ts",
    "src/orders/queue/OrderQueue.py",
  ]);
});

test("an ABBREVIATED path resolves by suffix", () => {
  assert.equal(resolve("queue/OrderQueue.py"), "src/orders/queue/OrderQueue.py");
});

test("⛔ but only when the candidate is ONE: two candidates are an ambiguity", () => {
  const ambiguous = new Set(["src/a/health.ts", "src/b/health.ts"]);
  assert.equal(createResolver(ambiguous)("health.ts"), null);
  assert.equal(createResolver(new Set(["src/a/health.ts"]))("health.ts"), "src/a/health.ts");
});

test("· a `#anchor` does not prevent resolution", () => {
  assert.equal(resolve("src/billing/InvoiceService.ts#L10"), "src/billing/InvoiceService.ts");
});

test("· a file that does not exist is not invented", () => {
  assert.equal(resolve("src/Invented.ts"), null);
});

test("docs describing the PAST are excluded — with the control case", () => {
  for (const p of ["docs/implementations/BACKLOG-HISTORY.md", "docs/implementations/archive/x/plan.md"]) {
    assert.equal(describesThePast(p), true, p);
  }
  // Control: a LIVE doc is not excluded — otherwise "0 excluded" and "did not look" read the same.
  assert.equal(describesThePast("docs/architecture/billing.md"), false);
  assert.equal(describesThePast("docs/implementations/BACKLOG.md"), false);
  assert.equal(describesThePast("docs/implementations/features/x/spec.md"), false);
});

test("· a project's pastPaths widen the past, and only for that project", () => {
  const config = parseConfig(JSON.stringify({ pastPaths: ["docs/old-notes/"] }));
  assert.equal(describesThePast("docs/old-notes/y.md", config), true);
  assert.equal(describesThePast("docs/old-notes/y.md"), false);
});

test("a citation is the DOUBLE BRACKETS, not the bare id", () => {
  assert.deepEqual([...citedEntries("closed by [[BKLG-002]] and [[BKLG-001]]")].sort(), ["BKLG-001", "BKLG-002"]);
});

test("⛔ control: a BARE id is not a citation", () => {
  assert.deepEqual([...citedEntries("since BKLG-001 and then BKLG-002")], []);
  assert.deepEqual([...citedEntries("see implementations/archive/BKLG-003/plan.md")], []);
});

test("· the same entry cited twice counts once", () => {
  assert.deepEqual([...citedEntries("[[BKLG-7]] and again [[BKLG-7]]")], ["BKLG-7"]);
});

/**
 * The only subprocess test here: the entrypoint guard reads `process.argv[1]`, which `node --test`
 * always fills in — so only a real `node -e` shows whether importing throws without it.
 */
test("the modules import without an argv[1] (node -e)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const files = ["project", "register", "docIndex", "check-doc-refs", "backlog-anchor", "architecture-shape",
    "backlog-coherence", "closed-defects", "related-docs", "backlog-github-sync"]
    .map((n) => join(here, `${n}.mjs`));
  const code = files.map((f) => `import(${JSON.stringify(pathToFileURL(f).href)})`).join(",");
  const output = execFileSync(process.execPath, ["-e", `Promise.all([${code}]).then(()=>console.log('ok'))`], {
    encoding: "utf8",
  });
  assert.match(output, /ok/);
});

test("a bare mention is reported, a linked one is not", () => {
  const bare = bareMentions("closed by BKLG-002 and by [[BKLG-001]]");
  assert.deepEqual(bare.map((m) => m.id), ["BKLG-002"]);
  assert.equal(bare[0].line, 1);
});

test("⛔ IDENTITY is not a citation: the id that OPENS the line", () => {
  for (const row of ["# BKLG-003 — Title", "## BKLG-004 — another", "- **BKLG-005** history one-liner"]) {
    assert.deepEqual(bareMentions(row), [], row);
  }
  // Control: an id in the MIDDLE of a heading is a mention, and it is reported.
  assert.deepEqual(bareMentions("## Ordering against BKLG-006").map((m) => m.id), ["BKLG-006"]);
});

test("⛔ guarded: backticks, link text, path", () => {
  assert.deepEqual(bareMentions("the id is written `BKLG-002`"), []);
  assert.deepEqual(bareMentions("the [plan of BKLG-003](../x/plan.md)"), []);
  assert.deepEqual(bareMentions("see implementations/archive/BKLG-003/plan.md"), []);
});

test("⛔ nothing inside a code fence is touched", () => {
  assert.deepEqual(bareMentions(["before", "```", "git commit -m 'BKLG-001: x'", "```", "after"].join("\n")), []);
});

test("⛔ a range is not a single id", () => {
  assert.deepEqual(bareMentions("the work of BKLG-010/011"), []);
});

test("· and the reported line is the right one", () => {
  assert.deepEqual(bareMentions(["intact", "", "here is BKLG-9"].join("\n")).map((m) => m.line), [3]);
});

// ─── The shape of a `file:line` reference ────────────────────────────────────────────────────────

const captureLine = (t, re = FILE_LINE) => [...t.matchAll(re)].map((m) => `${m[1]}:${m[2]}`);
const captureBare = (t, re = BARE) => [...t.matchAll(re)].map((m) => m[1]);

test("· FILE_LINE captures abbreviated paths in several languages", () => {
  assert.deepEqual(
    captureLine("in `billing/InvoiceService.ts:54`, `queue/OrderQueue.py:12` and `tools/run-tests.ps1:3`"),
    ["billing/InvoiceService.ts:54", "queue/OrderQueue.py:12", "tools/run-tests.ps1:3"],
  );
});

test("⛔ FILE_LINE does not read a binary file or a URL", () => {
  // A line number means nothing in an image or a PDF; and `https://host/app.js:80` is not a repo file.
  assert.deepEqual(captureLine("`img/logo.png:12` and `docs/manual.pdf:3`"), []);
  assert.deepEqual(captureLine("see https://example.dev/assets/app.js:80"), []);
  // Control: the same name outside a URL is read.
  assert.deepEqual(captureLine("see `assets/app.js:80`"), ["assets/app.js:80"]);
});

test("· BARE reads code and asset paths, and `.json` is not truncated to `.js`", () => {
  assert.deepEqual(
    captureBare("`src/App.tsx` · `config/settings.json` · `public/img/logo.png` · `db/schema.sql`"),
    ["src/App.tsx", "config/settings.json", "public/img/logo.png", "db/schema.sql"],
  );
  // Control: a path without a folder is too vague to judge, and is not read.
  assert.deepEqual(captureBare("`InvoiceService.ts`"), []);
});

test("· a project's own extensions are read once it declares them — and not before", () => {
  const text = "`scenes/Level1.tscn` and `player/move.gd:12`";
  assert.deepEqual(captureBare(text), []);
  assert.deepEqual(captureLine(text), []);
  const shapes = vocabulary(parseConfig(JSON.stringify({ lineExtensions: ["gd"], assetExtensions: ["tscn"] })));
  assert.deepEqual(captureBare(text, shapes.BARE), ["scenes/Level1.tscn"]);
  assert.deepEqual(captureLine(text, shapes.FILE_LINE), ["player/move.gd:12"]);
  assert.equal(shapes.isSource.test("scenes/Level1.tscn"), true);
  assert.equal(shapes.isSource.test("docs/readme.md"), false, "docs are linked, not indexed as sources");
});

// ─── Walking the repo ─────────────────────────────────────────────────────────────────────────────

function fakeTree(files) {
  const root = mkdtempSync(join(tmpdir(), "docIndex-"));
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), content, "utf8");
  }
  return root;
}

const inTree = (files, fn) => {
  const root = fakeTree(files);
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("⛔ outside git the walk skips generated folders", () => {
  inTree({
    "src/a.ts": "x",
    "node_modules/pkg/b.js": "x",
    "dist/bundle.js": "x",
    ".git/HEAD": "x",
    "docs/README.md": "x",
  }, (root) => {
    // Control: the files that matter ARE listed.
    assert.deepEqual(allFiles(root).sort(), ["docs/README.md", "src/a.ts"]);
  });
});

test("· a project's skipFolders and ignoreExtensions leave its generated files out", () => {
  const config = parseConfig(JSON.stringify({ skipFolders: ["Library", "captures/out"], ignoreExtensions: ["meta"] }));
  inTree({
    "src/a.cs": "x",
    "src/a.cs.meta": "guid",
    "Library/cache/b.cs": "x",
    "captures/out/shot.png": "x",
    "captures/keep.png": "x",
  }, (root) => {
    assert.deepEqual(allFiles(root, config).sort(), ["captures/keep.png", "src/a.cs"]);
    // Control: without the config they are listed — the config is what removed them.
    assert.equal(allFiles(root).length, 5);
  });
});

test("⛔ in a git tree only what git keeps is listed: an ignored file is not a file of the repo", () => {
  inTree({
    ".gitignore": "/captures/\n",
    "captures/shot.png": "x",
    "tools/run-tests.ps1": "x",
    "docs/README.md": "x",
  }, (root) => {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "docs/README.md"], { cwd: root });
    // Control: tracked and new (unignored) files ARE listed; the ignored capture is not, though it is on disk.
    assert.deepEqual(allFiles(root).sort(), [".gitignore", "docs/README.md", "tools/run-tests.ps1"]);
  });
});

test("· a root-only skip does not hide a nested folder with the same name", () => {
  inTree({ "src/build/wall.png": "x" }, (root) => {
    assert.deepEqual(allFiles(root), ["src/build/wall.png"]);
  });
});

test("docIndex maps live docs to the sources they name and the entries they cite", () => {
  inTree({
    "src/billing/Invoice.ts": "x",
    "docs/architecture/billing.md": "Invoices live in `billing/Invoice.ts`. Opened by [[BKLG-001]].",
    "docs/implementations/archive/old/plan.md": "`billing/Invoice.ts` [[BKLG-000]]",
  }, (root) => {
    const { namesFile, citesEntry } = docIndex(root);
    assert.deepEqual([...namesFile.keys()], ["docs/architecture/billing.md"]);
    assert.deepEqual([...citesEntry.get("docs/architecture/billing.md")], ["BKLG-001"]);
  });
});

test("· architectureOnly follows the project's architectureDir", () => {
  const config = parseConfig(JSON.stringify({ architectureDir: "handbook/design" }));
  inTree({
    "src/a.ts": "x",
    "handbook/design/a.md": "`src/a.ts` [[BKLG-002]]",
    "docs/architecture/b.md": "`src/a.ts` [[BKLG-003]]",
  }, (root) => {
    assert.deepEqual([...docIndex(root, { architectureOnly: true, config }).citesEntry.keys()], ["handbook/design/a.md"]);
  });
});
