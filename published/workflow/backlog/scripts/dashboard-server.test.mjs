/** Tests of `dashboard-server`: each route reaches its collaborator; the board carries an ETag the page polls with. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHandler, listen } from "./dashboard-server.mjs";

async function withServer(deps, fn) {
  const uiDir = mkdtempSync(path.join(tmpdir(), "backlog-dashboard-ui-"));
  writeFileSync(path.join(uiDir, "index.html"), "<p>page</p>");
  const { server, url } = await listen(createHandler({ uiDir, ...deps }), 0);
  try {
    await fn(url);
  } finally {
    server.close();
    rmSync(uiDir, { recursive: true, force: true });
  }
}

const deps = {
  board: () => ({ totals: { open: 1 } }),
  tree: () => [{ group: "register", docs: ["BACKLOG.md"] }],
  readFile: (rel) => (rel === "a.md" ? { type: "text/markdown; charset=utf-8", body: Buffer.from("# A") } : null),
};

test("the page, the board, the tree and a document are served from their collaborators", async () => {
  await withServer(deps, async (url) => {
    assert.equal(await (await fetch(url)).text(), "<p>page</p>");
    assert.deepEqual(await (await fetch(`${url}api/board`)).json(), { totals: { open: 1 } });
    assert.deepEqual(await (await fetch(`${url}api/tree`)).json(), [{ group: "register", docs: ["BACKLOG.md"] }]);
    const doc = await fetch(`${url}api/file?path=a.md`);
    assert.equal(doc.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.equal(await doc.text(), "# A");
  });
});

test("a file the reader refuses is a 404; an unknown route too; only GET", async () => {
  await withServer(deps, async (url) => {
    assert.equal((await fetch(`${url}api/file?path=../secret.md`)).status, 404);
    assert.equal((await fetch(`${url}nope`)).status, 404);
    assert.equal((await fetch(`${url}api/board`, { method: "POST" })).status, 405);
  });
});

test("an unchanged board answers 304 to its ETag, a changed one a new body", async () => {
  let open = 1;
  await withServer({ ...deps, board: () => ({ open }) }, async (url) => {
    const first = await fetch(`${url}api/board`);
    const etag = first.headers.get("etag");
    assert.ok(etag);
    assert.equal((await fetch(`${url}api/board`, { headers: { "if-none-match": etag } })).status, 304);
    open = 2;
    const changed = await fetch(`${url}api/board`, { headers: { "if-none-match": etag } });
    assert.equal(changed.status, 200);
    assert.deepEqual(await changed.json(), { open: 2 });
  });
});

test("a missing collaborator fails at construction", () => {
  assert.throws(() => createHandler({ ...deps, board: undefined, uiDir: "x" }), /board/);
  assert.throws(() => createHandler({ ...deps, uiDir: "" }), /uiDir/);
});
