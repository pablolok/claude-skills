#!/usr/bin/env node
/**
 * **The dashboard's HTTP surface** — routes requests to the collaborators it is given, nothing more.
 *
 *   GET /                  the page (`dashboard-ui/index.html`), and its `app.js`, `style.css`
 *   GET /api/board         the board (`dashboard-board.mjs`), with an ETag: the page polls it and redraws on change
 *   GET /api/tree          the documents tree
 *   GET /api/file?path=…   one document or embedded image, by its root-relative path
 *
 * What the board is, which files exist and how a file is read are the caller's (`dashboard.mjs`); this module only
 * maps a request to one of them. It listens on the loopback address alone: the register is the project's, not the
 * network's.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

/** The only address the dashboard listens on. */
export const HOST = "127.0.0.1";

/** The page's own files, by the path the browser asks for. */
const UI_FILES = Object.freeze({
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
});

/** Send a body with its type; nothing is cached by the browser but the board, which carries its ETag. */
function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-cache", ...headers });
  res.end(body);
}

/**
 * The request handler.
 * @param {{board:()=>object, tree:()=>object, readFile:(rel:string)=>({type:string, body:Buffer}|null), uiDir:string}} deps
 */
export function createHandler({ board, tree, readFile, uiDir }) {
  for (const [name, dep] of Object.entries({ board, tree, readFile })) {
    if (typeof dep !== "function") throw new TypeError(`createHandler: "${name}" must be a function`);
  }
  if (typeof uiDir !== "string" || uiDir === "") throw new TypeError("createHandler: \"uiDir\" must be a folder");

  return (req, res) => {
    const url = new URL(req.url ?? "/", `http://${HOST}`);
    if (req.method !== "GET") return send(res, 405, "text/plain", "GET only");
    try {
      const ui = UI_FILES[url.pathname];
      if (ui) return send(res, 200, ui[1], readFileSync(path.join(uiDir, ui[0])));
      if (url.pathname === "/api/board") {
        const body = JSON.stringify(board());
        const etag = `"${createHash("sha1").update(body).digest("hex")}"`;
        if (req.headers["if-none-match"] === etag) return send(res, 304, "application/json", "", { etag });
        return send(res, 200, "application/json; charset=utf-8", body, { etag });
      }
      if (url.pathname === "/api/tree") return send(res, 200, "application/json; charset=utf-8", JSON.stringify(tree()));
      if (url.pathname === "/api/file") {
        const file = readFile(url.searchParams.get("path") ?? "");
        return file ? send(res, 200, file.type, file.body) : send(res, 404, "text/plain", "not a document of this project");
      }
      return send(res, 404, "text/plain", "not found");
    } catch (error) {
      return send(res, 500, "text/plain; charset=utf-8", String(error?.stack ?? error));
    }
  };
}

/**
 * Listen on the loopback address; resolves with the URL once listening.
 * @param {ReturnType<typeof createHandler>} handler
 * @param {number} port 0 picks a free one
 */
export function listen(handler, port) {
  const server = createServer(handler);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => resolve({ server, url: `http://${HOST}:${server.address().port}/` }));
  });
}
