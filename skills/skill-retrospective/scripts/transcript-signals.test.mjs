import { test } from "node:test";
import assert from "node:assert/strict";
import { CHURN_AT, REPEAT_AT, parse, render, signals } from "./transcript-signals.mjs";

const use = (id, name, input, at = "2026-01-01T00:00:00Z") =>
  ({ type: "assistant", timestamp: at, message: { content: [{ type: "tool_use", id, name, input }], usage: { output_tokens: 10 } } });
const result = (id, text, isError = true) =>
  ({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, is_error: isError, content: text }] } });

test("a hook's refusal is told apart from an ordinary error, each named with its tool", () => {
  const s = signals([
    use("a", "Bash", { command: "sed -i x f.py" }), result("a", "PreToolUse:Bash hook error: BLOCKED: edit with Edit"),
    use("b", "Read", { file_path: "x" }), result("b", "File does not exist.\nmore"),
    use("c", "Read", { file_path: "y" }), result("c", "fine", false),
  ]);
  assert.deepEqual(s.blocked, ["Bash: PreToolUse:Bash hook error: BLOCKED: edit with Edit"]);
  assert.deepEqual(s.errors, ["Read: File does not exist."]);
});

test("the same call made REPEAT_AT times is a loop, fewer is not", () => {
  const same = Array.from({ length: REPEAT_AT }, (_, i) => use(`r${i}`, "Bash", { command: "run tests" }));
  const fewer = Array.from({ length: REPEAT_AT - 1 }, (_, i) => use(`f${i}`, "Bash", { command: "build" }));
  const s = signals([...same, ...fewer]);
  assert.equal(s.repeated.length, 1);
  assert.match(s.repeated[0], new RegExp(`^${REPEAT_AT}× Bash .*run tests`));
});

test("a file edited CHURN_AT times is churn; reads don't count", () => {
  const edits = Array.from({ length: CHURN_AT }, (_, i) => use(`e${i}`, "Edit", { file_path: "a.py", old_string: `${i}` }));
  const reads = Array.from({ length: CHURN_AT }, (_, i) => use(`d${i}`, "Read", { file_path: "b.py", offset: i }));
  assert.deepEqual(signals([...edits, ...reads]).churn, [`${CHURN_AT}× a.py`]);
});

test("commands that throw work away are listed; ordinary git is not", () => {
  const s = signals([use("u", "Bash", { command: "git reset --hard HEAD~1" }), use("v", "Bash", { command: "git status" })]);
  assert.deepEqual(s.undone, ["git reset --hard HEAD~1"]);
});

test("duration, calls, tokens and the task come out of the records; bad lines are skipped", () => {
  const records = parse([
    JSON.stringify({ type: "user", timestamp: "2026-01-01T00:00:00Z", message: { content: "Build the thing\nwith detail" } }),
    "not json",
    JSON.stringify(use("a", "Read", { file_path: "x" }, "2026-01-01T00:30:00Z")),
  ].join("\n"));
  const s = signals(records);
  assert.equal(s.task, "Build the thing");
  assert.equal(s.minutes, 30);
  assert.equal(s.toolCalls, 1);
  assert.equal(s.outputTokens, 10);
});

test("a transcript with no signal renders as one line saying so", () => {
  const text = render("agent-x.jsonl", signals([use("a", "Read", { file_path: "x" })]));
  assert.match(text, /no signal$/);
  assert.equal(text.split("\n").length, 2);
});
