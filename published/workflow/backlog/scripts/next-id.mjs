#!/usr/bin/env node
/**
 * **The next entry id** — the highest id the register's own documents mention, + 1.
 *
 *   node <skill>/scripts/next-id.mjs        → prints `BKLG-NNN` alone on stdout; the control count on stderr
 *
 * The register's documents are everything under the backlog folder (`docsDir`): `BACKLOG.md`, `BACKLOG-HISTORY.md`,
 * the activity folders and the archive — an id is claimed by its card, its history line, and by a doc folder created
 * before anything cites it (its name or its text), possibly by a parallel session. Anything outside that folder is
 * not the register's: a bridge doc or a copied plan citing another project's entries would hand out a wrong number.
 *
 * Git-aware like the gates (tracked and new files, the ignored ones never). The GitHub mirror adds the ids on its
 * issues' titles when it adopts an issue (`backlog-github-sync.mjs sync-all`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { allFiles } from "./docIndex.mjs";
import { project } from "./project.mjs";
import { extractBklgIds, formatBklgId, nextBklgId } from "./register.mjs";

/** A file that holds a NUL byte is binary: its bytes say nothing about ids. */
const textOf = (file) => {
  const text = readFileSync(file, "utf8");
  return text.includes("\0") ? "" : text;
};

/**
 * Every id the register's documents claim — in a path under the backlog folder or in a text file's content — and
 * how many files were read (the control count: "BKLG-001" from zero files read is not an empty register).
 * @returns {{ ids: number[], files: number }}
 */
export function registerIds(root, config) {
  const prefix = `${config.docsDir}/`;
  const files = allFiles(root, config).filter((f) => f.startsWith(prefix));
  const ids = files.flatMap((f) => [...extractBklgIds(f), ...extractBklgIds(textOf(path.join(root, f)))]);
  return { ids, files: files.length };
}

/** The id to give the next entry. */
export const nextId = (ids) => formatBklgId(nextBklgId(ids));

function main() {
  const { root, config } = project();
  const { ids, files } = registerIds(root, config);
  const highest = ids.length ? formatBklgId(Math.max(...ids)) : "none";
  console.log(nextId(ids));
  console.error(`highest: ${highest} · ${files} file(s) read under ${config.docsDir}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
