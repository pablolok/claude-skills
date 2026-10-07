// Tests for the pure decisions of claude-skills.mjs: no git, no file system.
// Run with:  node --test bootstrap/claude-skills.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  diffTrees,
  latestVersion,
  missingHooks,
  parseSpec,
  tagsFromLsRemote,
} from "./claude-skills.mjs";

test("parseSpec reads a skill with or without a version", () => {
  assert.deepEqual(parseSpec("backlog@1.3.0"), { skill: "backlog", version: "1.3.0" });
  assert.deepEqual(parseSpec("backlog"), { skill: "backlog", version: null });
});

test("parseSpec rejects a name that could leave .claude/skills or a version that is not x.y.z", () => {
  for (const bad of ["../x", "a/b", "a\\b", "..", "", "Up", "x@1.2", "x@latest", "@1.0.0"]) {
    assert.throws(() => parseSpec(bad), /invalid/, bad);
  }
});

test("compareVersions orders numerically, not as text", () => {
  assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
  assert.ok(compareVersions("1.0.0", "1.0.1") < 0);
  assert.equal(compareVersions("2.3.4", "2.3.4"), 0);
});

test("tagsFromLsRemote reads tag names, a peeled line once", () => {
  const out = "a1\trefs/tags/backlog@1.1.0\nb2\trefs/tags/backlog@1.1.0^{}\nc3\trefs/heads/main\nd4\trefs/tags/x@2.0.0\n";
  assert.deepEqual([...tagsFromLsRemote(out)].sort(), ["backlog@1.1.0", "x@2.0.0"]);
});

test("latestVersion picks the highest x.y.z of that skill only", () => {
  const tags = ["backlog@1.2.0", "backlog@1.10.0", "backlog@1.9.9", "review-backlog@5.0.0", "backlog-x@9.0.0",
    "backlog@2.0.0-rc1", "backlogs@3.0.0"];
  assert.equal(latestVersion(tags, "backlog"), "1.10.0");
  assert.equal(latestVersion(tags, "nothing"), null);
});

test("diffTrees lists added, changed and removed paths, sorted", () => {
  const before = new Map([["a.md", "a"], ["b.md", "b"], ["c.md", "c"]]);
  const after = new Map([["a.md", "a"], ["b.md", "B"], ["d/e.md", "e"]]);
  assert.deepEqual(diffTrees(before, after), { added: ["d/e.md"], changed: ["b.md"], removed: ["c.md"] });
});

test("diffTrees ignores a CRLF-only difference", () => {
  const before = new Map([["a.md", "one\r\ntwo\r\n"]]);
  const after = new Map([["a.md", "one\ntwo\n"]]);
  assert.deepEqual(diffTrees(before, after), { added: [], changed: [], removed: [] });
});

const ENTRY = {
  hooks: {
    PostToolUse: [{ matcher: "Skill", hooks: [{ type: "command", command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/a.mjs"', timeout: 10 }] }],
    Stop: [{ hooks: [{ type: "command", command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/b.mjs"', timeout: 10 }] }],
  },
};
const command = (c, matcher) => ({ ...(matcher === undefined ? {} : { matcher }), hooks: [{ type: "command", command: c }] });

test("missingHooks returns every hook when the project wires none, rewritten to the managed copy", () => {
  const missing = missingHooks(ENTRY, [], "retro");
  assert.deepEqual(Object.keys(missing), ["PostToolUse", "Stop"]);
  assert.equal(missing.PostToolUse[0].matcher, "Skill");
  assert.equal(missing.PostToolUse[0].hooks[0].command, 'node "$CLAUDE_PROJECT_DIR/.claude/skills/retro/hooks/a.mjs"');
  assert.equal(missing.PostToolUse[0].hooks[0].timeout, 10);
  assert.equal(missing.Stop[0].matcher, undefined);
});

test("missingHooks accepts any quoting of the project dir and a wiring split across settings files", () => {
  const settings = { hooks: { PostToolUse: [command('node "$CLAUDE_PROJECT_DIR"/.claude/skills/retro/hooks/a.mjs', "Skill")] } };
  const local = { hooks: { Stop: [command("node .claude\\skills\\retro\\hooks\\b.mjs", "")] } };
  assert.deepEqual(missingHooks(ENTRY, [settings, local], "retro"), {});
});

test("missingHooks keeps a hook wired under another event, matcher or skill as missing", () => {
  const settings = {
    hooks: {
      PreToolUse: [command('node "$CLAUDE_PROJECT_DIR/.claude/skills/retro/hooks/a.mjs"', "Skill")],
      PostToolUse: [command('node "$CLAUDE_PROJECT_DIR/.claude/skills/retro/hooks/a.mjs"', "Skill|Edit")],
      Stop: [command('node "$CLAUDE_PROJECT_DIR/.claude/skills/other/hooks/b.mjs"')],
    },
  };
  assert.deepEqual(Object.keys(missingHooks(ENTRY, [settings], "retro")), ["PostToolUse", "Stop"]);
});

test("missingHooks of a skill with no plugin entry or no hooks is empty", () => {
  assert.deepEqual(missingHooks(null, [], "x"), {});
  assert.deepEqual(missingHooks({ commands: [] }, [], "x"), {});
});
