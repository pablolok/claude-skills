#!/usr/bin/env node
/**
 * Renders every `<dir>/*.mmd` to a sibling `.svg`, using mermaid-cli driving the REAL Chrome.
 *
 *   node scripts/mermaid.mjs render docs/qualcosa/diagrams      (the project's copy of bootstrap/mermaid.mjs)
 *
 * ## Why a real browser, and not jsdom
 *
 * The first attempt rendered under jsdom with a stubbed `getBBox`. It produced SVGs that did not
 * throw — and were garbage: `viewBox="-8 -8 27822 34"`, every node laid out in one endless row,
 * because jsdom cannot measure text. **jsdom can tell you a diagram PARSES; it cannot lay one out.**
 * Only a browser can. `check-mermaid.mjs` keeps its jsdom pass as a syntax check; SVGs come from here.
 *
 * ## The two flags that are not optional
 *
 * - `-c .mermaid-config.json` sets `htmlLabels: false`. An `<img src="*.svg">` does NOT render
 *   `foreignObject`, so HTML labels would come out as empty boxes — the same bug this whole exercise
 *   was about, arriving by another road. This script fails if any output contains one.
 * - `-b '#1e1e1e'` bakes the dark background in, because the dark theme draws light text that would
 *   vanish on a white page.
 *
 * `.mermaid-puppeteer.json` points at the installed Chrome so no Chromium is downloaded. That path is
 * machine-specific: it is the skill's default, and where Chrome lives elsewhere the project puts its own
 * `.mermaid-puppeteer.json` in its root (an edit next to this script is lost on the plugin's next update).
 *
 * Both JSON configs ship WITH the skill and are passed as absolute paths (the script no longer lives
 * in the project, so a relative name would resolve against the wrong folder). A project that needs
 * different settings drops its own `.mermaid-config.json` / `.mermaid-puppeteer.json` in its root:
 * a file found there wins.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
if (!dir) {
  console.error("uso: node render-svg.mjs <dir-con-i-mmd>");
  process.exit(2);
}

const skillDir = dirname(fileURLToPath(import.meta.url));
const configPath = (name) => {
  const inProject = resolve(process.cwd(), name);
  return existsSync(inProject) ? inProject : join(skillDir, name);
};
const puppeteerConfig = configPath(".mermaid-puppeteer.json");
const mermaidConfig = configPath(".mermaid-config.json");
// execFileSync runs through the shell here (bunx is a .cmd on Windows), so spaces need quoting.
const shellArg = (value) => (/\s/.test(value) ? `"${value}"` : value);

// mmdc is looked for in the same order as check-mermaid.mjs resolves its deps: the project you are
// standing in first, then the skill's own node_modules (`bun install` once, in this folder — that is
// what lets the renderer work in a repo that never heard of mermaid). `bunx` is the last resort: it
// needs bun on PATH and downloads mermaid-cli on demand.
// The three shim names are not interchangeable and the wrong guess fails SILENTLY, by falling
// through to bunx: on Windows npm writes `mmdc.cmd` while bun writes `mmdc.exe` (plus a `.bunx`
// sibling), and POSIX writes a bare `mmdc`. Measured, not assumed — bun 1.3 produced only the .exe.
const installedMmdc = [process.cwd(), skillDir]
  .flatMap((root) =>
    ["mmdc.cmd", "mmdc.exe", "mmdc"].map((name) => join(root, "node_modules", ".bin", name)),
  )
  .find(existsSync);
const [renderer, rendererArgs] = installedMmdc ? [shellArg(installedMmdc), []] : ["bunx", ["mmdc"]];

const sources = readdirSync(dir).filter((file) => file.endsWith(".mmd"));
if (sources.length === 0) {
  console.error(`nessun .mmd in ${dir}`);
  process.exit(2);
}

let failures = 0;

for (const source of sources) {
  const name = basename(source, ".mmd");
  const out = join(dir, `${name}.svg`);
  try {
    execFileSync(
      renderer,
      [...rendererArgs,
       "-i", shellArg(join(dir, source)), "-o", shellArg(out), "-t", "dark", "-b", "#1e1e1e",
       "-p", shellArg(puppeteerConfig), "-c", shellArg(mermaidConfig)],
      { stdio: "pipe", shell: true },
    );
    const svg = readFileSync(out, "utf8");
    const viewBox = svg.match(/viewBox="([^"]*)"/)?.[1] ?? "";
    const [, , width, height] = viewBox.split(/\s+/).map(Number);
    if (svg.includes("foreignObject")) {
      throw new Error("contiene foreignObject: in un <img> le etichette sarebbero vuote");
    }
    if (!(width > 0 && height > 0)) throw new Error(`viewBox non valido: "${viewBox}"`);
    // A stretched viewBox is the signature of a renderer that could not measure text.
    if (width / height > 12) throw new Error(`viewBox sproporzionato (${viewBox}) — layout non misurato`);
    console.log(`  ${name}.svg  ${Math.round(width)}x${Math.round(height)}  ${svg.length} bytes`);
  } catch (error) {
    failures++;
    console.log(`  ${name}  FAIL  ${String(error?.message ?? error).split("\n")[0]}`);
  }
}

if (failures > 0) process.exit(1);
console.log(`\n${sources.length} diagram(s) rendered.`);
