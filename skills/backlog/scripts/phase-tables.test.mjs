/**
 * Tests of `phase-tables.mjs`: multi-phase work written as a numbered list, with no phase table the dashboard reads —
 * each case that is flagged next to one that is not; one subprocess test for the exit code the whole program gives.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { longestNumberedList, missingTables } from "./phase-tables.mjs";
import { parseConfig } from "./project.mjs";
import { openEntries } from "./register.mjs";

const config = parseConfig(null);

const card = (id, status, doc, summary = "One line.") => `## ${id} — Work ${id}
- **Status**: ${status}
- **Priority**: medium
- **Added**: 2026-10-01
- **Doc**: ${doc}
- **Summary**: ${summary}
`;

const register = (...cards) => `# Backlog\n\n## Open\n\n${cards.join("\n")}\n## Done / Archived\n`;

const STEPS = "# Plan\n\n1. parse the file\n2. dedupe the rows\n3. write the report\n";
const TABLE = "| | state |\n|---|---|\n| **P1** parse | ✅ — done |\n| **P2** dedupe | 📋 |\n";
const docOf = (id) => `features/${id.toLowerCase()}/spec.md`;
const docPath = (id) => `docs/implementations/${docOf(id)}`;

const judge = (registerText, docs) => missingTables(openEntries(registerText, config), new Map(Object.entries(docs)), config);

test("⛔ an entry in progress whose doc has three numbered steps and no phase table is flagged", () => {
  const result = judge(register(card("BKLG-001", "in-progress — step 2", `[spec](${docOf("BKLG-001")})`)), {
    [docPath("BKLG-001")]: STEPS,
  });
  assert.deepEqual(result.missing.map((m) => [m.id, m.status, m.where, m.steps]), [["BKLG-001", "in-progress", docPath("BKLG-001"), 3]]);
  assert.equal(result.examined, 1);
  assert.equal(result.inProgress, 1);
});

test("control: the same entry with a phase table in its doc, or in its card, passes", () => {
  const inDoc = judge(register(card("BKLG-001", "in-progress", `[spec](${docOf("BKLG-001")})`)), {
    [docPath("BKLG-001")]: `${STEPS}\n${TABLE}`,
  });
  assert.deepEqual(inDoc.missing, []);
  assert.equal(inDoc.withTable, 1);
  const inCard = judge(register(card("BKLG-001", "in-progress", `[spec](${docOf("BKLG-001")})`, `Steps below.\n\n${TABLE}`)), {
    [docPath("BKLG-001")]: STEPS,
  });
  assert.deepEqual(inCard.missing, []);
});

test("· an entry not started is listed with its status, not as in progress", () => {
  const result = judge(register(card("BKLG-002", "open", "—", "Steps:\n\n1. parse\n2. dedupe\n3. report"), card("BKLG-003", "blocked — on [[BKLG-002]]", `[spec](${docOf("BKLG-003")})`)), {
    [docPath("BKLG-003")]: STEPS,
  });
  assert.deepEqual(result.missing.map((m) => [m.id, m.status, m.where]), [["BKLG-002", "open", "card"], ["BKLG-003", "blocked", docPath("BKLG-003")]]);
  assert.equal(result.inProgress, 0);
});

test("· a numbered list inside fenced code is an example, not steps", () => {
  const fenced = "# Plan\n\n```\n1. a\n2. b\n3. c\n```\n";
  assert.equal(longestNumberedList(fenced), 0);
  assert.deepEqual(judge(register(card("BKLG-001", "in-progress", `[spec](${docOf("BKLG-001")})`)), { [docPath("BKLG-001")]: fenced }).missing, []);
});

test("· a list of two steps is not multi-phase work, nor are two lists of two", () => {
  assert.equal(longestNumberedList("1. a\n2. b\n"), 2);
  assert.equal(longestNumberedList("1. a\n2. b\n\nA paragraph between.\n\n1. c\n2. d\n"), 2);
  assert.deepEqual(judge(register(card("BKLG-001", "in-progress", `[spec](${docOf("BKLG-001")})`)), { [docPath("BKLG-001")]: "1. a\n2. b\n" }).missing, []);
});

test("· blank and indented lines continue a list; nested items and other lists do not add to it", () => {
  assert.equal(longestNumberedList("1. a\n\n   more of a\n   1. nested\n   2. nested\n2. b\n\n3. c\n"), 3);
  assert.equal(longestNumberedList("  1. indented\n  2. indented\n  3. indented\n"), 0);
});

test("· an archived doc linked by the entry is someone else's report: its list is not read", () => {
  const result = judge(register(card("BKLG-001", "in-progress", "[old](archive/old/report.md)")), {
    "docs/implementations/archive/old/report.md": STEPS,
  });
  assert.deepEqual(result.missing, []);
});

test("the program exits 1 on an entry in progress without a table, 0 once it has one, and prints what it examined", () => {
  const root = mkdtempSync(join(tmpdir(), "phase-tables-"));
  const script = join(dirname(fileURLToPath(import.meta.url)), "phase-tables.mjs");
  const write = (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  const run = () => spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  try {
    write("docs/implementations/BACKLOG.md", register(
      card("BKLG-001", "in-progress", `[spec](${docOf("BKLG-001")})`),
      card("BKLG-002", "open", `[spec](${docOf("BKLG-002")})`),
    ));
    write(docPath("BKLG-001"), STEPS);
    write(docPath("BKLG-002"), STEPS);
    const red = run();
    assert.equal(red.status, 1, red.stdout + red.stderr);
    assert.match(red.stdout, /examined 2 open entries \(1 in progress\) · 2 docs read · 0 with a phase table · 2 with a numbered list/);
    assert.match(red.stdout, /BKLG-001/);
    assert.match(red.stdout, /phase table in the form the dashboard reads/);

    write(docPath("BKLG-001"), `${STEPS}\n${TABLE}`);
    const green = run();
    assert.equal(green.status, 0, green.stdout + green.stderr);
    assert.match(green.stdout, /1 with a phase table · 1 with a numbered list/);
    assert.match(green.stdout, /📋 1 not started[\s\S]*BKLG-002/, "a not-started entry is still listed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("control: a register that cannot be read fails, it does not pass by reading nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "phase-tables-none-"));
  const script = join(dirname(fileURLToPath(import.meta.url)), "phase-tables.mjs");
  try {
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /cannot read/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
