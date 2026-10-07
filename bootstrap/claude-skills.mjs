#!/usr/bin/env node
/**
 * Keep MANAGED COPIES of published skills in this project: each skill copied byte for byte into
 * `.claude/skills/<skill>/` from its published tag `<skill>@<version>`, never edited there, updated by this command and
 * checked. Copy this file into the project (e.g. `scripts/claude-skills.mjs`) and commit it, with what it writes.
 *
 *   node scripts/claude-skills.mjs sync backlog@1.3.0 review-backlog   # no version: the latest published tag
 *   node scripts/claude-skills.mjs sync backlog@1.3.0 --adopt          # replace a folder that is not managed yet
 *   node scripts/claude-skills.mjs check                               # in CI or a hook: exit 1 on a hand edit
 *   node scripts/claude-skills.mjs list
 *
 * Managed copies are for a project shared by several people or used in cloud sessions: plugins declared in a
 * project's settings need the trust dialog, which a cloud session never shows, and they float — a project cannot pin
 * each plugin's version. A lesson about a managed skill goes to the skill's source; the project takes it with a sync.
 *
 * Where things live:
 *   - `.claude/claude-skills.json` — `{"repo": "<git url>", "skills": ["backlog", ...]}`: the managed NAMES only; each
 *     copy's version is its own `metadata.json`. `repo` defaults to the skill repository below.
 *   - the published tags are shallow clones under CLAUDE_SKILLS_CACHE (default: the user's `.cache/claude-skills`),
 *     `<cache>/<skill>@<version>/`, fetched once, then reused offline — the same layout as the skills' launchers
 *     (backlog's `backlog-gate.mjs`, mermaid-diagrams' `mermaid.mjs`), which prefer a same-version
 *     `.claude/skills/<skill>` copy and so run offline on a managed copy.
 *   - a skill's launchers ship in its `bootstrap/` folder; the project keeps the ones it uses in `scripts/`. A launcher
 *     prefers the managed copy only at its own `VERSION`, so sync replaces each one the project has with the published
 *     one (never creating one), and check fails on a launcher that differs — two versions in play otherwise.
 *
 * Same shape and names as those launchers, on purpose: the three are meant to share one implementation.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The skill repository a project syncs from when its config names none. */
const REPO_URL = "https://github.com/pablolok/claude-skills.git";
const CONFIG_FILE = ".claude/claude-skills.json";
const SKILLS_DIR = ".claude/skills";
const SETTINGS_FILES = [".claude/settings.json", ".claude/settings.local.json"];
const PUBLISHED_DIR = "published";
const METADATA = "metadata.json";
const PLUGIN_ENTRY = "plugin-entry.json";
/** A skill's launchers ship in its `bootstrap/` folder; a project keeps the ones it uses in its `scripts/`. */
const BOOTSTRAP_DIR = "bootstrap";
const LAUNCHER_DIR = "scripts";
/** The line a launcher pins its skill's version with — the same line the skills' tests read. */
const LAUNCHER_VERSION = /^const VERSION = "([^"]+)";/m;
const NO_VERSION = "(no VERSION)";
/** Never copied, never compared: a copy may install its dependencies in place. */
const IGNORED_DIR = "node_modules";
const PLUGIN_ROOT = "${CLAUDE_PLUGIN_ROOT}";
const PROJECT_DIR = "$CLAUDE_PROJECT_DIR";
const SKILL_NAME = /^[a-z0-9][a-z0-9-]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const TAG_REF_PREFIX = "refs/tags/";
const PEELED_SUFFIX = "^{}";
const GIT_TIMEOUT_MS = 60_000;
const EXIT = Object.freeze({ ok: 0, failed: 1, usage: 2 });

const USAGE = `usage: node scripts/claude-skills.mjs <command>
  sync <skill>[@<version>] [...] [--adopt]
        copy each skill's published tag into ${SKILLS_DIR}/<skill>/ and manage it (no version: the latest tag);
        a launcher the skill ships in ${BOOTSTRAP_DIR}/ that the project has in ${LAUNCHER_DIR}/ (same file name) is
        replaced by the published one; one the project lacks is only offered, never created.
        --adopt replaces a folder that exists but is not managed
  check
        every managed copy equals its published tag (line endings and ${IGNORED_DIR} aside), the project's launchers
        in ${LAUNCHER_DIR}/ equal the skill's published ones at the copy's version, and its plugin hooks are wired in
        .claude/settings.json; exit 1 otherwise. Newer published versions are reported as info.
  list
        the managed skills and their versions`;

/** A failure the user can act on: its message is printed as is, with its exit code. */
class ToolError extends Error {
  constructor(message, exitCode = EXIT.failed) {
    super(message);
    this.exitCode = exitCode;
  }
}

// ============================================================
// Pure decisions (exported for tests — no I/O here)
// ============================================================

/**
 * `backlog@1.3.0` → `{skill: "backlog", version: "1.3.0"}`; `backlog` → version null (the latest). A name is a plain
 * folder name, so a copy can never be written outside `.claude/skills/`.
 * @param {string} spec
 */
export function parseSpec(spec) {
  const [skill, version, ...rest] = String(spec).split("@");
  if (!SKILL_NAME.test(skill) || rest.length > 0 || (version !== undefined && !VERSION.test(version))) {
    throw new ToolError(`invalid skill "${spec}": expected <skill> or <skill>@<x.y.z>`, EXIT.usage);
  }
  return { skill, version: version ?? null };
}

/** Negative, zero or positive as `a` is older, the same as or newer than `b` (both x.y.z). */
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** The tag names in `git ls-remote --tags` output (an annotated tag's peeled `^{}` line counts once). */
export function tagsFromLsRemote(output) {
  const tags = new Set();
  for (const line of output.split("\n")) {
    const ref = line.split("\t").at(-1).trim();
    if (ref.startsWith(TAG_REF_PREFIX)) tags.add(ref.slice(TAG_REF_PREFIX.length).replace(PEELED_SUFFIX, ""));
  }
  return tags;
}

/** The highest x.y.z among `<skill>@x.y.z` tags, or null. */
export function latestVersion(tags, skill) {
  const prefix = `${skill}@`;
  const versions = [...tags]
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length))
    .filter((version) => VERSION.test(version));
  return versions.sort(compareVersions).at(-1) ?? null;
}

const normaliseEol = (text) => text.replace(/\r\n/g, "\n");

/**
 * What turns `before` into `after`, each a map of relative path → content; a CRLF/LF-only difference is no change.
 * @param {Map<string, string>} before
 * @param {Map<string, string>} after
 * @returns {{added: string[], changed: string[], removed: string[]}}
 */
export function diffTrees(before, after) {
  const added = [...after.keys()].filter((p) => !before.has(p));
  const removed = [...before.keys()].filter((p) => !after.has(p));
  const changed = [...after.keys()].filter((p) => before.has(p) && normaliseEol(before.get(p)) !== normaliseEol(after.get(p)));
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

/** The skill version a launcher pins, from its `const VERSION = "x.y.z";` line, or null when it has none. */
export function launcherVersion(text) {
  return LAUNCHER_VERSION.exec(text)?.[1] ?? null;
}

/**
 * What sync does with a skill's launchers: the project's `scripts/<name>` is replaced when the project has one (matched
 * by file name), and only offered when it has none — a launcher is never created.
 * @param {Map<string, string>} published the skill's `bootstrap/` files, name → content
 * @param {Map<string, string>} project the project's `scripts/` files of those names that exist, name → content
 * @returns {{replaced: {name: string, from: string|null, to: string|null}[], offered: string[]}}
 */
export function launcherUpdates(published, project) {
  const names = [...published.keys()].sort();
  return {
    replaced: names.filter((name) => project.has(name))
      .map((name) => ({ name, from: launcherVersion(project.get(name)), to: launcherVersion(published.get(name)) })),
    offered: names.filter((name) => !project.has(name)),
  };
}

/**
 * The project's launchers that differ from the skill's published ones at the managed copy's version (CRLF/LF aside):
 * one pinned to another version, or one edited by hand. A launcher the project does not have is no problem.
 * @param {string} skill
 * @param {string} version the managed copy's version
 * @param {Map<string, string>} published the skill's `bootstrap/` files at that version, name → content
 * @param {Map<string, string>} project the project's `scripts/` files of those names that exist, name → content
 * @returns {string[]}
 */
export function launcherProblems(skill, version, published, project) {
  const fix = `node scripts/claude-skills.mjs sync ${skill}@${version}`;
  return [...project.keys()].sort()
    .filter((name) => published.has(name) && normaliseEol(project.get(name)) !== normaliseEol(published.get(name)))
    .map((name) => {
      const pinned = launcherVersion(project.get(name));
      return pinned === version
        ? `${skill} ${version}: ${LAUNCHER_DIR}/${name} differs from the published bootstrap/${name} at ${skill}@${version} `
          + `(edited by hand? edit the skill's source, publish, then sync; to restore it: ${fix})`
        : `${skill} ${version}: ${LAUNCHER_DIR}/${name} pins VERSION ${pinned ?? NO_VERSION}, the copy is ${version}: `
          + `run ${fix}`;
    });
}

/** A hook command as the project would run it: the plugin root becomes the managed copy's folder. */
const rewriteCommand = (command, skill) => command.split(PLUGIN_ROOT).join(`${PROJECT_DIR}/${SKILLS_DIR}/${skill}`);

/** A command reduced to what it runs: quotes, the project-dir prefix, separators and spacing do not matter. */
const commandKey = (command) => String(command ?? "")
  .replace(/["']/g, "")
  .replace(/\\/g, "/")
  .replace(/\$\{CLAUDE_PROJECT_DIR\}|\$CLAUDE_PROJECT_DIR/g, "")
  .replace(/(^|\s)\.?\//g, "$1")
  .replace(/\s+/g, " ")
  .trim();

/** No matcher, an empty one and `*` all match every tool. */
const matcherKey = (matcher) => (matcher === undefined || matcher === null || matcher === "*" ? "" : String(matcher));

const wiringKey = (event, matcher, command) => JSON.stringify([event, matcherKey(matcher), commandKey(command)]);

/**
 * The hooks a skill declares in its plugin entry that none of the project's settings wire: same event, same matcher,
 * the same script run from `.claude/skills/<skill>`. Returned in settings' own shape, commands rewritten to the copy,
 * ready to paste under "hooks"; empty when everything is wired.
 * @param {object|null} pluginEntry the skill's plugin-entry.json
 * @param {object[]} settingsList the project's settings files, parsed
 * @param {string} skill
 */
export function missingHooks(pluginEntry, settingsList, skill) {
  const wired = new Set();
  for (const settings of settingsList) {
    for (const [event, groups] of Object.entries(settings?.hooks ?? {})) {
      for (const group of groups ?? []) for (const hook of group.hooks ?? []) wired.add(wiringKey(event, group.matcher, hook.command));
    }
  }
  const missing = {};
  for (const [event, groups] of Object.entries(pluginEntry?.hooks ?? {})) {
    for (const group of groups ?? []) {
      const hooks = (group.hooks ?? [])
        .map((hook) => (hook.command === undefined ? hook : { ...hook, command: rewriteCommand(hook.command, skill) }))
        .filter((hook) => !wired.has(wiringKey(event, group.matcher, hook.command)));
      if (hooks.length === 0) continue;
      (missing[event] ??= []).push({ ...(group.matcher === undefined ? {} : { matcher: group.matcher }), hooks });
    }
  }
  return missing;
}

/** The diff as indented ASCII lines, one per path. */
const diffLines = ({ added, changed, removed }) => [
  ...added.map((p) => `  added   ${p}`),
  ...changed.map((p) => `  changed ${p}`),
  ...removed.map((p) => `  removed ${p}`),
];

const isEmptyDiff = ({ added, changed, removed }) => added.length + changed.length + removed.length === 0;

// ============================================================
// I/O: git, the file system, the project's config
// ============================================================

const git = (args, options = {}) => spawnSync("git", args, {
  encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: GIT_TIMEOUT_MS,
  env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, ...options,
});

const projectRoot = () => {
  const r = git(["rev-parse", "--show-toplevel"], { cwd: path.dirname(fileURLToPath(import.meta.url)) });
  return r.status === 0 ? r.stdout.trim() : process.cwd();
};

const cacheDir = () => process.env.CLAUDE_SKILLS_CACHE || path.join(homedir(), ".cache", "claude-skills");

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

const versionOf = (dir) => readJson(path.join(dir, METADATA))?.version ?? null;

/** The published tags of `repo`, or null when it cannot be reached. */
function remoteTags(repo) {
  const r = git(["ls-remote", "--tags", repo]);
  return r.status === 0 ? tagsFromLsRemote(r.stdout) : null;
}

/** `published/<category>/<skill>/` inside a clone, or null. */
function publishedFolder(clone, skill) {
  const root = path.join(clone, PUBLISHED_DIR);
  if (!existsSync(root)) return null;
  const category = readdirSync(root).find((c) => existsSync(path.join(root, c, skill, METADATA)));
  return category === undefined ? null : path.join(root, category, skill);
}

/** The published folder of `<skill>@<version>`, from the cache, cloning the tag there once. */
function fetchPublished(repo, cache, skill, version) {
  const tag = `${skill}@${version}`;
  const clone = path.join(cache, tag);
  let folder = publishedFolder(clone, skill);
  if (folder === null) {
    rmSync(clone, { recursive: true, force: true });
    mkdirSync(cache, { recursive: true });
    const r = git(["-c", "advice.detachedHead=false", "-c", "core.autocrlf=false",
      "clone", "-q", "--depth", "1", "--branch", tag, repo, clone]);
    if (r.status !== 0) {
      throw new ToolError(`could not fetch ${tag} from ${repo} (offline, or no such tag): ${(r.stderr || String(r.error ?? "")).trim().split("\n")[0]}`, EXIT.usage);
    }
    folder = publishedFolder(clone, skill);
  }
  const metadata = folder === null ? null : readJson(path.join(folder, METADATA));
  if (metadata?.name !== skill || metadata?.version !== version) {
    throw new ToolError(`${tag} in ${repo} has no ${PUBLISHED_DIR}/<category>/${skill}/ at version ${version}`);
  }
  return folder;
}

/** Every file under `dir` (none of `node_modules`), relative path with `/` → content (bytes as latin1). */
function readTree(dir) {
  const tree = new Map();
  if (!existsSync(dir)) return tree;
  const walk = (rel) => {
    for (const entry of readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.name !== IGNORED_DIR) walk(child);
      } else {
        tree.set(child, readFileSync(path.join(dir, child), "latin1"));
      }
    }
  };
  walk("");
  return tree;
}

/** A skill's launchers: the files directly in its published `bootstrap/` folder, name → content (bytes as latin1). */
function publishedLaunchers(folder) {
  const dir = path.join(folder, BOOTSTRAP_DIR);
  if (!existsSync(dir)) return new Map();
  return new Map(readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => [entry.name, readFileSync(path.join(dir, entry.name), "latin1")]));
}

/** The project's `scripts/<name>` for each of `names` it has, name → content (bytes as latin1). */
function projectLaunchers(root, names) {
  return new Map([...names]
    .filter((name) => existsSync(path.join(root, LAUNCHER_DIR, name)))
    .map((name) => [name, readFileSync(path.join(root, LAUNCHER_DIR, name), "latin1")]));
}

/** `.claude/skills/<skill>` — only ever that folder, for a name parseSpec accepted. */
function copyFolder(root, skill) {
  const skillsDir = path.resolve(root, SKILLS_DIR);
  const folder = path.resolve(skillsDir, parseSpec(skill).skill);
  if (path.dirname(folder) !== skillsDir) throw new ToolError(`refusing to write outside ${SKILLS_DIR}: ${skill}`);
  return folder;
}

/** Replace the copy with the published folder; a `node_modules` the copy installed is kept, none is copied. */
function replaceCopy(target, source) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(target)) {
    if (entry !== IGNORED_DIR) rmSync(path.join(target, entry), { recursive: true, force: true });
  }
  cpSync(source, target, {
    recursive: true,
    filter: (src) => !path.relative(source, src).split(path.sep).includes(IGNORED_DIR),
  });
}

/** The project's managed list: `{repo, skills, exists}`. */
function loadConfig(root) {
  const file = path.join(root, CONFIG_FILE);
  if (!existsSync(file)) return { repo: REPO_URL, skills: [], exists: false };
  const config = readJson(file);
  if (config === null || typeof config !== "object" || (config.skills !== undefined && !Array.isArray(config.skills))) {
    throw new ToolError(`${CONFIG_FILE} is not {"repo": "<url>", "skills": [<names>]}`);
  }
  const skills = config.skills ?? [];
  skills.forEach((name) => parseSpec(name));
  return { ...config, repo: config.repo || REPO_URL, skills, exists: true };
}

function saveConfig(root, config) {
  const { exists, ...stored } = config;
  writeFileSync(path.join(root, CONFIG_FILE), `${JSON.stringify({ ...stored, skills: [...new Set(stored.skills)].sort() }, null, 2)}\n`);
}

function loadSettings(root) {
  return SETTINGS_FILES.filter((rel) => existsSync(path.join(root, rel))).map((rel) => {
    const settings = readJson(path.join(root, rel));
    if (settings === null) throw new ToolError(`${rel} is not valid JSON`);
    return settings;
  });
}

// ============================================================
// Commands
// ============================================================

/** `sync <skill>[@<version>] ... [--adopt]`: everything is fetched and checked before anything is written. */
function sync(ctx, args) {
  const adopt = args.includes("--adopt");
  const specs = args.filter((a) => a !== "--adopt").map(parseSpec);
  if (specs.length === 0) throw new ToolError(USAGE, EXIT.usage);
  const config = loadConfig(ctx.root);
  let tags = null;
  const plans = specs.map(({ skill, version }) => {
    if (version === null) {
      tags ??= remoteTags(config.repo);
      if (tags === null) throw new ToolError(`could not list the tags of ${config.repo}: give the version (${skill}@<x.y.z>)`, EXIT.usage);
      version = latestVersion(tags, skill);
      if (version === null) throw new ToolError(`${config.repo} has no published tag ${skill}@<x.y.z>`);
    }
    const target = copyFolder(ctx.root, skill);
    const unmanaged = existsSync(target) && !config.skills.includes(skill);
    return { skill, version, target, unmanaged, source: fetchPublished(config.repo, ctx.cache, skill, version) };
  });
  const refused = plans.filter((p) => p.unmanaged && !adopt);
  for (const p of refused) {
    ctx.out.error(`${p.skill}: ${SKILLS_DIR}/${p.skill} exists but is not managed (${CONFIG_FILE} does not list it): it is `
      + "the project's own skill or an unmanaged copy. Rename it, or pass --adopt to replace it with the published copy.");
  }
  if (refused.length > 0) return EXIT.failed;

  let launchersReplaced = 0;
  for (const p of plans) {
    const diff = diffTrees(readTree(p.target), readTree(p.source));
    if (p.unmanaged) ctx.out.line(`${p.skill}: adopting the unmanaged ${SKILLS_DIR}/${p.skill}; the published copy replaces it:`);
    ctx.out.line(`${p.skill}: ${versionOf(p.target) ?? "(new)"} -> ${p.version}`);
    ctx.out.line(isEmptyDiff(diff) ? "  no file changed" : diffLines(diff).join("\n"));
    replaceCopy(p.target, p.source);
    launchersReplaced += syncLaunchers(ctx, p);
    config.skills.push(p.skill);
  }
  saveConfig(ctx.root, config);
  const launchers = launchersReplaced > 0 ? `, ${CONFIG_FILE} and the launchers in ${LAUNCHER_DIR}` : ` and ${CONFIG_FILE}`;
  ctx.out.line(`managed in ${CONFIG_FILE}: ${[...new Set(config.skills)].sort().join(", ")}. Commit ${SKILLS_DIR}${launchers}.`);
  return EXIT.ok;
}

/**
 * Move the project's launchers of a synced skill to its published ones (the project's `scripts/<name>` of each file in
 * the skill's `bootstrap/`), so they pin the copy's version; a launcher the project lacks is only offered.
 * @returns {number} how many launchers were replaced
 */
function syncLaunchers(ctx, plan) {
  const published = publishedLaunchers(plan.source);
  const { replaced, offered } = launcherUpdates(published, projectLaunchers(ctx.root, published.keys()));
  for (const { name, from, to } of replaced) {
    copyFileSync(path.join(plan.source, BOOTSTRAP_DIR, name), path.join(ctx.root, LAUNCHER_DIR, name));
    ctx.out.line(`  launcher ${LAUNCHER_DIR}/${name} ${from ?? NO_VERSION} -> ${to ?? NO_VERSION}`);
  }
  for (const name of offered) {
    ctx.out.line(`  info  ${plan.skill} offers the launcher ${BOOTSTRAP_DIR}/${name}; to use it, copy `
      + `${SKILLS_DIR}/${plan.skill}/${BOOTSTRAP_DIR}/${name} to ${LAUNCHER_DIR}/${name} and commit it (sync keeps it at `
      + "the skill's version from then on)");
  }
  return replaced.length;
}

/** The problems of one managed copy, or [] when it is its published tag with its hooks wired. */
function checkCopy(ctx, config, settings, skill) {
  const target = copyFolder(ctx.root, skill);
  if (!existsSync(target)) return [`${skill}: ${SKILLS_DIR}/${skill} is missing (${CONFIG_FILE} manages it): run sync ${skill}@<version>`];
  const metadata = readJson(path.join(target, METADATA));
  if (metadata === null) return [`${skill}: ${SKILLS_DIR}/${skill}/${METADATA} is missing or not JSON`];
  if (metadata.name !== skill) return [`${skill}: ${SKILLS_DIR}/${skill}/${METADATA} names the skill "${metadata.name}"`];
  if (!VERSION.test(String(metadata.version))) return [`${skill}: ${METADATA} has no x.y.z version`];
  let source;
  try {
    source = fetchPublished(config.repo, ctx.cache, skill, metadata.version);
  } catch (error) {
    return [`${skill} ${metadata.version}: cannot be compared: ${error.message}`];
  }
  const problems = [];
  const diff = diffTrees(readTree(source), readTree(target));
  if (!isEmptyDiff(diff)) {
    problems.push([`${skill} ${metadata.version}: the copy differs from the published ${skill}@${metadata.version} `
      + "(edited by hand? edit the skill's source, publish, then sync):", ...diffLines(diff)].join("\n"));
  }
  const launchers = publishedLaunchers(source);
  problems.push(...launcherProblems(skill, metadata.version, launchers, projectLaunchers(ctx.root, launchers.keys())));
  const missing = missingHooks(readJson(path.join(source, PLUGIN_ENTRY)), settings, skill);
  if (Object.keys(missing).length > 0) {
    problems.push(`${skill} ${metadata.version}: hooks not wired in ${SETTINGS_FILES[0]} (or settings.local.json); add under "hooks":\n`
      + JSON.stringify({ hooks: missing }, null, 2));
  }
  return problems;
}

/** `check`: errors exit 1; newer versions and an unreachable repository are only reported. */
function check(ctx) {
  const config = loadConfig(ctx.root);
  if (config.skills.length === 0) {
    ctx.out.line(`no managed skills (${CONFIG_FILE} lists none)`);
    return EXIT.ok;
  }
  const settings = loadSettings(ctx.root);
  let failed = false;
  for (const skill of config.skills) {
    const problems = checkCopy(ctx, config, settings, skill);
    problems.forEach((p) => ctx.out.line(`ERROR ${p}`));
    if (problems.length === 0) ctx.out.line(`ok    ${skill} ${versionOf(copyFolder(ctx.root, skill))}`);
    failed ||= problems.length > 0;
  }
  const tags = remoteTags(config.repo);
  if (tags === null) {
    ctx.out.line(`info  could not check for updates (${config.repo} unreachable)`);
  } else {
    for (const skill of config.skills) {
      const current = versionOf(copyFolder(ctx.root, skill));
      const latest = latestVersion(tags, skill);
      if (current && VERSION.test(current) && latest && compareVersions(latest, current) > 0) {
        ctx.out.line(`info  ${skill}: ${current} -> ${latest} available (sync ${skill}@${latest})`);
      }
    }
  }
  return failed ? EXIT.failed : EXIT.ok;
}

/** `list`: each managed skill with its copy's version. */
function list(ctx) {
  const { skills } = loadConfig(ctx.root);
  if (skills.length === 0) ctx.out.line(`no managed skills (${CONFIG_FILE} lists none)`);
  for (const skill of skills) ctx.out.line(`${skill} ${versionOf(copyFolder(ctx.root, skill)) ?? "(missing)"}`);
  return EXIT.ok;
}

const COMMANDS = { sync, check, list };

function main(argv) {
  const [command, ...args] = argv;
  const ctx = { root: projectRoot(), cache: cacheDir(), out: { line: (s) => console.log(s), error: (s) => console.error(s) } };
  if (!Object.hasOwn(COMMANDS, command ?? "")) {
    ctx.out.error(USAGE);
    return EXIT.usage;
  }
  try {
    return COMMANDS[command](ctx, args);
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    ctx.out.error(`claude-skills: ${error.message}`);
    return error.exitCode;
  }
}

const invokedDirectly = () => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (invokedDirectly()) process.exit(main(process.argv.slice(2)));
