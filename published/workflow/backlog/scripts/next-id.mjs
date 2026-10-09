#!/usr/bin/env node
/**
 * **The next entry id** — the highest id the register's own documents claim, + 1.
 *
 *   node <skill>/scripts/next-id.mjs        → prints `BKLG-NNN` alone on stdout; the control count on stderr, and a
 *                                             warning there when ids above the highest claim are only mentioned
 *
 * The register's documents are everything under the backlog folder (`docsDir`): `BACKLOG.md`, `BACKLOG-HISTORY.md`,
 * the activity folders and the archive. An id is claimed by a card heading (`## BKLG-NNN` / `### BKLG-NNN`), a history
 * line (`- **BKLG-NNN**`), or an activity folder's name (created before anything cites it, possibly by a parallel
 * session) — not by every mention: a history line citing another project's entry is a mention, and counted it handed
 * out a number past that project's ids. A mention above the highest claim is reported, never turned into the next id.
 * Anything outside the backlog folder is not the register's: a bridge doc or a copied plan is not even read.
 *
 * Git-aware like the gates (tracked and new files, the ignored ones never). The GitHub mirror adds the ids on its
 * issues' titles when it adopts an issue (`backlog-github-sync.mjs sync-all`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { allFiles } from "./docIndex.mjs";
import { project } from "./project.mjs";
import { entryIdOfLine, extractBklgIds, formatBklgId, nextBklgId } from "./register.mjs";
import { isEntryPoint } from "./entry-point.mjs";

/** A file that holds a NUL byte is binary: its bytes say nothing about ids. */
const textOf = (file) => {
  const text = readFileSync(file, "utf8");
  return text.includes("\0") ? "" : text;
};

/** The ids a text claims: its card headings and its history lines, not the ids its prose cites. */
const claimedIn = (text) => text.split(/\r?\n/).map(entryIdOfLine).filter(Boolean).flatMap(extractBklgIds);

/** The ids a file's folders claim by their names (the file's own name is not a folder). */
const claimedByFolders = (file) => extractBklgIds(path.posix.dirname(file));

/**
 * The ids the register's documents claim (`ids`), every id they mention in any form (`mentioned`), and how many
 * files were read (the control count: "BKLG-001" from zero files read is not an empty register).
 * @returns {{ ids: number[], mentioned: number[], files: number }}
 */
export function registerIds(root, config) {
  const prefix = `${config.docsDir}/`;
  const files = allFiles(root, config).filter((f) => f.startsWith(prefix));
  const ids = [];
  const mentioned = [];
  for (const f of files) {
    const text = textOf(path.join(root, f));
    ids.push(...claimedByFolders(f), ...claimedIn(text));
    mentioned.push(...extractBklgIds(f), ...extractBklgIds(text));
  }
  return { ids, mentioned, files: files.length };
}

/** The id to give the next entry. */
export const nextId = (ids) => formatBklgId(nextBklgId(ids));

/**
 * The warning for ids mentioned above the highest claim — another project's entries cited in the register, or an
 * entry whose card was never written — or null when there is none. A mention below it cites an entry: no warning.
 * @param {number[]} claimed
 * @param {number[]} mentioned
 * @returns {string | null}
 */
export function unclaimedWarning(claimed, mentioned) {
  const highest = claimed.length ? Math.max(...claimed) : 0;
  const above = mentioned.filter((n) => n > highest);
  if (!above.length) return null;
  const low = Math.min(...above);
  const high = Math.max(...above);
  const range = low === high ? formatBklgId(low) : `${formatBklgId(low)}…${String(high).padStart(3, "0")}`;
  return `${range} mentioned but never claimed — another project's ids?`;
}

function main() {
  const { root, config } = project();
  const { ids, mentioned, files } = registerIds(root, config);
  const highest = ids.length ? formatBklgId(Math.max(...ids)) : "none";
  console.log(nextId(ids));
  console.error(`highest: ${highest} · ${files} file(s) read under ${config.docsDir}/`);
  const warning = unclaimedWarning(ids, mentioned);
  if (warning) console.error(`warning: ${warning}`);
}

if (isEntryPoint(import.meta.url)) {
  main();
}
