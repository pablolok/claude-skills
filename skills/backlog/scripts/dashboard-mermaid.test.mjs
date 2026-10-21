/** Tests of `dashboard-mermaid`: how a document is cut at its diagrams, and how each one gets its drawing or its reason. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { MAX_SVG_CHARS, WHY, answerFor, diagramId, splitDiagrams, withOwnSize } from "./dashboard-mermaid.mjs";

const DOC = ["# Title", "", "before", "", "```mermaid", "flowchart TD", "  A --> B", "```", "", "after", "", "```mermaid", "graph LR", "  X --> Y", "```", ""].join("\n");

/** A renderer that draws each `.mmd` as an SVG whose text is its source, and counts the folders it was asked about. */
function fakeRenderer(size = "0 0 300 200") {
  const calls = [];
  const render = (dir) => {
    calls.push(readdirSync(dir).sort());
    for (const file of readdirSync(dir)) {
      if (file.endsWith(".mmd")) writeFileSync(path.join(dir, file.replace(/\.mmd$/, ".svg")), `<svg width="100%" style="max-width: 300px" viewBox="${size}"><text>${file}</text></svg>`);
    }
    return { ok: true };
  };
  return { render, calls };
}

const withCache = (run) => {
  const cacheDir = mkdtempSync(path.join(os.tmpdir(), "dm-test-"));
  try {
    return run(cacheDir);
  } finally {
    rmSync(cacheDir, { recursive: true, force: true });
  }
};

test("a document is cut at its diagrams, in reading order, and keeps every word of its text", () => {
  const parts = splitDiagrams(DOC);
  assert.deepEqual(parts.map((s) => s.kind), ["text", "diagram", "text", "diagram", "text"]);
  assert.equal(parts[1].source, "flowchart TD\n  A --> B");
  assert.equal(parts[0].text + parts[2].text + parts[4].text, DOC.replace(/```mermaid[\s\S]*?\n```/g, ""));
});

test("a document with no diagram, or with another kind of fence, is not cut at all", () => {
  assert.equal(splitDiagrams("# plain\n\n```js\nconst a = 1\n```\n"), null);
  assert.equal(splitDiagrams(""), null);
});

test("a diagram's identity is its source: the same source is the same diagram, an edit is another", () => {
  assert.equal(diagramId("a --> b"), diagramId("a --> b"));
  assert.notEqual(diagramId("a --> b"), diagramId("a --> c"));
});

test("the drawing keeps its own size instead of «100%», so a surface that draws an image does not stretch it", () => {
  const sized = withOwnSize('<svg width="100%" height="50" style="max-width: 616px" viewBox="0 0 615.8 1009.9"><g/></svg>');
  assert.match(sized, /^<svg width="616" height="1010" /);
  assert.equal((sized.match(/\bwidth=/g) ?? []).length, 1);
  assert.equal(withOwnSize("<svg><g/></svg>"), "<svg><g/></svg>");
});

test("each diagram gets its drawing, and the cache means a second ask draws nothing", () =>
  withCache((cacheDir) => {
    const { render, calls } = fakeRenderer();
    const first = answerFor(DOC, { cacheDir, render });
    const diagrams = first.segments.filter((s) => s.kind === "diagram");
    assert.equal(diagrams.length, 2);
    assert.ok(diagrams.every((d) => d.svg?.startsWith('<svg width="300" height="200"') && d.reason === null));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].length, 2);

    answerFor(DOC, { cacheDir, render });
    assert.equal(calls.length, 1, "nothing was missing, so the renderer was not asked");
  }));

test("an edit to one diagram draws only that one, in a folder of its own", () =>
  withCache((cacheDir) => {
    const { render, calls } = fakeRenderer();
    answerFor(DOC, { cacheDir, render });
    answerFor(DOC.replace("A --> B", "A --> C"), { cacheDir, render });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].length, 1, "the unchanged diagram was not drawn again");
  }));

test("without a renderer the source comes back with the reason, and the text is untouched", () =>
  withCache((cacheDir) => {
    const { segments } = answerFor(DOC, { cacheDir, render: null });
    const diagram = segments.find((s) => s.kind === "diagram");
    assert.equal(diagram.svg, null);
    assert.equal(diagram.reason, WHY.NO_RENDERER);
    assert.equal(diagram.source, "flowchart TD\n  A --> B");
  }));

test("a renderer that fails says so, with its message, and a diagram it did not draw has no drawing", () =>
  withCache((cacheDir) => {
    const render = () => ({ ok: false, message: "chrome not found" });
    const diagram = answerFor(DOC, { cacheDir, render }).segments.find((s) => s.kind === "diagram");
    assert.equal(diagram.svg, null);
    assert.equal(diagram.reason, WHY.RENDER_FAILED);
    assert.equal(diagram.message, "chrome not found");
  }));

test("a drawing bigger than the pane accepts is not handed over", () =>
  withCache((cacheDir) => {
    const render = (dir) => {
      for (const file of readdirSync(dir)) writeFileSync(path.join(dir, file.replace(/\.mmd$/, ".svg")), `<svg viewBox="0 0 1 1">${"x".repeat(MAX_SVG_CHARS)}</svg>`);
      return { ok: true };
    };
    const diagram = answerFor(DOC, { cacheDir, render }).segments.find((s) => s.kind === "diagram");
    assert.equal(diagram.svg, null);
    assert.equal(diagram.reason, WHY.TOO_LARGE);
  }));
