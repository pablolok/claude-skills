#!/usr/bin/env node
/**
 * **What the history of commits says about the entries** — the dashboard's "last touched" and its activity feed.
 *
 * Pure over the text `git log` prints with `LOG_FORMAT`; running git is the caller's job. An entry is touched by a
 * commit whose SUBJECT names its id (`BKLG-020 K9: …`) — the convention every commit of a tracked change follows. An
 * id in the body only is a mention (a related entry, a pointer), kept apart: counted as work, it made one entry's
 * commits the "last activity" of every entry they cited.
 */

/** Separators git cannot print inside a field: unit (fields) and record (commits). */
const UNIT = "\x1f";
const RECORD = "\x1e";

/** The `git log` arguments whose output `parseLog` reads: hash, author date (ISO), subject, body. */
export const LOG_FORMAT = `--format=%H${UNIT}%aI${UNIT}%s${UNIT}%b${RECORD}`;

/** How many commits the dashboard reads: enough for weeks of work, bounded so a large history stays fast. */
export const LOG_LIMIT = 400;

/** Every id a text names, in order, once each. */
const idsIn = (text) => [...new Set([...String(text).matchAll(/BKLG-(\d+)/g)].map((m) => `BKLG-${m[1].padStart(3, "0")}`))];

/**
 * The commits of a `git log LOG_FORMAT` output, newest first, each with the entries its subject names (`ids`) and
 * those only its body mentions (`mentions`).
 * @param {string} text
 * @returns {Array<{sha:string, date:string, subject:string, ids:string[], mentions:string[]}>}
 */
export function parseLog(text) {
  return String(text)
    .split(RECORD)
    .map((record) => record.replace(/^\s+/, ""))
    .filter(Boolean)
    .map((record) => {
      const [sha, date, subject = "", body = ""] = record.split(UNIT);
      return { sha, date, subject: subject.trim(), ids: idsIn(subject), mentions: idsIn(body).filter((id) => !idsIn(subject).includes(id)) };
    })
    .filter((c) => c.sha && c.date);
}

/**
 * The newest commit that names each entry: id → { date, sha, subject }.
 * @param {ReturnType<typeof parseLog>} commits newest first
 */
export function lastTouched(commits) {
  const last = new Map();
  for (const c of commits) {
    for (const id of c.ids) if (!last.has(id)) last.set(id, { date: c.date, sha: c.sha, subject: c.subject });
  }
  return last;
}
