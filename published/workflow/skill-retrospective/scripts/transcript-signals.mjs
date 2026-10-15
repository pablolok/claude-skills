/**
 * Where agents lost time, read from their transcripts — the evidence a retrospective needs and a worker's own report
 * leaves out (its failed calls, the hooks that blocked it, the same command run again and again, a file edited over
 * and over, work undone).
 *
 * A transcript is a JSONL file the harness writes per agent (`~/.claude/projects/<project>/<session>/subagents/
 * agent-*.jsonl`, and the session's own `<session>.jsonl`). They run to hundreds of thousands of tokens: never read one
 * whole — run this and read its digest, then open a transcript only at the lines a signal points to.
 *
 *   node transcript-signals.mjs <file.jsonl | folder> [...] [--since <ISO date>] [--top <n>]
 *
 * A folder means every `*.jsonl` in it; `--since` keeps the transcripts that ran after that time (the last
 * retrospective's commit date); `--top` caps each list (default 8).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

/** A tool error the harness raised because a hook refused the call. */
const HOOK_BLOCK = /hook error|BLOCKED/i;
/** A shell command that throws work away. */
const UNDO = /\bgit\s+(reset\s+--hard|checkout\s+--|restore\b|revert\b|stash\b|clean\s+-[a-z]*f)/i;
/** A call made this many times with the same input is a loop. */
export const REPEAT_AT = 3;
/** A file edited this many times is churn. */
export const CHURN_AT = 5;

/** The transcript's lines as records; a line that is not JSON is skipped. */
export function parse(text) {
  return text.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

const blocks = (record) => (Array.isArray(record?.message?.content) ? record.message.content : []);
const firstLine = (value) => String(typeof value === "string" ? value : JSON.stringify(value ?? "")).split("\n")[0].slice(0, 200);
const pathOf = (input) => input?.file_path ?? input?.path ?? input?.notebook_path;

/**
 * The records from `since` on (all of them without it). An agent resumed for several tasks keeps one transcript: its
 * signals since the last retrospective are its records since then, not the whole file. A record with no time (a
 * header) is kept only when the transcript has started inside the window.
 */
export function after(records, since) {
  if (!since) return records;
  const from = Date.parse(since);
  let inside = false;
  return records.filter((r) => {
    if (r.timestamp) inside = Date.parse(r.timestamp) >= from;
    return inside;
  });
}

/** The signals of one transcript's records. Pure: no file access. */
export function signals(records) {
  const uses = new Map();          // tool_use id -> { name, input }
  const calls = new Map();         // name + input -> count
  const edits = new Map();         // file -> count
  const errors = [];
  const blocked = [];
  const undone = [];
  let toolCalls = 0, outputTokens = 0, first, last, task;

  for (const record of records) {
    const at = record.timestamp;
    if (at) { first ??= at; last = at; }
    if (!task && record.type === "user") {
      const text = typeof record.message?.content === "string"
        ? record.message.content
        : blocks(record).find((b) => b.type === "text")?.text;
      if (text) task = firstLine(text);
    }
    outputTokens += record.message?.usage?.output_tokens ?? 0;
    for (const block of blocks(record)) {
      if (block.type === "tool_use") {
        toolCalls += 1;
        uses.set(block.id, { name: block.name, input: block.input });
        const key = `${block.name} ${JSON.stringify(block.input)}`;
        calls.set(key, (calls.get(key) ?? 0) + 1);
        const file = /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(block.name) ? pathOf(block.input) : undefined;
        if (file) edits.set(file, (edits.get(file) ?? 0) + 1);
        const command = block.input?.command;
        if (typeof command === "string" && UNDO.test(command)) undone.push(firstLine(command));
      } else if (block.type === "tool_result" && block.is_error) {
        const tool = uses.get(block.tool_use_id)?.name ?? "?";
        const text = firstLine(Array.isArray(block.content) ? block.content.map((c) => c.text ?? "").join(" ") : block.content);
        (HOOK_BLOCK.test(text) ? blocked : errors).push(`${tool}: ${text}`);
      }
    }
  }
  const counted = (map, at) => [...map].filter(([, n]) => n >= at).sort((a, b) => b[1] - a[1]);
  return {
    task, first, last, toolCalls, outputTokens,
    minutes: first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 60000) : 0,
    errors, blocked, undone,
    repeated: counted(calls, REPEAT_AT).map(([key, n]) => `${n}× ${key.slice(0, 160)}`),
    churn: counted(edits, CHURN_AT).map(([file, n]) => `${n}× ${file}`),
  };
}

/** The digest of one transcript, a few lines; a transcript with no signal says so in one. */
export function render(name, s, top = 8) {
  const head = `## ${name} — ${s.minutes} min, ${s.toolCalls} calls, ${s.outputTokens} output tokens` +
    (s.task ? `\n   task: ${s.task}` : "");
  const lists = [["hook blocks", s.blocked], ["errors", s.errors], ["repeated calls", s.repeated],
    ["files edited again and again", s.churn], ["work undone", s.undone]].filter(([, items]) => items.length);
  if (!lists.length) return `${head}\n   no signal`;
  return [head, ...lists.map(([label, items]) =>
    `   ${label} (${items.length}):\n` + items.slice(0, top).map((i) => `   - ${i}`).join("\n") +
    (items.length > top ? `\n   - … ${items.length - top} more` : ""))].join("\n");
}

function transcripts(paths) {
  return paths.flatMap((p) => statSync(p).isDirectory()
    ? readdirSync(p).filter((f) => f.endsWith(".jsonl")).map((f) => join(p, f))
    : [p]);
}

function main(argv) {
  const option = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
  const since = option("--since");
  const top = Number(option("--top") ?? 8);
  if (!argv.length) {
    console.error("usage: node transcript-signals.mjs <file.jsonl | folder> [...] [--since <ISO date>] [--top <n>]");
    return 2;
  }
  const out = [];
  for (const file of transcripts(argv)) {
    const s = signals(after(parse(readFileSync(file, "utf8")), since));
    if (!s.toolCalls) continue;
    out.push({ file, s });
  }
  out.sort((a, b) => Date.parse(a.s.first ?? 0) - Date.parse(b.s.first ?? 0));
  console.log(out.map(({ file, s }) => render(basename(file), s, top)).join("\n\n") || "no transcript in range");
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main(process.argv.slice(2));
