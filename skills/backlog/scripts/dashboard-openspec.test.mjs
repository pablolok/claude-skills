/** Tests of `dashboard-openspec`: reading OpenSpec's changes and specs, and tying them to the register's entries. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBoard } from "./dashboard-board.mjs";
import {
  changeOf, deltaCounts, linkEntries, parseTasks, phasesFromChanges, proposalTitle, proposalWhy, readOpenSpec, sectionPhases, specCounts,
} from "./dashboard-openspec.mjs";
import { parseConfig } from "./project.mjs";

const TASKS = `# Tasks

## 1. Setup
- [x] 1.1 Create the scene
- [x] 1.2 Load the assets

## 2. Gameplay
- [x] 2.1 Countdown
- [ ] 2.2 Fireworks
  - [ ] 2.2.1 particles

## 3. Polish
- [ ] 3.1 Sound

\`\`\`
- [ ] 9.9 not a task, inside a fence
\`\`\`
`;

const FILES = {
  "openspec/project.md": "# Project",
  "openspec/specs/countdown/spec.md": "# Countdown\n### Requirement: Shows the time\n#### Scenario: Midnight\n#### Scenario: Before\n### Requirement: Rings",
  "openspec/changes/add-fireworks/proposal.md": "# Change: Add fireworks\n\n## Why\nThe night needs\nlights.\n\nMore.\n\n## What Changes\nTracked as BKLG-002.",
  "openspec/changes/add-fireworks/tasks.md": TASKS,
  "openspec/changes/add-fireworks/specs/fireworks/spec.md":
    "## ADDED Requirements\n### Requirement: Burst\n### Requirement: Colors\n## MODIFIED Requirements\n### Requirement: Shows the time\n## RENAMED Requirements\n- FROM: `### Requirement: A`\n- TO: `### Requirement: B`",
  "openspec/changes/add-fireworks/specs/show/sparks/spec.md": "## ADDED Requirements\n### Requirement: Sparks",
  "openspec/changes/archive/2026-11-01-add-countdown/proposal.md": "# Add countdown",
  "openspec/changes/archive/2026-11-01-add-countdown/tasks.md": "## 1. Do\n- [x] 1.1 it",
};
const read = (rel) => FILES[rel] ?? "";

test("a path belongs to an active or an archived change, or to none", () => {
  assert.deepEqual(changeOf("openspec/changes/add-x/tasks.md"), { id: "add-x", dir: "openspec/changes/add-x", archived: false, date: null });
  assert.deepEqual(changeOf("openspec/changes/archive/2026-01-02-add-x/proposal.md"),
    { id: "add-x", dir: "openspec/changes/archive/2026-01-02-add-x", archived: true, date: "2026-01-02" });
  assert.equal(changeOf("openspec/changes/README.md"), null);
  assert.equal(changeOf("openspec/specs/a/spec.md"), null);
  assert.equal(changeOf("docs/x.md"), null);
  assert.equal(changeOf("docs/implementations/../../openspec/changes/y/proposal.md")?.id, "y");
});

test("tasks are read by section, nested ones counted, fenced ones not", () => {
  const sections = parseTasks(TASKS);
  assert.deepEqual(sections.map((s) => [s.name, s.label, s.tasks.length]), [["1", "Setup", 2], ["2", "Gameplay", 3], ["3", "Polish", 1]]);
  assert.deepEqual(sectionPhases(sections).map((p) => [p.name, p.state, p.note]),
    [["1", "done", "2/2 task"], ["2", "active", "1/3 task"], ["3", "planned", "0/1 task"]]);
  assert.deepEqual(parseTasks("- [x] a\n- [ ] b").map((s) => [s.name, s.tasks.length]), [["1", 2]]);
});

test("OpenSpec 2 boxes: only x (any case, any spacing) is done; ~, -, empty are open; follow-up bullets are not tasks", () => {
  const sections = parseTasks("# Tasks\n\n## 1. A\n- [ x] 1.1 a\n- [X ] 1.2 b\n- [~] 1.3 c\n- [-] 1.4 d\n- [] 1.5 e\n\n## Workflow follow-up\n\n- Archive the change.");
  assert.deepEqual(sections.map((s) => [s.name, s.label]), [["1", "A"]]);
  assert.deepEqual(sections[0].tasks.map((t) => t.done), [true, true, false, false, false]);
});

test("a proposal gives its title and the first paragraph of its Why", () => {
  assert.equal(proposalTitle(FILES["openspec/changes/add-fireworks/proposal.md"]), "Add fireworks");
  assert.equal(proposalWhy(FILES["openspec/changes/add-fireworks/proposal.md"]), "The night needs lights.");
  assert.equal(proposalTitle("no heading"), null);
});

test("specs count requirements and scenarios; deltas count by section", () => {
  assert.deepEqual(specCounts(FILES["openspec/specs/countdown/spec.md"]), { requirements: 2, scenarios: 2 });
  assert.deepEqual(deltaCounts(FILES["openspec/changes/add-fireworks/specs/fireworks/spec.md"]), { added: 2, modified: 1, removed: 0, renamed: 1 });
});

test("the whole of OpenSpec: active and archived changes, specs, totals; none without the folder", () => {
  const spec = readOpenSpec(Object.keys(FILES), read);
  assert.equal(spec.project, "openspec/project.md");
  assert.deepEqual(spec.changes.map((c) => [c.id, c.title, c.tasks]), [["add-fireworks", "Add fireworks", { done: 3, total: 6 }]]);
  assert.equal(spec.changes[0].docs[0], "openspec/changes/add-fireworks/proposal.md");
  assert.deepEqual(spec.changes[0].capabilities, ["fireworks", "show/sparks"]);
  assert.deepEqual(spec.changes[0].cites, ["BKLG-002"]);
  assert.deepEqual(spec.archived.map((c) => [c.id, c.date]), [["add-countdown", "2026-11-01"]]);
  assert.deepEqual(spec.totals, { active: 1, archived: 1, specs: 1, requirements: 2, tasksDone: 3, tasksTotal: 6 });
  assert.equal(readOpenSpec(["README.md"], read), null);
});

test("an entry linking a change's file takes its task sections as phases, and the two are tied both ways", () => {
  const spec = readOpenSpec(Object.keys(FILES), read);
  const backlog = [
    "# Backlog", "", "## Open", "",
    "### BKLG-001 — Fireworks", "- **Status**: in-progress — gameplay", "- **Priority**: high",
    "- **Doc**: [proposal](../../openspec/changes/add-fireworks/proposal.md)", "- **Summary**: boom", "",
    "### BKLG-002 — Sound", "- **Status**: open", "- **Priority**: low", "- **Doc**: —", "- **Summary**: later", "",
  ].join("\n");
  const board = buildBoard({ backlog, history: "", config: parseConfig(null), extraPhases: phasesFromChanges(spec) });
  linkEntries(board, spec);
  const fireworks = board.entries.find((e) => e.id === "BKLG-001");
  assert.deepEqual(fireworks.phases.map((p) => p.state), ["done", "active", "planned"]);
  assert.deepEqual(board.totals.phases, { done: 1, active: 1, planned: 1, dropped: 0 });
  assert.deepEqual(fireworks.changes, ["add-fireworks"]);
  assert.deepEqual(board.entries.find((e) => e.id === "BKLG-002").changes, ["add-fireworks"]);
  assert.deepEqual(spec.changes[0].entries, ["BKLG-001", "BKLG-002"]);
});
