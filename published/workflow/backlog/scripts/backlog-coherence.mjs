#!/usr/bin/env node
/**
 * **An entry lives in one place.**
 *
 * Closing an entry is a move across two files by hand, and it half-succeeds as easily as it succeeds: entries were
 * found open AND closed at once — the history line written, the card still under `## Open` — while their commits
 * said "closed". None of the other gates could see it (each answers one question: do pointers resolve, do docs have
 * their sections, does a declared doc cite its entry), so this is a gate of its own.
 *
 * Three contradictions, one question:
 *   1. the same id open in BACKLOG.md and closed (whole) in BACKLOG-HISTORY.md;
 *   2. the same id twice among the open entries;
 *   3. the same label twice among the closed lines (`BKLG-077` and `BKLG-077 F1` are different labels: a phase).
 *
 * A register that cannot be read is SAID, not counted as zero: "0 contradictions" on a file never opened is
 * indistinguishable from a real 0.
 *
 * Usage: node <skill>/scripts/backlog-coherence.mjs   (exit 0 = coherent, 1 = a contradiction or a register unread)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { WORDS, project } from "./project.mjs";
import { closedIds, closedLines, openIds } from "./register.mjs";

const repeated = (items) => [...new Set(items.filter((x, i) => items.indexOf(x) !== i))].sort();

/**
 * The contradictions between the two registers' texts. Pure. A label closed twice is the history, not a mistake,
 * when one of its lines says the entry was reopened (`words.reopened`).
 */
export function contradictions(openText, historyText, words = WORDS) {
  const open = openIds(openText);
  const closed = closedIds(historyText);
  const lines = closedLines(historyText);
  const labels = lines.map((c) => c.label);
  const reopened = new RegExp(`(^|[^\\p{L}\\p{N}])(${words.reopened.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^\\p{L}\\p{N}])`, "iu");
  const reopenedLabels = new Set(lines.filter((c) => reopened.test(c.text)).map((c) => c.label));
  const closedSet = new Set(closed);
  return {
    openAndClosed: [...new Set(open.filter((id) => closedSet.has(id)))].sort(),
    openTwice: repeated(open),
    closedTwice: repeated(labels).filter((l) => !reopenedLabels.has(l)),
    counts: { open: open.length, closed: closed.length, phases: labels.length - closed.length },
  };
}

function read(root, rel) {
  try {
    return readFileSync(path.join(root, rel), "utf8");
  } catch {
    return null;
  }
}

function main() {
  const { root, config, backlog, history } = project();
  const openText = read(root, backlog);
  const historyText = read(root, history);
  if (openText === null || historyText === null) {
    console.log(`⛔ coherence: cannot read ${openText === null ? backlog : history} in ${root} — nothing compared.`);
    return 1;
  }
  const { openAndClosed, openTwice, closedTwice, counts } = contradictions(openText, historyText, config.words);
  console.log(
    `backlog coherence: ${counts.open} open entries · ${counts.closed} closed entries` +
      ` (+ ${counts.phases} closed phases) in ${backlog} and ${history}`,
  );
  if (!openAndClosed.length && !openTwice.length && !closedTwice.length) {
    console.log("✅ every entry lives in one place.");
    return 0;
  }
  if (openAndClosed.length) {
    console.log(`\n⛔ open AND closed (${openAndClosed.length}): ${openAndClosed.join(", ")}`);
    console.log(`   The close wrote the history line and left the card under ## ${config.words.open} (or the reverse): finish the move.`);
  }
  if (openTwice.length) console.log(`\n⛔ open twice (${openTwice.length}): ${openTwice.join(", ")} — two truths about one piece of work: merge them.`);
  if (closedTwice.length) console.log(`\n⛔ closed twice (${closedTwice.length}): ${closedTwice.join(", ")} — keep one history line.`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
