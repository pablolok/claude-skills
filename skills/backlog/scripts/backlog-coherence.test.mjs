/** Tests of `backlog-coherence.mjs`: one entry, one place. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { contradictions } from "./backlog-coherence.mjs";
import { parseConfig } from "./project.mjs";

const open = (...ids) => `## Open\n\n${ids.map((id) => `### ${id} — t\n- **Status**: open\n`).join("\n")}`;
const history = (...labels) => labels.map((l) => `- **${l}** done`).join("\n");

test("a coherent pair has no contradiction — and the counts say what was read", () => {
  const r = contradictions(open("BKLG-003", "BKLG-002"), history("BKLG-001", "BKLG-002 F1"));
  assert.deepEqual([r.openAndClosed, r.openTwice, r.closedTwice], [[], [], []]);
  assert.deepEqual(r.counts, { open: 2, closed: 1, phases: 1 });
});

test("⛔ an entry open and closed at once", () => {
  assert.deepEqual(contradictions(open("BKLG-004"), history("BKLG-004")).openAndClosed, ["BKLG-004"]);
});

test("· a closed PHASE does not make its open entry a contradiction", () => {
  assert.deepEqual(contradictions(open("BKLG-004"), history("BKLG-004 F1")).openAndClosed, []);
});

test("· closed twice is the history when one line says the entry was reopened (the project's word)", () => {
  const history = "## BKLG-246 — the final card\n\n- **BKLG-246** _(RIAPERTO 2026-07-24)_ — first close\n";
  assert.deepEqual(contradictions("", history).closedTwice, ["BKLG-246"], "control: in English 'riaperto' means nothing");
  const { words } = parseConfig(JSON.stringify({ words: { reopened: ["riaperto", "riaperta"] } }));
  assert.deepEqual(contradictions("", history, words).closedTwice, []);
});

test("⛔ the same entry open twice, the same label closed twice", () => {
  assert.deepEqual(contradictions(open("BKLG-005", "BKLG-005"), "").openTwice, ["BKLG-005"]);
  assert.deepEqual(contradictions("", history("BKLG-006", "BKLG-006")).closedTwice, ["BKLG-006"]);
  // Control: an entry and its phase are two labels.
  assert.deepEqual(contradictions("", history("BKLG-006", "BKLG-006 F1")).closedTwice, []);
});
