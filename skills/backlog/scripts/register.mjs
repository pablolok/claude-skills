#!/usr/bin/env node
/**
 * **What an entry looks like in the two registers** — written once; every gate and the mirror read it from here.
 *
 * Two copies of "where does an entry start and end" disagreed in practice: one gate looked for `### BKLG-NNN`, another
 * for `## BKLG-NNN`, and the second read 0 open entries out of 16 for weeks while printing a plausible green. So the
 * layout has one owner, and it accepts both layouts projects actually use:
 *
 *   BACKLOG.md          an open entry is a heading `## BKLG-NNN — title` or `### BKLG-NNN — title`;
 *   BACKLOG-HISTORY.md  a closed entry is a list line `- **BKLG-NNN** …` — the bold may carry a PHASE after the id
 *                       (`- **BKLG-077 F1** …`), and a closed phase does not close its entry — or the whole card
 *                       moved there with its heading.
 *
 * The format's own template (`BKLG-NNN`, letters) is never an entry. Pure functions: callers pass the text in.
 */
import { DEFAULTS, WORDS, fieldName } from "./project.mjs";

/** An open entry's heading: level 2 or 3, the id first. */
const OPEN_HEADING = /^(#{2,3}) (BKLG-\d+)\b(?:\s+[—–-]\s+(.*))?/;
/** A closed line: the id in bold, optionally followed by a phase inside the same bold. */
const CLOSED_LINE = /^- \*\*(BKLG-\d+)([^*\n]*)\*\*/;

/**
 * Every entry number a text mentions, in any form (a heading, a citation, a folder name) — what claims an id when
 * the next one is allocated.
 * @param {string} text
 * @returns {number[]}
 */
export function extractBklgIds(text) {
  return [...String(text).matchAll(/BKLG-(\d+)/g)].map((m) => Number(m[1]));
}

/**
 * The next free number: the highest of every source + 1 (the first entry is 1).
 * @param {number[][]} idSources
 * @returns {number}
 */
export function nextBklgId(...idSources) {
  const all = idSources.flat();
  return (all.length ? Math.max(...all) : 0) + 1;
}

/** Zero-pad an entry number to the canonical 3-digit id string. */
export function formatBklgId(n) {
  return `BKLG-${String(n).padStart(3, "0")}`;
}

/** The ids of the open entries: the headings, not the `[[BKLG-NNN]]` mentions in the text. */
export function openIds(text) {
  return text.split(/\r?\n/).map((l) => OPEN_HEADING.exec(l)?.[2]).filter(Boolean);
}

/**
 * The closed entries of BACKLOG-HISTORY.md, each with its full label and its phase ("" when it closes the whole
 * entry). Both shapes a history keeps: the condensed list line, and the whole entry moved with its heading
 * (`## BKLG-NNN — title` — some projects archive the card as it was).
 */
export function closedLines(text) {
  const found = [];
  for (const l of text.split(/\r?\n/)) {
    const line = CLOSED_LINE.exec(l);
    if (line) {
      // After the id, inside the bold: a PHASE (`F1`, `T6`) — or the entry's TITLE (`— Title`), which closes it whole.
      const rest = line[2].trim();
      const phase = /^[—–-]/.test(rest) ? "" : rest;
      found.push({ id: line[1], phase, label: phase ? `${line[1]} ${phase}` : line[1], text: l });
      continue;
    }
    const heading = OPEN_HEADING.exec(l);
    if (heading) found.push({ id: heading[2], phase: "", label: heading[2], text: l });
  }
  return found;
}

/** The ids closed as a WHOLE — a closed phase leaves its entry open. */
export function closedIds(text) {
  return closedLines(text).filter((c) => c.phase === "").map((c) => c.id);
}

/** The id when a line opens an entry in either register (a commit diff is read one line at a time), else null. */
export function entryIdOfLine(line) {
  return OPEN_HEADING.exec(line)?.[2] ?? CLOSED_LINE.exec(line)?.[1] ?? null;
}

/**
 * An entry's text, from its heading (or history line) to where it ends: the next entry, the next history line, or a
 * heading of the same or a higher level (the end of the `## Open` section). A `###` subheading inside a `##` entry
 * stays in it. Empty when absent.
 */
export function entryBlock(text, id) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => {
    const h = OPEN_HEADING.exec(l);
    if (h) return h[2] === id;
    const c = CLOSED_LINE.exec(l);
    return Boolean(c) && c[1] === id && c[2].trim() === "";
  });
  if (start < 0) return "";
  const level = (OPEN_HEADING.exec(lines[start])?.[1] ?? "##").length;
  const end = lines.findIndex((l, i) => {
    if (i <= start) return false;
    if (OPEN_HEADING.test(l) || CLOSED_LINE.test(l)) return true;
    const h = /^(#{1,6}) /.exec(l);
    return Boolean(h) && h[1].length <= level;
  });
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

/** `**Field**:` opening an unindented list item (an indented one belongs to the value above it). */
const FIELD = /^[-*]\s+\*\*([^*]+)\*\*\s*:\s*(.*)$/;

/**
 * An entry block's fields, keyed by their CANONICAL name (`Architecture`), read under the project's name for each
 * (`Architettura`) — so the gates ask for one name whatever the register's language. A value that wraps onto
 * indented lines is joined; an unindented line or a blank one ends it.
 */
export function entryFields(block, config) {
  const canonicalOf = new Map();
  for (const [canonical, own] of Object.entries(config?.fieldNames ?? {})) canonicalOf.set(own.toLowerCase(), canonical);
  const fields = {};
  let last = null;
  for (const line of block.split(/\r?\n/)) {
    const f = FIELD.exec(line);
    if (f) {
      const name = f[1].trim();
      last = canonicalOf.get(name.toLowerCase()) ?? name;
      fields[last] = f[2].trim();
      continue;
    }
    if (last && /^\s+\S/.test(line)) {
      fields[last] = `${fields[last]} ${line.trim()}`.trim();
      continue;
    }
    last = null;
  }
  return fields;
}

/** The `- **Field**:` opening a canonical field under the project's name, for gates that read a field line by line. */
export function fieldLine(config, canonical) {
  const name = fieldName(config, canonical).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*[-*]\\s+\\*\\*${name}\\*\\*\\s*:`, "i");
}

/**
 * Does a line open the section of the open entries — `## Open`, or `## <words.open>` in the project's words? The one
 * matcher for every reader of that section (how far each reads after it is its own question).
 */
export function isOpenHeading(line, config = DEFAULTS) {
  const word = (config?.words?.open ?? WORDS.open).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^## ${word}\\s*$`, "iu").test(line);
}

/**
 * The open entries of `BACKLOG.md` with their title and fields — only those under the open section (`## Open`, or the
 * project's `words.open`); a pending ledger's lines are not entries.
 */
export function openEntries(text, config = DEFAULTS) {
  const lines = text.split(/\r?\n/);
  const openAt = lines.findIndex((l) => isOpenHeading(l, config));
  if (openAt < 0) return [];
  const nextSection = lines.findIndex((l, i) => i > openAt && /^## /.test(l) && !OPEN_HEADING.test(l));
  const section = lines.slice(openAt + 1, nextSection < 0 ? undefined : nextSection).join("\n");
  return openIds(section).map((id) => {
    const block = entryBlock(section, id);
    const heading = OPEN_HEADING.exec(block.split(/\r?\n/)[0]);
    return { id, title: (heading?.[3] ?? "").trim(), fields: entryFields(block, config), block };
  });
}
