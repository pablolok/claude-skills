#!/usr/bin/env node
/**
 * **Which documents the dashboard lets you open, and how they are grouped** — pure over the project's file list.
 *
 * The list is the one the gates judge (`docIndex.allFiles`: what git keeps), so the dashboard shows exactly the
 * documents the project has — never a walk of the disk with its own skip list. A request names a file by its
 * root-relative path; `servablePath` is the guard every request passes: inside the root, a document or an image a
 * document embeds, nothing else.
 */
import path from "node:path";
import { ASSET_EXTENSIONS } from "./docIndex.mjs";
import { DEFAULTS } from "./project.mjs";

/** The groups of the documents tree, in the order the sidebar lists them. */
export const DOC_GROUPS = Object.freeze(["register", "work", "architecture", "archive", "other"]);

/** The register's own folders of work docs (a folder per entry). */
const WORK_FOLDERS = Object.freeze(["features", "bugs", "analysis", "diagnostic"]);

/** What a request may read: markdown, and the images and files the documents embed or link. */
const MEDIA_TYPES = Object.freeze({
  md: "text/markdown; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  ico: "image/x-icon",
});

/** The media type of a servable file, or null when the dashboard does not serve that kind of file. */
export function mediaType(rel) {
  const ext = path.posix.extname(rel).slice(1).toLowerCase();
  return ext === "md" || ASSET_EXTENSIONS.includes(ext) ? (MEDIA_TYPES[ext] ?? null) : null;
}

/**
 * The root-relative path a request may read, normalised — or null: absolute, escaping the root, inside `.git`, or
 * not a document or an embedded asset.
 * @param {string} rel
 */
export function servablePath(rel) {
  if (typeof rel !== "string" || rel.trim() === "" || rel.includes("\0")) return null;
  const clean = path.posix.normalize(rel.replace(/\\/g, "/"));
  if (path.posix.isAbsolute(clean) || /^[a-z]:/i.test(clean) || clean === ".." || clean.startsWith("../")) return null;
  if (clean.split("/").includes(".git")) return null;
  return mediaType(clean) ? clean : null;
}

/** The group a markdown file belongs to. */
function groupOf(rel, config) {
  const docs = `${config.docsDir}/`;
  if (rel.startsWith(`${docs}archive/`)) return "archive";
  if (rel.startsWith(docs)) {
    const first = rel.slice(docs.length).split("/")[0];
    return WORK_FOLDERS.includes(first) ? "work" : "register";
  }
  if (rel.startsWith(`${config.architectureDir}/`)) return "architecture";
  return "other";
}

/**
 * The documents tree: every markdown file of the project, grouped, sorted by path.
 * @param {string[]} files root-relative paths
 * @param {object} config
 * @returns {Array<{group:string, docs:string[]}>}
 */
export function docTree(files, config = DEFAULTS) {
  const groups = new Map(DOC_GROUPS.map((g) => [g, []]));
  for (const rel of files) {
    if (path.posix.extname(rel).toLowerCase() !== ".md") continue;
    groups.get(groupOf(rel, config)).push(rel);
  }
  return DOC_GROUPS.map((group) => ({ group, docs: groups.get(group).sort() }));
}
