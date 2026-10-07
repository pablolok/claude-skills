#!/usr/bin/env node
/**
 * Parses every ```mermaid block in the given markdown files with the REAL mermaid parser.
 *
 *   node scripts/mermaid.mjs check docs/**\/*.md      (the project's copy of bootstrap/mermaid.mjs)
 *
 * Why this exists: a broken diagram renders as an EMPTY BOX in the VSCode preview — no error, no
 * red text, nothing. Without this you are reduced to guessing which construct broke it, and every
 * guess costs a round-trip through the user's eyes. Run it before claiming a diagram works.
 *
 * Two passes per diagram, because they fail differently:
 *   - `parse`  — syntax. Catches the entity / inline-HTML / comma-in-generics breakers.
 *   - `render` — layout, under jsdom with SVG polyfills. A diagram can parse cleanly and still throw
 *     here, and `render` is what the preview actually runs. Parse-only was NOT enough: it passed
 *     every diagram while the VSCode preview was showing empty boxes.
 *
 * This script lives OUTSIDE any project (a plugin, or the launcher's cached clone), so a bare
 * `import "mermaid"` would look next to the script and find nothing. Both deps are resolved from an
 * ORDERED chain instead: the CURRENT PROJECT first, then the skill's OWN node_modules.
 *
 * The project deliberately wins. The skill carries its own copy so the validator also works in a
 * repo that never heard of mermaid (the launcher installs it once in its cached clone) — but a project that pins a
 * version must keep it, and the version-comparison trick in SKILL.md (install mermaid@10 in a temp
 * folder, point this script at it) is cwd-based and would die if the skill's copy took precedence.
 *
 * Exit code 1 if any diagram fails, so it can gate a commit.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("uso: node check-mermaid.mjs <file.md> [file.md ...]");
  process.exit(2);
}

const skillDir = dirname(fileURLToPath(import.meta.url));
// Ordered: the project you are standing in wins, the skill's own copy is the fallback.
const resolutionRoots = [process.cwd(), skillDir];
const requireFrom = resolutionRoots.map((root) => createRequire(join(root, "package.json")));

async function fromProject(name) {
  for (const require of requireFrom) {
    try {
      return await import(pathToFileURL(require.resolve(name)).href);
    } catch {
      // try the next root
    }
  }
  console.error(
    `"${name}" non risolto da nessuna di queste radici:\n` +
      resolutionRoots.map((root) => `  - ${root}`).join("\n") +
      `\nInstallalo nel progetto (bun add -d mermaid jsdom) oppure, una volta sola e per sempre,` +
      `\nnella skill stessa: cd ${skillDir} && bun install`,
  );
  process.exit(2);
}

const { JSDOM } = await fromProject("jsdom");

const dom = new JSDOM("<!doctype html><html><body><div id='c'></div></body></html>", {
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.SVGElement = dom.window.SVGElement;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.Element = dom.window.Element;
globalThis.CSSStyleSheet = dom.window.CSSStyleSheet;
globalThis.CSSStyleDeclaration = dom.window.CSSStyleDeclaration;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);

// jsdom implements no SVG layout; mermaid measures text with these.
const proto = dom.window.SVGElement.prototype;
proto.getBBox = function () {
  const text = this.textContent ?? "";
  return { x: 0, y: 0, width: Math.max(10, text.length * 8), height: 18 };
};
proto.getComputedTextLength = function () {
  return Math.max(10, (this.textContent ?? "").length * 8);
};
proto.getScreenCTM = function () {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => this.getScreenCTM() };
};
if (!dom.window.SVGSVGElement.prototype.createSVGMatrix) {
  dom.window.SVGSVGElement.prototype.createSVGMatrix = () => ({
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    multiply: function () { return this; },
    inverse: function () { return this; },
    translate: function () { return this; },
    scale: function () { return this; },
  });
}

const mermaid = (await fromProject("mermaid")).default;
mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });

let failures = 0;

for (const file of files) {
  // \r?\n: a CRLF checkout (core.autocrlf on Windows) would otherwise match no block and pass with nothing checked.
  const blocks = [...readFileSync(file, "utf8").matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map((m) =>
    m[1].replace(/\r\n/g, "\n"),
  );
  if (blocks.length === 0) continue;
  console.log(`\n${file} — ${blocks.length} diagram(s)`);

  for (const [i, code] of blocks.entries()) {
    const kind = code.trim().split("\n")[0].slice(0, 40);
    try {
      await mermaid.parse(code);
      const t0 = performance.now();
      const { svg } = await mermaid.render(`diagram-${i}`, code);
      const ms = Math.round(performance.now() - t0);
      if (!svg || svg.length < 200) throw new Error(`render produced ${svg?.length ?? 0} bytes of SVG`);
      console.log(`  #${i + 1} OK    ${kind}  (${svg.length} bytes, ${ms} ms)`);
    } catch (error) {
      failures++;
      console.log(`  #${i + 1} FAIL  ${kind}`);
      console.log(
        String(error?.message ?? error)
          .split("\n")
          .slice(0, 8)
          .map((line) => `        ${line}`)
          .join("\n"),
      );
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} diagram(s) failed to parse.`);
  process.exit(1);
}
console.log("\nAll diagrams parse.");
