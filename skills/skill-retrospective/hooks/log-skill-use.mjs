#!/usr/bin/env node
/**
 * PostToolUse hook (matcher Skill) — remembers which skills the work used, for `skill-retrospective`: when the work
 * closes, the skills that served it are the ones to rewrite with what it taught.
 *
 * Appends the skill's name to .claude/.state/skills-used.txt once (the retrospective empties the file).
 * With `--antigravity` it reads Antigravity's camelCase payload instead: a `read_file` of a `.../SKILL.md` counts as a
 * skill use, and the project is the payload's workspace; it prints `{}` (what PostToolUse expects there).
 * Fail-open: any error exits 0; without CLAUDE_PROJECT_DIR (no project) it does nothing.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { USED, antigravityRoot, stateDir } from "./state.mjs";
import { isEntryPoint } from "./entry-point.mjs";

/** The skill a Skill tool call ran, without a plugin prefix ("plugin:name" → "name"), or "". */
export function skillName(toolInput) {
  const input = toolInput ?? {};
  return String(input.skill ?? input.name ?? input.command ?? "").trim().replace(/^.*:/, "");
}

/** Whether `name` still has to be added to the log's `text`. */
export function isNew(text, name) {
  return name !== "" && !String(text).split(/\r?\n/).includes(name);
}

/** The `name` in a SKILL.md's frontmatter, or "". */
export function frontmatterName(text) {
  const block = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(String(text));
  const line = block && /^name:\s*(.+?)\s*$/m.exec(block[1]);
  return line ? line[1].replace(/^["']|["']$/g, "").trim() : "";
}

/** The skill an Antigravity `read_file` tool call read (frontmatter name, else its folder), or "" for any other call. */
export function antigravitySkillName(toolCall, read = (file) => readFileSync(file, "utf8")) {
  const path = toolCall?.name === "read_file" ? toolCall.args?.Path : undefined;
  if (typeof path !== "string" || !/[\\/]SKILL\.md$/.test(path)) return "";
  let text = "";
  try { text = read(path); } catch { /* unreadable: the folder name */ }
  return frontmatterName(text) || basename(dirname(path.replace(/\\/g, "/")));
}

function main(input, env, antigravity = false) {
  const payload = JSON.parse(input || "{}");
  const name = antigravity ? antigravitySkillName(payload?.toolCall) : skillName(payload?.tool_input);
  const dir = name ? (antigravity ? stateDir(env, antigravityRoot(payload)) : stateDir(env)) : null;
  if (!dir) return;
  const file = join(dir, USED);
  if (isNew(existsSync(file) ? readFileSync(file, "utf8") : "", name)) appendFileSync(file, name + "\n");
}

if (isEntryPoint(import.meta.url)) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    const antigravity = process.argv.includes("--antigravity");
    try { main(input, process.env, antigravity); } catch { /* fail-open */ }
    if (antigravity) process.stdout.write("{}");
    process.exit(0);
  });
}
