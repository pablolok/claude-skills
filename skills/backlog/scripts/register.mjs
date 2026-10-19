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
/** An ISO day (`2026-09-29`), captured. */
export const ISO_DAY = /\b(\d{4}-\d{2}-\d{2})\b/;
/** The dash that opens a title (`— Title`). */
const LEADING_DASH = /^[—–-]\s*/;

/** The title in the text after an entry's id: up to the first spaced dash, the dash that opens it dropped. */
const titleOf = (after) => after.trim().replace(LEADING_DASH, "").split(/\s+[—–]\s+/)[0].trim();

/**
 * Every entry number a text mentions, in any form (a heading, a citation, a folder name). A mention is not a claim:
 * `next-id` counts only the ids of card headings, history lines and folder names.
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
 * The closed entries of BACKLOG-HISTORY.md, each with its full label, its phase ("" when it closes the whole
 * entry), its title, the index of its line and whether it is a card. Both shapes a history keeps: the list line,
 * and the whole entry moved with its heading (`## BKLG-NNN — title` — some projects archive the card as it was).
 * The title sits inside the bold (`- **BKLG-NNN — Title** — …`) or after it (`- **BKLG-NNN** Title — …`).
 * One line at a time: a gate reads the added lines of a diff with it, so the lines an entry wraps onto are the
 * caller's to join.
 */
export function closedLines(text) {
  const found = [];
  text.split(/\r?\n/).forEach((l, index) => {
    const line = CLOSED_LINE.exec(l);
    if (line) {
      // After the id, inside the bold: a PHASE (`F1`, `T6`) — or the entry's TITLE (`— Title`), which closes it whole.
      const rest = line[2].trim();
      const titled = LEADING_DASH.test(rest);
      const phase = titled ? "" : rest;
      const title = titled ? rest.replace(LEADING_DASH, "").trim() : titleOf(l.slice(line[0].length));
      const label = phase ? `${line[1]} ${phase}` : line[1];
      found.push({ id: line[1], phase, label, title, index, card: false, text: l });
      return;
    }
    const heading = OPEN_HEADING.exec(l);
    if (heading) {
      const title = titleOf(heading[3] ?? "");
      found.push({ id: heading[2], phase: "", label: heading[2], title, index, card: true, text: l });
    }
  });
  return found;
}

/**
 * The day an entry closed on: the date its close field gives (`**Done**: 2026-09-29`, the project's name for it), else
 * its obsolete field's (`**Obsolete** on 2026-09-27`), else the first date it mentions — or null.
 * @param {string} text the entry, its wrapped lines included
 * @param {object} config
 */
export function closeDayOf(text, config = DEFAULTS) {
  for (const canonical of ["Done", "Obsolete"]) {
    const name = fieldName(config, canonical).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const field = new RegExp(`\\*\\*${name}\\*\\*[^\\d\\n]{0,12}${ISO_DAY.source}`, "i").exec(text);
    if (field) return field[1];
  }
  return ISO_DAY.exec(text)?.[1] ?? null;
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
 * indented lines is joined, paragraphs included: a blank line does not end it (an indented block after one stays in
 * its list item, as in markdown), the next unindented line does. Ending it at the blank line cut a several-paragraph
 * Summary to its first paragraph — and the GitHub mirror, comparing the cut body with itself, reported «up to date».
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
    if (line.trim() === "") continue;
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
