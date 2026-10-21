#!/usr/bin/env node
/**
 * **The diagrams of a document, for the pane** — the markdown the host draws knows no `mermaid`, so the pane asks this
 * script for the document cut at its fenced diagrams: text pieces to draw as markdown, and for each diagram an SVG
 * the pane draws as an image.
 *
 *   node dashboard-mermaid.mjs --root <project> --doc <root-relative.md>      # prints { segments } as JSON
 *
 * This script is the only owner of the fence: what counts as a diagram, its identity (the hash of its source) and
 * the cache. The pane draws what it is given and parses nothing.
 *
 * Rendering is not done here: a diagram can only be laid out by a real browser (jsdom measures no text), and the
 * project already has a launcher for the `mermaid-diagrams` skill that does it — `scripts/mermaid.mjs render <dir>`,
 * which turns every `.mmd` of a folder into a sibling `.svg`. A project without that launcher gets the source back
 * with the reason, never a missing document. Every outcome is data: a segment says why it has no drawing.
 *
 * The cache is the hash of the source, so a diagram renders once and an edit to it renders again; it lives in the
 * temp folder because nothing in it is worth keeping.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { servablePath } from "./dashboard-docs.mjs";

/** What the pane's `Svg` element accepts, in characters; a bigger drawing is not handed over. */
export const MAX_SVG_CHARS = 131072;
/** How long the launcher may take for the diagrams of one document. */
export const RENDER_TIMEOUT_MS = 120000;

/** Why a diagram has no drawing. */
export const WHY = Object.freeze({
  NO_RENDERER: "no-renderer",
  RENDER_FAILED: "render-failed",
  TOO_LARGE: "too-large",
});

/** A fenced block opened by ```mermaid at the start of a line and closed by ``` at the start of a line. */
const FENCE = /^```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;

/** The identity of a diagram: its source, nothing around it. */
export const diagramId = (source) => createHash("sha1").update(source).digest("hex").slice(0, 16);

/** The document cut at its diagrams: `text` pieces and `diagram` pieces in reading order, or null when it has none. */
export function splitDiagrams(markdown) {
  const text = String(markdown ?? "");
  const segments = [];
  let last = 0;
  for (const match of text.matchAll(FENCE)) {
    if (match.index > last) segments.push({ kind: "text", text: text.slice(last, match.index) });
    segments.push({ kind: "diagram", source: match[1], id: diagramId(match[1]) });
    last = match.index + match[0].length;
  }
  if (!segments.length) return null;
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

/**
 * The drawing with the size it has, not «100%»: mermaid writes `width="100%"` and a `max-width`, which a surface that
 * draws the SVG as an image reads as the size of its slot. The viewBox is the diagram's own size.
 */
export function withOwnSize(svg) {
  const open = /<svg\b[^>]*>/i.exec(svg);
  if (!open) return svg;
  const box = /\bviewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/i.exec(open[0]);
  if (!box) return svg;
  const sized = open[0]
    .replace(/\s(width|height)="[^"]*"/gi, "")
    .replace(/<svg\b/i, `<svg width="${Math.round(Number(box[1]))}" height="${Math.round(Number(box[2]))}"`);
  return svg.slice(0, open.index) + sized + svg.slice(open.index + open[0].length);
}

/** The temp folder the drawings are kept in, by the hash of their source. */
export const defaultCacheDir = () => path.join(os.tmpdir(), "backlog-dashboard-mermaid");

/**
 * The project's launcher for the `mermaid-diagrams` skill, as a renderer: it draws every `.mmd` of `dir` to a
 * sibling `.svg`. Null when the project has no launcher.
 */
export function launcherRenderer(root) {
  const launcher = path.join(root, "scripts", "mermaid.mjs");
  if (!existsSync(launcher)) return null;
  return (dir) => {
    const run = spawnSync(process.execPath, [launcher, "render", dir], { cwd: root, encoding: "utf8", timeout: RENDER_TIMEOUT_MS });
    return run.status === 0
      ? { ok: true }
      : { ok: false, message: (run.stderr || run.stdout || run.error?.message || `exit ${run.status}`).trim().split(/\r?\n/).slice(-3).join(" ") };
  };
}

/**
 * Give every diagram of the segments its drawing, or the reason it has none. `render(dir)` draws the `.mmd` files of a
 * folder (or is null: no renderer); only the diagrams the cache does not hold go to it, in one folder of their own so
 * that earlier ones are not drawn again.
 */
export function drawDiagrams(segments, { cacheDir = defaultCacheDir(), render }) {
  mkdirSync(cacheDir, { recursive: true });
  const cached = (id) => path.join(cacheDir, `${id}.svg`);
  const missing = [...new Map(segments.filter((s) => s.kind === "diagram" && !existsSync(cached(s.id))).map((s) => [s.id, s])).values()];
  let failure = null;
  if (missing.length && !render) failure = { reason: WHY.NO_RENDERER, message: "this project has no scripts/mermaid.mjs launcher" };
  else if (missing.length) {
    const work = mkdtempSync(path.join(os.tmpdir(), "backlog-mermaid-"));
    try {
      for (const s of missing) writeFileSync(path.join(work, `${s.id}.mmd`), s.source);
      const outcome = render(work);
      if (!outcome.ok) failure = { reason: WHY.RENDER_FAILED, message: outcome.message ?? "" };
      for (const s of missing) {
        const out = path.join(work, `${s.id}.svg`);
        if (existsSync(out)) writeFileSync(cached(s.id), withOwnSize(readFileSync(out, "utf8")));
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }
  return segments.map((s) => {
    if (s.kind !== "diagram") return s;
    if (!existsSync(cached(s.id))) return { ...s, svg: null, reason: failure?.reason ?? WHY.RENDER_FAILED, message: failure?.message ?? "" };
    const svg = readFileSync(cached(s.id), "utf8");
    return svg.length > MAX_SVG_CHARS ? { ...s, svg: null, reason: WHY.TOO_LARGE, message: `${svg.length} characters` } : { ...s, svg, reason: null };
  });
}

/** The answer for one document: its segments with their drawings, or `segments: null` when it has no diagram. */
export function answerFor(markdown, options) {
  const segments = splitDiagrams(markdown);
  return { segments: segments ? drawDiagrams(segments, options) : null };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const valueOf = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const root = valueOf("--root");
  const doc = servablePath(valueOf("--doc") ?? "");
  if (!root || !doc || !/\.md$/i.test(doc)) {
    console.error("usage: dashboard-mermaid.mjs --root <project> --doc <root-relative.md>");
    process.exit(2);
  }
  const markdown = readFileSync(path.join(root, doc), "utf8");
  process.stdout.write(JSON.stringify(answerFor(markdown, { render: launcherRenderer(root) })));
}
