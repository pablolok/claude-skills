#!/usr/bin/env node
/**
 * PostToolUse hook (matcher Skill) — remembers which skills the work used, for `skill-retrospective`: when the work
 * closes, the skills that served it are the ones to rewrite with what it taught.
 *
 * Appends the skill's name to .claude/.state/skills-used.txt once (the retrospective empties the file).
 * Fail-open: any error exits 0.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { USED, stateDir } from "./state.mjs";

/** The skill a Skill tool call ran, without a plugin prefix ("plugin:name" → "name"), or "". */
export function skillName(toolInput) {
  const input = toolInput ?? {};
  return String(input.skill ?? input.name ?? input.command ?? "").trim().replace(/^.*:/, "");
}

/** Whether `name` still has to be added to the log's `text`. */
export function isNew(text, name) {
  return name !== "" && !String(text).split(/\r?\n/).includes(name);
}

function main(input, env) {
  const name = skillName(JSON.parse(input || "{}")?.tool_input);
  if (!name) return;
  const file = join(stateDir(env), USED);
  if (isNew(existsSync(file) ? readFileSync(file, "utf8") : "", name)) appendFileSync(file, name + "\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try { main(input, process.env); } catch { /* fail-open */ }
    process.exit(0);
  });
}
