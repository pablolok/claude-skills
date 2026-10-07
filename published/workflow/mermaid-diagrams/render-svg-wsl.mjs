#!/usr/bin/env node
/**
 * Variante WSL di `render-svg.mjs`.
 *
 * ═══ PERCHÉ ESISTE (2026-08-30) ═══
 *
 * Sotto WSL lo script normale NON funziona, e fallisce in un modo che sembra un problema di mermaid
 * mentre è di sistema: il Chromium che puppeteer scarica per Linux parte e muore subito con
 *
 *     error while loading shared libraries: libnspr4.so: cannot open shared object file
 *
 * cioè mancano le librerie di sistema che un Chrome installato porterebbe con sé. Sistemarlo vuole
 * `sudo apt install` — un permesso che una sessione non ha e non deve prendersi da sola.
 *
 * La via che funziona è girare intorno al problema invece di risolverlo: WSL può eseguire un `.exe`,
 * e la copia Windows della skill ha già `mmdc.exe` e punta al Chrome VERO installato su Windows. I
 * percorsi si traducono con `wslpath -w`, e `\\wsl.localhost\...` è leggibile da Windows, quindi il
 * repo può restare dov'è.
 *
 * Verificato il 2026-08-30 su VetrinaKarate: SVG da 34 KB, nessun `foreignObject`, viewBox 1334x1186.
 *
 * ⚠️ Serve la copia Windows della skill con le sue dipendenze installate. Se un giorno le librerie
 * Linux ci sono, `render-svg.mjs` torna a essere la strada giusta e questo file va tolto.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * La copia Windows della skill. Non e' cablata su un utente: si cerca sotto /mnt/c/Users, cosi' il
 * file vale su qualsiasi macchina. `MERMAID_WIN_SKILL` la forza, se sta altrove.
 */
function trovaSkillWindows() {
  // Un override esplicito e' comunque controllato: un percorso sbagliato deve dare il messaggio
  // utile qui, non un ENOENT per ogni diagramma piu' avanti.
  if (process.env.MERMAID_WIN_SKILL) {
    const p = process.env.MERMAID_WIN_SKILL;
    return existsSync(`${p}/node_modules/.bin/mmdc.exe`) ? p : null;
  }
  const base = "/mnt/c/Users";
  let utenti = [];
  try {
    utenti = readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return null;
  }
  // Due posti: la vecchia copia a livello utente, e i cloni che il launcher `scripts/mermaid.mjs`
  // tiene in cache (e dove installa le deps) — la versione piu' alta per prima.
  const candidati = (u) => {
    const cache = `${base}/${u}/.cache/claude-skills`;
    let cloni = [];
    try {
      cloni = readdirSync(cache).filter((n) => n.startsWith("mermaid-diagrams@"))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    } catch {
      // nessuna cache per questo utente
    }
    return [`${base}/${u}/.claude/skills/mermaid-diagrams`,
            ...cloni.map((n) => `${cache}/${n}/published/workflow/mermaid-diagrams`)];
  };
  for (const u of utenti) {
    const p = candidati(u).find((c) => existsSync(`${c}/node_modules/.bin/mmdc.exe`));
    if (p) return p;
  }
  return null;
}

const WIN_SKILL = trovaSkillWindows();
const MMDC = WIN_SKILL ? `${WIN_SKILL}/node_modules/.bin/mmdc.exe` : null;

const dir = process.argv[2];
if (!dir) {
  console.error("uso: node render-svg-wsl.mjs <cartella-con-i-mmd>");
  process.exit(2);
}
if (!MMDC) {
  console.error(
    "Copia Windows della skill con le deps non trovata sotto /mnt/c/Users/*/.cache/claude-skills\n" +
    "(ne' nella vecchia /mnt/c/Users/*/.claude/skills/mermaid-diagrams). Lancia una volta da Windows\n" +
    "`node scripts/mermaid.mjs check <un file.md>`, che la clona e le installa, oppure indica il percorso con\n" +
    "MERMAID_WIN_SKILL=<cartella della skill con node_modules>"
  );
  process.exit(2);
}

const win = (p) => execFileSync("wslpath", ["-w", p], { encoding: "utf8" }).trim();
const mmds = readdirSync(dir).filter((f) => f.endsWith(".mmd"));
if (mmds.length === 0) {
  console.error(`nessun .mmd in ${dir}`);
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

    // Gli stessi tre controlli dello script originale: un SVG prodotto non è un SVG buono.
    const svg = readFileSync(out, "utf8");
    const problemi = [];
    if (svg.includes("foreignObject")) problemi.push("contiene foreignObject: un <img src=*.svg> lo mostrerebbe vuoto");
    const m = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
    if (!m) problemi.push("viewBox assente o non valido");
    else {
      const [w, h] = [Number(m[1]), Number(m[2])];
      const r = Math.max(w, h) / Math.min(w, h);
      if (r > 12) problemi.push(`viewBox sproporzionato (${r.toFixed(1)}): il testo non è stato misurato`);
    }
    if (problemi.length) { bad++; console.log(`  ${f.padEnd(38)} FAIL  ${problemi.join(" · ")}`); }
    else console.log(`  ${f.padEnd(38)} ok`);
  } catch (e) {
    bad++;
    console.log(`  ${f.padEnd(38)} FAIL  ${String(e.stderr ?? e.message).split("\n")[0]}`);
  }
}
console.log(`\n${mmds.length} diagrammi, ${bad} falliti`);
process.exit(bad ? 1 : 0);
