// Tests for the pure decisions of claude-skills.mjs: no git, no file system.
// Run with:  node --test bootstrap/claude-skills.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  diffTrees,
  latestVersion,
  launcherProblems,
  launcherUpdates,
  launcherVersion,
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

const launcher = (version) => `#!/usr/bin/env node\nconst SKILL = "x";\nconst VERSION = "${version}";\nrun();\n`;

test("launcherVersion reads the VERSION line at the start of a line, or null", () => {
  assert.equal(launcherVersion(launcher("1.3.1")), "1.3.1");
  assert.equal(launcherVersion(launcher("1.3.1").replace(/\n/g, "\r\n")), "1.3.1");
  assert.equal(launcherVersion('  const VERSION = "1.0.0";\n'), null);
  assert.equal(launcherVersion("no pin here\n"), null);
});

test("launcherUpdates replaces only the launchers the project has, and offers the others", () => {
  const published = new Map([["a.mjs", launcher("1.1.0")], ["b.mjs", launcher("1.1.0")]]);
  const project = new Map([["a.mjs", launcher("1.0.0")]]);
  assert.deepEqual(launcherUpdates(published, project), {
    replaced: [{ name: "a.mjs", from: "1.0.0", to: "1.1.0" }],
    offered: ["b.mjs"],
  });
});

test("launcherUpdates reports a launcher without a VERSION line as such", () => {
  const { replaced } = launcherUpdates(new Map([["a.mjs", "no pin\n"]]), new Map([["a.mjs", "no pin either\n"]]));
  assert.deepEqual(replaced, [{ name: "a.mjs", from: null, to: null }]);
});

test("launcherProblems is empty for a matching launcher, line endings aside", () => {
  const published = new Map([["a.mjs", launcher("1.1.0")], ["b.mjs", launcher("1.1.0")]]);
  const project = new Map([["a.mjs", launcher("1.1.0").replace(/\n/g, "\r\n")]]);
  assert.deepEqual(launcherProblems("x", "1.1.0", published, project), []);
});

test("launcherProblems names both versions and the sync that fixes a launcher pinned elsewhere", () => {
  const problems = launcherProblems("x", "1.1.0", new Map([["a.mjs", launcher("1.1.0")]]), new Map([["a.mjs", launcher("1.0.0")]]));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /scripts\/a\.mjs/);
  assert.match(problems[0], /VERSION 1\.0\.0/);
  assert.match(problems[0], /copy is 1\.1\.0/);
  assert.match(problems[0], /node scripts\/claude-skills\.mjs sync x@1\.1\.0/);
});

test("launcherProblems reports a hand edit that keeps the VERSION line", () => {
  const problems = launcherProblems("x", "1.1.0", new Map([["a.mjs", launcher("1.1.0")]]),
    new Map([["a.mjs", `${launcher("1.1.0")}// mine\n`]]));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /scripts\/a\.mjs differs from the published bootstrap\/a\.mjs at x@1\.1\.0/);
});
