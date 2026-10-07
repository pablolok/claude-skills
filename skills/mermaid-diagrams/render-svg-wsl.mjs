#!/usr/bin/env node
/**
 * The WSL variant of `render-svg.mjs`.
 *
 * ═══ WHY IT EXISTS ═══
 *
 * Under WSL the normal script does NOT work, and it fails in a way that looks like a mermaid problem while it is a
 * system one: the Chromium that puppeteer downloads for Linux starts and dies at once with
 *
 *     error while loading shared libraries: libnspr4.so: cannot open shared object file
 *
 * that is, the system libraries an installed Chrome would bring along are missing. Fixing that takes
 * `sudo apt install` — a permission a session does not have and must not take on its own.
 *
 * The way that works goes around the problem instead of solving it: WSL can run an `.exe`, and the skill's Windows
 * copy already has `mmdc.exe` and points at the REAL Chrome installed on Windows. Paths are translated with
 * `wslpath -w`, and `\\wsl.localhost\...` is readable from Windows, so the repository can stay where it is.
 *
 * Verified on a real project: a 34 KB SVG, no `foreignObject`, viewBox 1334x1186.
 *
 * ⚠️ It needs the skill's Windows copy with its dependencies installed. If one day the Linux libraries are there,
 * `render-svg.mjs` is the right road again and this file goes.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The skill's Windows copy. It is not wired to one user: it is looked for under /mnt/c/Users, so the file works on
 * any machine. `MERMAID_WIN_SKILL` forces it when it lives elsewhere.
 */
function findWindowsSkill() {
  // An explicit override is checked all the same: a wrong path must give the useful message here, not an ENOENT for
  // every diagram further on.
  if (process.env.MERMAID_WIN_SKILL) {
    const p = process.env.MERMAID_WIN_SKILL;
    return existsSync(`${p}/node_modules/.bin/mmdc.exe`) ? p : null;
  }
  const base = "/mnt/c/Users";
  let users = [];
  try {
    users = readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return null;
  }
  // Two places: the old user-level copy, and the clones the `scripts/mermaid.mjs` launcher keeps in its cache (where
  // it installs the dependencies) — the highest version first.
  const candidates = (u) => {
    const cache = `${base}/${u}/.cache/claude-skills`;
    let clones = [];
    try {
      clones = readdirSync(cache).filter((n) => n.startsWith("mermaid-diagrams@"))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    } catch {
      // no cache in this Windows account
    }
    return [`${base}/${u}/.claude/skills/mermaid-diagrams`,
            ...clones.map((n) => `${cache}/${n}/published/workflow/mermaid-diagrams`)];
  };
  for (const u of users) {
    const p = candidates(u).find((c) => existsSync(`${c}/node_modules/.bin/mmdc.exe`));
    if (p) return p;
  }
  return null;
}

const WIN_SKILL = findWindowsSkill();
const MMDC = WIN_SKILL ? `${WIN_SKILL}/node_modules/.bin/mmdc.exe` : null;

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node render-svg-wsl.mjs <folder-with-the-mmd-files>");
  process.exit(2);
}
if (!MMDC) {
  console.error(
    "No Windows copy of the skill with its dependencies under /mnt/c/Users/*/.cache/claude-skills\n" +
    "(nor in the old /mnt/c/Users/*/.claude/skills/mermaid-diagrams). Run once from Windows\n" +
    "`node scripts/mermaid.mjs check <a file.md>`, which clones it and installs them, or give the path with\n" +
    "MERMAID_WIN_SKILL=<the skill's folder with node_modules>"
  );
  process.exit(2);
}

const win = (p) => execFileSync("wslpath", ["-w", p], { encoding: "utf8" }).trim();
const mmds = readdirSync(dir).filter((f) => f.endsWith(".mmd"));
if (mmds.length === 0) {
  console.error(`no .mmd in ${dir}`);
  process.exit(2);
}

let bad = 0;
for (const f of mmds) {
  const src = join(dir, f);
  const out = src.replace(/\.mmd$/, ".svg");
  try {
    execFileSync(MMDC, [
      "-i", win(src), "-o", win(out), "-t", "dark", "-b", "#1e1e1e",
      "-p", win(`${WIN_SKILL}/.mermaid-puppeteer.json`),
      "-c", win(`${WIN_SKILL}/.mermaid-config.json`),
    ], { stdio: "pipe" });

    // The same three checks as the original script: an SVG produced is not a good SVG.
    const svg = readFileSync(out, "utf8");
    const problems = [];
    if (svg.includes("foreignObject")) problems.push("contains foreignObject: an <img src=*.svg> would show it empty");
    const m = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
    if (!m) problems.push("viewBox missing or invalid");
    else {
      const [w, h] = [Number(m[1]), Number(m[2])];
      const r = Math.max(w, h) / Math.min(w, h);
      if (r > 12) problems.push(`stretched viewBox (${r.toFixed(1)}): the text was not measured`);
    }
    if (problems.length) { bad++; console.log(`  ${f.padEnd(38)} FAIL  ${problems.join(" · ")}`); }
    else console.log(`  ${f.padEnd(38)} ok`);
  } catch (e) {
    bad++;
    console.log(`  ${f.padEnd(38)} FAIL  ${String(e.stderr ?? e.message).split("\n")[0]}`);
  }
}
console.log(`\n${mmds.length} diagrams, ${bad} failed`);
process.exit(bad ? 1 : 0);
