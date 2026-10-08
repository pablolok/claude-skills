#!/usr/bin/env node
/**
 * **The backlog dashboard** — a local page that shows where the register's work stands, what is moving, what comes
 * next, and opens every document of the project.
 *
 *   node dashboard.mjs [--port N] [--no-open]
 *
 * Listens on 127.0.0.1 (port 4317 by default, a free one if it is taken), prints the URL and opens it in the browser
 * unless `--no-open`. Stops with Ctrl+C. Read-only: it never writes a file of the project.
 *
 * This file only wires: the project (`project.mjs`), the register and the docs read from disk, the commits read from
 * git, the board (`dashboard-board.mjs`), the tree and the path guard (`dashboard-docs.mjs`), the server
 * (`dashboard-server.mjs`). Each request reads them again — the page follows the register as it is edited.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LOG_FORMAT, LOG_LIMIT, parseLog } from "./dashboard-activity.mjs";
import { buildBoard, docsToRead } from "./dashboard-board.mjs";
import { docTree, mediaType, servablePath } from "./dashboard-docs.mjs";
import { createHandler, listen } from "./dashboard-server.mjs";
import { allFiles } from "./docIndex.mjs";
import { project } from "./project.mjs";

/** The port tried first: fixed, so a bookmark keeps working. */
export const DEFAULT_PORT = 4317;

const UI_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "dashboard-ui");

/** A file of the project as text, or "" when it does not exist. */
const readText = (root, rel) => {
  const file = path.join(root, rel);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
};

/** The commits of the work tree, newest first; none outside git. */
function readCommits(root) {
  try {
    const out = execFileSync("git", ["log", `-n${LOG_LIMIT}`, LOG_FORMAT], {
      cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"],
    });
    return parseLog(out);
  } catch {
    return [];
  }
}

/** The board of the project as it is now. */
function readBoard({ root, config, backlog, history }) {
  const backlogText = readText(root, backlog);
  const docTexts = new Map(docsToRead(backlogText, config).map((rel) => [rel, readText(root, rel)]));
  const board = buildBoard({ backlog: backlogText, history: readText(root, history), config, docTexts, commits: readCommits(root) });
  return { project: { name: path.basename(root), backlog, history, docsDir: config.docsDir, citation: config.citation }, ...board };
}

/** One servable file, read only when it resolves inside the root (links followed included). */
function readServable(root, rel) {
  const clean = servablePath(rel);
  if (!clean) return null;
  const file = path.join(root, clean);
  if (!existsSync(file)) return null;
  const real = realpathSync(file);
  const realRoot = realpathSync(root);
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return null;
  return { type: mediaType(clean), body: readFileSync(real) };
}

/** Open a URL in the default browser; a machine without one keeps the printed URL. */
function openBrowser(url) {
  const [command, args] =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin" ? ["open", [url]]
    : ["xdg-open", [url]];
  try {
    spawn(command, args, { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
  } catch {
    // no browser launcher: the URL is printed
  }
}

/** `--port N`, `--no-open`. */
export function parseArgs(argv) {
  const options = { port: DEFAULT_PORT, open: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--no-open") options.open = false;
    else if (argv[i] === "--port") {
      const port = Number(argv[++i]);
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`--port: "${argv[i]}" is not a port`);
      options.port = port;
    } else throw new Error(`unknown option "${argv[i]}" (usage: dashboard.mjs [--port N] [--no-open])`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const where = project();
  if (!existsSync(path.join(where.root, where.backlog))) {
    console.error(`dashboard: no register at ${where.backlog} under ${where.root}`);
    process.exit(2);
  }
  const handler = createHandler({
    board: () => readBoard(where),
    tree: () => docTree(allFiles(where.root, where.config), where.config),
    readFile: (rel) => readServable(where.root, rel),
    uiDir: UI_DIR,
  });
  let started;
  try {
    started = await listen(handler, options.port);
  } catch (error) {
    if (error?.code !== "EADDRINUSE") throw error;
    started = await listen(handler, 0);
  }
  console.log(`backlog dashboard for ${where.root}`);
  console.log(`  ${started.url}   (Ctrl+C to stop)`);
  if (options.open) openBrowser(started.url);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`dashboard: ${error?.message ?? error}`);
    process.exit(1);
  });
}
