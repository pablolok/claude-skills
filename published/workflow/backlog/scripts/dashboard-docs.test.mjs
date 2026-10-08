/** Tests of `dashboard-docs`: what a request may read, and how the documents tree is grouped. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { docTree, mediaType, servablePath } from "./dashboard-docs.mjs";
import { parseConfig } from "./project.mjs";

test("a document or an embedded image inside the root is servable, normalised", () => {
  assert.equal(servablePath("docs/a/../b.md"), "docs/b.md");
  assert.equal(servablePath("docs\\shots\\x.png"), "docs/shots/x.png");
  assert.equal(mediaType("docs/b.md"), "text/markdown; charset=utf-8");
});

test("nothing outside the root, nothing in .git, no source or secret file", () => {
  for (const bad of ["../x.md", "docs/../../x.md", "/etc/x.md", "C:/x.md", ".git/config", "a/.git/x.md", ".env", "src/app.js", "", "a\0.md"]) {
    assert.equal(servablePath(bad), null, bad);
  }
});

test("the tree groups every markdown file: register, work docs, architecture, archive, the rest", () => {
  const config = parseConfig(null);
  const tree = docTree([
    "README.md", "src/app.js",
    "docs/implementations/BACKLOG.md", "docs/implementations/BACKLOG-HISTORY.md",
    "docs/implementations/features/import/spec.md", "docs/implementations/bugs/retry/plan.md",
    "docs/implementations/archive/old/report.md", "docs/architecture/sync.md",
  ], config);
  assert.deepEqual(Object.fromEntries(tree.map((g) => [g.group, g.docs])), {
    register: ["docs/implementations/BACKLOG-HISTORY.md", "docs/implementations/BACKLOG.md"],
    work: ["docs/implementations/bugs/retry/plan.md", "docs/implementations/features/import/spec.md"],
    architecture: ["docs/architecture/sync.md"],
    archive: ["docs/implementations/archive/old/report.md"],
    other: ["README.md"],
  });
});

test("the project's folders move the groups", () => {
  const config = parseConfig(JSON.stringify({ docsDir: "work", architectureDir: "arch" }));
  const tree = docTree(["work/BACKLOG.md", "arch/a.md", "docs/implementations/BACKLOG.md"], config);
  assert.deepEqual(tree.find((g) => g.group === "register").docs, ["work/BACKLOG.md"]);
  assert.deepEqual(tree.find((g) => g.group === "architecture").docs, ["arch/a.md"]);
  assert.deepEqual(tree.find((g) => g.group === "other").docs, ["docs/implementations/BACKLOG.md"]);
});
