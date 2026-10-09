#!/usr/bin/env node
// @ts-check
/**
 * backlog-github-sync.mjs — keep the file backlog (<docsDir>/BACKLOG.md
 * + BACKLOG-HISTORY.md, default docsDir `docs/implementations`) aligned with GitHub Issues, BOTH ways.
 *
 * WHY Node (not PowerShell): it must run on Windows and macOS alike, with no
 * dependencies — Node's standard library only, no package.json needed.
 * Run with `node <skill>/scripts/backlog-github-sync.mjs …` from anywhere in the project: the project is
 * CLAUDE_PROJECT_DIR or the git work tree of the cwd (see project.mjs); the repo is origin's GitHub
 * remote and the doc links point at origin's default branch — nothing project-specific is written here.
 *
 * AUTH — the tool never touches auth itself; it only shells out to `gh`, which
 * picks its credentials up automatically:
 *   - `gh auth login` once (browser) — done, nothing else; or
 *   - on a machine with several GitHub accounts: export a repo-scoped
 *     fine-grained PAT as GH_TOKEN; `gh` prefers GH_TOKEN over the logged-in
 *     account, so this repo is reached without switching the active account.
 * The token is read from the environment only; it is never written to disk.
 *
 * FIELD OWNERSHIP (conflict-free reconcile, no webhooks):
 *   - the file OWNS: the BKLG-NNN id, the detail-doc link, and the prose/Summary.
 *   - GitHub OWNS the lifecycle: issue state (open/closed), the status:* /
 *     priority:* labels, and the assignee.
 * On reconcile each side's owned fields win; the other side's drift is reported,
 * never silently clobbered. Because the file owns the prose, the issue BODY is
 * rewritten from the entry whenever the two diverge — on update, not just at
 * creation (otherwise every edited entry silently drifts on GitHub). The rewrite is announced as `BODY`
 * in the log line; it is the one place this tool overwrites GitHub-side text.
 *
 * SAFETY BOUNDARY (deliberate): writes that only touch GitHub (create/relabel/
 * close issues, adopt-back a new collaborator issue as a BKLG entry) run with
 * --execute. The one file mutation that is genuinely destructive — moving a
 * closed issue's entry to BACKLOG-HISTORY.md AND archiving its doc folder — is
 * NOT automated here; it is REPORTED so a human runs `backlog done BKLG-NNN`,
 * which does the archive with all the doc-folder handling. This keeps the
 * source-of-truth backlog safe.
 *
 * COMMANDS:
 *   upsert-issue <BKLG-NNN>   ensure the entry's GitHub issue exists + matches (file→GitHub)
 *   close-issue  <BKLG-NNN>   close the entry's issue with a linking comment
 *   sync-all                  full reconcile of ## Open ⟷ open backlog issues + a report
 * FLAGS: --dry-run (default) | --execute ; --repo <owner/name> (else derived from origin)
 *
 * THE PROJECT'S WORDS (`github` in .claude/backlog.json): the label names it writes (`labels`, canonical → its own),
 * the close comment (`closeComment`), and the Status/Priority words of its register mapped onto the canonical values
 * (`statusWords`, `priorityWords`; the English words always count). A value no word matches is WARNED about, naming
 * the entry and the value — never left silently unlabelled.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { registerIds } from "./next-id.mjs";
import { CONFIG_FILE, DEFAULTS, GITHUB, GITHUB_LABELS, PRIORITIES, STATUSES, fieldName, project } from "./project.mjs";
import { extractBklgIds, formatBklgId, nextBklgId, openEntries } from "./register.mjs";
import { isEntryPoint } from "./entry-point.mjs";

// The id helpers live in register.mjs (next-id uses them too); re-exported for the mirror's callers.
export { extractBklgIds, formatBklgId, nextBklgId };

const GH = process.platform === "win32" ? "gh.exe" : "gh";

/**
 * The labels below are CANONICAL names: what the mirror writes is the project's name for each (`github.labels` in
 * `.claude/backlog.json`), the canonical one when it declares none.
 */
export const labelName = (config, canonical) => config?.github?.labels?.[canonical] ?? canonical;

/** The single always-present label. */
export const BACKLOG_LABEL = "backlog";

/** Doc-folder prefix → type label. */
export const TYPE_LABELS = /** @type {const} */ ({
  features: "feature",
  bugs: "bug",
  analysis: "analysis",
  diagnostic: "diagnostic",
});

// ============================================================
// Pure parsing / mapping (exported for tests — no I/O here)
// ============================================================

/**
 * Strip inline markdown to plain text for an issue title:
 * `**bold**` → bold, `` `code` `` → code, `[text](url)` → text.
 * @param {string} s
 * @returns {string}
 */
export function stripMarkdown(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/`([^`]+)`/g, "$1") // inline code
    .trim();
}

/**
 * The `## Open` entries of BACKLOG.md as the mirror needs them. The layout (heading level, where an entry ends, wrapped
 * field values, the project's field names) is `register.mjs`'s; this only shapes the result.
 * @param {string} md
 * @param {object} [config] the project's config (its `fieldNames`)
 * @returns {Array<{id:number, idStr:string, title:string, fields:Record<string,string>, issue:number|null}>}
 */
export function parseOpenEntries(md, config = DEFAULTS) {
  return openEntries(md, config).map((e) => ({
    id: Number(e.id.slice("BKLG-".length)),
    idStr: e.id,
    title: stripMarkdown(e.title),
    fields: e.fields,
    issue: e.fields.Issue ? Number(/#(\d+)/.exec(e.fields.Issue)?.[1] ?? NaN) || null : null,
  }));
}

/** Every id either backlog file mentions, in the canonical form issues carry (`BKLG-001`, not `BKLG-1`). */
export function knownBklgIds(backlogMd, historyMd) {
  return new Set([...extractBklgIds(backlogMd), ...extractBklgIds(historyMd)].map(formatBklgId));
}

/**
 * The GitHub issue title for an entry: `BKLG-NNN — <plain title>`.
 * @param {{idStr:string, title:string}} entry
 */
export function issueTitleFor(entry) {
  return `${entry.idStr} — ${entry.title}`;
}

/**
 * The two labelled dimensions of an entry: its field, the canonical values, and the config key mapping the project's
 * words onto them. Priority first: the order the labels are written in.
 */
const DIMENSIONS = Object.freeze([
  { field: "Priority", canonical: PRIORITIES, words: "priorityWords", label: (/** @type {string} */ v) => `priority:${v}` },
  { field: "Status", canonical: STATUSES, words: "statusWords", label: (/** @type {string} */ v) => `status:${v}` },
]);

/** The words that name each canonical value of a dimension — the canonical word itself, plus the project's — longest first. */
function wordsOf(dimension, config) {
  const words = new Map(dimension.canonical.map((c) => [c, c]));
  for (const [word, canonical] of Object.entries(config?.github?.[dimension.words] ?? {})) words.set(word.trim().toLowerCase(), canonical);
  return [...words].sort(([a], [b]) => b.length - a.length);
}

/**
 * An entry's canonical Status or Priority (`in-progress`, `high`), read in the project's words; null when its value
 * opens with none of them. The one reading of those two fields for every consumer (the labels, the dashboard).
 * @param {Record<string,string>} fields
 * @param {"Status"|"Priority"} field
 * @param {object} [config]
 * @returns {string|null}
 */
export function canonicalField(fields, field, config = DEFAULTS) {
  const dimension = DIMENSIONS.find((d) => d.field === field);
  if (!dimension) throw new Error(`canonicalField: "${field}" is not one of ${DIMENSIONS.map((d) => d.field).join(", ")}`);
  return canonicalValue(fields[field], wordsOf(dimension, config));
}

/**
 * The canonical value a field's value opens with: one of `words` as a whole word at its start (a value carries a note
 * after it — `in-progress — step 2`, `alta oggi`), longest first so `in corso` wins over `in`. A leading emoji or
 * mark (`📋 aperta`) is not part of the word. Null when none matches.
 * @param {string|undefined} value
 * @param {Array<[string, string]>} words word → canonical, longest first
 * @returns {string|null}
 */
export function canonicalValue(value, words) {
  const v = (value || "").toLowerCase().replace(/^[^\p{L}\p{N}]+/u, "");
  for (const [word, canonical] of words) {
    if (v.startsWith(word) && !/[\p{L}\p{N}]/u.test(v.charAt(word.length))) return canonical;
  }
  return null;
}

/**
 * The set of labels an entry's issue should carry, derived from its fields, under the project's label names.
 * @param {Record<string,string>} fields
 * @param {string} [docLink] the raw `- **Doc**:` value, for the type label
 * @param {object} [config] the project's config (`github.labels`, `github.statusWords`, `github.priorityWords`)
 * @returns {string[]}
 */
export function labelsFor(fields, docLink, config = DEFAULTS) {
  const labels = [labelName(config, BACKLOG_LABEL)];
  for (const d of DIMENSIONS) {
    const value = canonicalValue(fields[d.field], wordsOf(d, config));
    if (value) labels.push(labelName(config, d.label(value)));
  }
  const typeLabel = typeLabelFromDoc(docLink || fields.Doc || "");
  if (typeLabel) labels.push(labelName(config, typeLabel));
  return labels;
}

/**
 * One line per Status/Priority value that maps to no label — reported, where it used to leave the issue silently
 * unlabelled. An absent field is not a value: nothing to say.
 * @param {{idStr:string, fields:Record<string,string>}} entry
 * @param {object} [config]
 * @returns {string[]}
 */
export function unmappedWarnings(entry, config = DEFAULTS) {
  const warnings = [];
  for (const d of DIMENSIONS) {
    const value = (entry.fields[d.field] || "").trim();
    if (!value || canonicalValue(value, wordsOf(d, config))) continue;
    const shown = value.length > 40 ? `${value.slice(0, 40)}…` : value;
    warnings.push(
      `${entry.idStr}: ${fieldName(config, d.field)} «${shown}» matches no ${d.field.toLowerCase()} label — map its ` +
        `word in github.${d.words} of ${CONFIG_FILE} (onto: ${d.canonical.join(", ")})`,
    );
  }
  return warnings;
}

/** The comment left on an issue the mirror closes: the project's (`github.closeComment`), else the default. */
export const closeCommentFor = (config) => config?.github?.closeComment ?? GITHUB.closeComment;

/**
 * Map the Doc link's folder to a type label (features/→feature, bugs/→bug, …).
 * @param {string} docLink
 * @returns {string|null}
 */
export function typeLabelFromDoc(docLink) {
  const m = /(features|bugs|analysis|diagnostic)\//.exec(docLink);
  if (!m) return null;
  return TYPE_LABELS[/** @type {keyof typeof TYPE_LABELS} */ (m[1])];
}

/**
 * Build the issue body from the entry: Summary + a link to the detail doc.
 * Kept short — the long form lives in the repo doc.
 * @param {{fields:Record<string,string>}} entry
 * @param {string} repo owner/name, for the blob URL
 * @param {{branch?:string, docsDir?:string}} [where] the default branch and the register's folder, for the blob URL
 * @returns {string}
 */
export function issueBodyFor(entry, repo, { branch = "main", docsDir = DEFAULTS.docsDir } = {}) {
  const summary = entry.fields.Summary || "(no summary)";
  const docRaw = entry.fields.Doc || "";
  const docPath = /\(([^)]+)\)/.exec(docRaw)?.[1];
  const parts = [summary];
  if (docPath && docPath !== "—") {
    const blob = `https://github.com/${repo}/blob/${branch}/${docsDir}/${docPath.replace(/^\.\//, "")}`;
    parts.push("", `📄 Doc: ${blob}`);
  }
  parts.push(
    "",
    "<sub>Synced from BACKLOG.md by the `backlog` skill. Edit lifecycle HERE " +
      "(open/close · status:* / priority:* labels · assignee); the id and prose " +
      "live in the repo.</sub>",
  );
  return parts.join("\n");
}

/**
 * Compare the body an issue currently has against the one the file entry produces.
 *
 * NOT a raw `!==`. GitHub stores a body edited through the web UI with CRLF line
 * endings, and returns a missing body as null — so a raw compare would report a
 * difference on every single run, push a pointless `gh issue edit` each time, and
 * make the quiet "up to date" path unreachable. Normalizing line endings and the
 * outer whitespace is exactly the amount of tolerance that removes the false
 * positives without swallowing a real prose change (a difference anywhere INSIDE
 * the text still counts).
 *
 * @param {string|null|undefined} current body as GitHub has it (null when empty)
 * @param {string} desired body built from the BACKLOG.md entry
 * @returns {boolean} true when the issue needs its body rewritten
 */
export function bodyNeedsUpdate(current, desired) {
  const normalize = (s) => (s ?? "").replace(/\r\n/g, "\n").trim();
  return normalize(current) !== normalize(desired);
}

/**
 * Diff the labels an issue currently has vs the labels it should have, limited
 * to the labels we own (backlog / priority: / status: / the type labels, under
 * their canonical names and the project's). Foreign labels a collaborator added
 * are left untouched.
 * @param {string[]} current
 * @param {string[]} desired
 * @param {object} [config] the project's config (`github.labels`)
 * @returns {{add:string[], remove:string[]}}
 */
export function labelDelta(current, desired, config = DEFAULTS) {
  const named = new Set(GITHUB_LABELS.flatMap((c) => [c, labelName(config, c)]));
  const owned = (l) => named.has(l) || l.startsWith("priority:") || l.startsWith("status:");
  const cur = new Set(current);
  const des = new Set(desired);
  const add = desired.filter((l) => !cur.has(l));
  const remove = current.filter((l) => owned(l) && !des.has(l));
  return { add, remove };
}

// ============================================================
// gh gateway (the only network/process I/O)
// ============================================================

/** @typedef {{ok:true, stdout:string} | {ok:false, error:string, code:number|null}} GhResult */

/**
 * Run a `gh` command. Never throws — returns a tagged result so callers stay
 * fail-soft. Uses argv directly (shell:false) so bodies/titles need no escaping.
 * @param {string[]} args
 * @returns {GhResult}
 */
export function runGh(args, cwd = undefined) {
  const res = spawnSync(GH, args, { cwd, encoding: "utf8", env: process.env, shell: false });
  if (res.error) {
    const isMissing = /** @type {NodeJS.ErrnoException} */ (res.error).code === "ENOENT";
    return {
      ok: false,
      code: null,
      error: isMissing ? "`gh` CLI not found in PATH (install GitHub CLI)." : String(res.error.message),
    };
  }
  if (res.status !== 0) {
    return { ok: false, code: res.status, error: (res.stderr || res.stdout || "").trim() || `gh exited ${res.status}` };
  }
  return { ok: true, stdout: res.stdout };
}

/**
 * Fetch all backlog-labelled issues (any state) as structured records — the label under the project's name for it.
 * @param {string} repo
 * @param {object} [config]
 * @returns {{ok:true, issues:GhIssue[]} | {ok:false, error:string}}
 */
export function listBacklogIssues(repo, config = DEFAULTS) {
  const res = runGh([
    "issue", "list", "--repo", repo, "--label", labelName(config, BACKLOG_LABEL), "--state", "all",
    "--limit", "500", "--json", "number,title,state,labels,assignees,body",
  ]);
  if (!res.ok) return { ok: false, error: res.error };
  try {
    /** @type {Array<{number:number,title:string,state:string,labels:{name:string}[],assignees:{login:string}[],body:string|null}>} */
    const raw = JSON.parse(res.stdout);
    const issues = raw.map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state.toLowerCase(),
      labels: i.labels.map((l) => l.name),
      assignees: i.assignees.map((a) => a.login),
      body: i.body ?? "",
      bklg: /BKLG-(\d+)/.exec(i.title)?.[0] ?? null,
    }));
    return { ok: true, issues };
  } catch (e) {
    return { ok: false, error: `Could not parse gh JSON: ${String(e)}` };
  }
}

/** @typedef {{number:number, title:string, state:string, labels:string[], assignees:string[], body:string, bklg:string|null}} GhIssue */

/** Ensure a label exists (idempotent; --force creates or updates). Fail-soft. */
export function ensureLabel(repo, name, color) {
  return runGh(["label", "create", name, "--repo", repo, "--color", color, "--force"]);
}

/** Each canonical label's colour (the label is created under the project's name for it). */
const LABEL_COLORS = {
  backlog: "6f42c1",
  "priority:high": "d73a4a",
  "priority:medium": "fbca04",
  "priority:low": "0e8a16",
  "status:open": "c5def5",
  "status:in-progress": "1d76db",
  "status:blocked": "b60205",
  feature: "a2eeef",
  bug: "d73a4a",
  analysis: "bfdadc",
  diagnostic: "fef2c0",
};

// ============================================================
// CLI
// ============================================================

function readFileSafe(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/**
 * `owner/name` from a git remote URL (https or ssh); null when it is not a GitHub remote. Pure.
 * @param {string} url
 * @returns {string|null}
 */
export function repoFromRemote(url) {
  return /github\.com[/:]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(url.trim())?.[1] ?? null;
}

/**
 * The branch name from `git symbolic-ref refs/remotes/origin/HEAD` (`refs/remotes/origin/main` → `main`). Pure.
 * @param {string} ref
 * @returns {string|null}
 */
export function branchFromOriginHead(ref) {
  return /^refs\/remotes\/[^/]+\/(.+)$/.exec(ref.trim())?.[1] ?? null;
}

/** git in the project; null on any failure. */
function gitOut(args, root) {
  const res = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return res.status === 0 ? res.stdout.trim() : null;
}

/**
 * The project's GitHub repo, read from git so it cannot drift: `origin`'s URL (works even when gh is logged into
 * another account), else what gh says for the work tree. Null when neither knows — the caller asks for `--repo`.
 */
function deriveRepo(root) {
  const origin = gitOut(["remote", "get-url", "origin"], root);
  const fromOrigin = origin ? repoFromRemote(origin) : null;
  if (fromOrigin) return fromOrigin;
  const res = runGh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], root);
  return res.ok && res.stdout.trim() ? res.stdout.trim() : null;
}

/** The default branch the doc links point at: origin's HEAD, else gh's answer, else `main`. */
function deriveBranch(root, repo) {
  const head = gitOut(["symbolic-ref", "refs/remotes/origin/HEAD"], root);
  const fromHead = head ? branchFromOriginHead(head) : null;
  if (fromHead) return fromHead;
  const res = runGh(["repo", "view", repo, "--json", "defaultBranchRef", "-q", ".defaultBranchRef.name"], root);
  return res.ok && res.stdout.trim() ? res.stdout.trim() : "main";
}

/** @param {string} msg */
function warn(msg) {
  console.warn(`  ! ${msg}`);
}

function parseArgs(argv) {
  const flags = { execute: false, dryRun: true, repo: /** @type {string|null} */ (null) };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--execute") {
      flags.execute = true;
      flags.dryRun = false;
    } else if (a === "--dry-run") {
      flags.dryRun = true;
      flags.execute = false;
    } else if (a === "--repo") {
      flags.repo = argv[++i];
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function ensureAllLabels(repo, dryRun, config) {
  if (dryRun) return;
  for (const [canonical, color] of Object.entries(LABEL_COLORS)) {
    const name = labelName(config, canonical);
    const r = ensureLabel(repo, name, color);
    if (!r.ok) warn(`label '${name}': ${r.error}`);
  }
}

/**
 * Create-or-update the issue for one entry (file→GitHub). A Status/Priority value no label matches is warned about.
 * @param {ReturnType<typeof parseOpenEntries>[number]} entry
 * @param {GhIssue|undefined} issue existing issue for this BKLG, if any
 */
function upsertEntry(entry, issue, repo, dryRun, where, config) {
  const title = issueTitleFor(entry);
  const desired = labelsFor(entry.fields, undefined, config);
  const body = issueBodyFor(entry, repo, where);
  for (const w of unmappedWarnings(entry, config)) warn(w);
  if (!issue) {
    console.log(`  + CREATE issue "${title}"  labels=[${desired.join(", ")}]`);
    if (dryRun) return;
    const args = ["issue", "create", "--repo", repo, "--title", title, "--body", body];
    for (const l of desired) args.push("--label", l);
    const r = runGh(args);
    if (!r.ok) warn(`create failed for ${entry.idStr}: ${r.error}`);
    else console.log(`    → ${r.stdout.trim()}`);
    return;
  }
  const { add, remove } = labelDelta(issue.labels, desired, config);
  const reopen = issue.state === "closed"; // file says Open → GitHub should be open
  // The file OWNS the prose (see FIELD OWNERSHIP above), so a body that drifted —
  // because the entry's Summary/Doc changed here, or because someone edited the
  // issue text on GitHub — is rewritten from the entry. Announced in the log line
  // rather than done silently: it is the one field where this tool overwrites
  // GitHub-side text.
  const bodyChanged = bodyNeedsUpdate(issue.body, body);
  if (!add.length && !remove.length && !reopen && !bodyChanged) {
    console.log(`  = #${issue.number} ${entry.idStr} up to date`);
    return;
  }
  console.log(
    `  ~ #${issue.number} ${entry.idStr}` +
      (reopen ? " REOPEN" : "") +
      (bodyChanged ? " BODY" : "") +
      (add.length ? ` +[${add.join(", ")}]` : "") +
      (remove.length ? ` -[${remove.join(", ")}]` : ""),
  );
  if (dryRun) return;
  if (reopen) {
    const r = runGh(["issue", "reopen", String(issue.number), "--repo", repo]);
    if (!r.ok) warn(`reopen #${issue.number} failed: ${r.error}`);
  }
  if (add.length || remove.length || bodyChanged) {
    // One `gh issue edit` carries labels AND body — the common case costs no extra call.
    const args = ["issue", "edit", String(issue.number), "--repo", repo];
    for (const l of add) args.push("--add-label", l);
    for (const l of remove) args.push("--remove-label", l);
    if (bodyChanged) args.push("--body", body);
    const r = runGh(args);
    if (!r.ok) warn(`edit #${issue.number} failed: ${r.error}`);
  }
}

function cmdUpsert(bklgArg, { repo, where, backlogPath, config }, flags) {
  const md = readFileSafe(backlogPath);
  const entries = parseOpenEntries(md, config);
  const target = entries.find((e) => e.idStr.toLowerCase() === bklgArg.toLowerCase());
  if (!target) {
    console.error(`${bklgArg} not found in ## ${config.words.open} of BACKLOG.md`);
    process.exitCode = 1;
    return;
  }
  console.log(`upsert-issue ${target.idStr} → ${repo}  (${flags.dryRun ? "DRY-RUN" : "EXECUTE"})`);
  const listed = listBacklogIssues(repo, config);
  if (!listed.ok) {
    warn(`could not list issues: ${listed.error}`);
    warn("fail-soft: the file backlog is unchanged; retry once gh can reach the repo.");
    return;
  }
  ensureAllLabels(repo, flags.dryRun, config);
  const issue = listed.issues.find((i) => i.bklg === target.idStr);
  upsertEntry(target, issue, repo, flags.dryRun, where, config);
}

function cmdClose(bklgArg, { repo, config }, flags) {
  console.log(`close-issue ${bklgArg} → ${repo}  (${flags.dryRun ? "DRY-RUN" : "EXECUTE"})`);
  const listed = listBacklogIssues(repo, config);
  if (!listed.ok) {
    warn(`could not list issues: ${listed.error} (fail-soft)`);
    return;
  }
  const issue = listed.issues.find((i) => i.bklg?.toLowerCase() === bklgArg.toLowerCase());
  if (!issue) {
    warn(`no GitHub issue found for ${bklgArg} (nothing to close)`);
    return;
  }
  if (issue.state === "closed") {
    console.log(`  = #${issue.number} already closed`);
    return;
  }
  console.log(`  x CLOSE #${issue.number} "${issue.title}"`);
  if (flags.dryRun) return;
  const r = runGh(["issue", "close", String(issue.number), "--repo", repo, "--comment", closeCommentFor(config)]);
  if (!r.ok) warn(`close #${issue.number} failed: ${r.error}`);
}

function cmdSyncAll({ repo, where, root, backlogPath, historyPath, config }, flags) {
  console.log(`sync-all ⟷ ${repo}  (${flags.dryRun ? "DRY-RUN" : "EXECUTE"})\n`);
  const backlogMd = readFileSafe(backlogPath);
  const historyMd = readFileSafe(historyPath);
  const entries = parseOpenEntries(backlogMd, config);
  const listed = listBacklogIssues(repo, config);
  if (!listed.ok) {
    warn(`could not list issues: ${listed.error}`);
    warn("fail-soft: nothing changed. Ensure `gh auth login` (or GH_TOKEN) can reach " + repo + ".");
    process.exitCode = 1;
    return;
  }
  const issues = listed.issues;
  ensureAllLabels(repo, flags.dryRun, config);

  // ---- file → GitHub: every Open entry gets a matching, correctly-labelled issue.
  console.log("File → GitHub (Open entries):");
  for (const entry of entries) {
    const issue = issues.find((i) => i.bklg === entry.idStr);
    upsertEntry(entry, issue, repo, flags.dryRun, where, config);
  }

  // ---- GitHub → file: surface what a collaborator changed on the issue side.
  console.log("\nGitHub → file (collaborator-side changes to reconcile):");
  const openIds = new Set(entries.map((e) => e.idStr));
  const knownIds = knownBklgIds(backlogMd, historyMd);

  // New backlog issues a collaborator opened without a BKLG id yet → adopt. The ids already taken are the register's
  // own documents' (the activity folders and the archive too, as `next-id` reads them) and the issues' titles.
  const nextId = nextBklgId(registerIds(root, config).ids, issues.map((i) => Number(/BKLG-(\d+)/.exec(i.title)?.[1] ?? 0)));
  let adoptCounter = nextId;
  const orphans = issues.filter((i) => !i.bklg && i.state === "open");
  for (const i of orphans) {
    const newId = formatBklgId(adoptCounter++);
    console.log(`  ⬇ ADOPT issue #${i.number} "${i.title}" → ${newId} (add BKLG entry + retitle issue)`);
    warn(`adoption writes a new ## ${config.words.open} entry — do it via \`backlog\` so the doc folder is created too.`);
  }
  if (!orphans.length) console.log("  (no un-adopted backlog issues)");

  // Issues closed on GitHub whose entry is still Open → lifecycle owned by GitHub.
  const closedButOpen = issues.filter((i) => i.bklg && i.state === "closed" && openIds.has(i.bklg));
  for (const i of closedButOpen) {
    console.log(`  ⬇ CLOSED on GitHub but Open in file: ${i.bklg} (#${i.number})`);
    warn(`run \`backlog done ${i.bklg}\` to move it to BACKLOG-HISTORY.md + archive its doc folder.`);
  }

  // Issues referencing a BKLG that the file doesn't know at all → drift report.
  const unknown = issues.filter((i) => i.bklg && !knownIds.has(i.bklg));
  for (const i of unknown) {
    console.log(`  ? issue #${i.number} references ${i.bklg} not found in either backlog file`);
  }
  if (!closedButOpen.length && !unknown.length && !orphans.length) {
    console.log("  (backlog files already reflect the GitHub issue state)");
  }
  console.log(`\nDone. ${flags.dryRun ? "Dry-run — re-run with --execute to apply the file→GitHub writes." : "Applied."}`);
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  if (!["upsert-issue", "close-issue", "sync-all"].includes(command)) return usage();
  if (command !== "sync-all" && !positional[1]) return usage(`${command} needs a BKLG-NNN`);
  const { root, config, backlog, history } = project();
  const repo = flags.repo || deriveRepo(root);
  if (!repo) {
    warn(`no GitHub repo found for ${root} (no github.com origin, gh does not know it) — pass --repo owner/name.`);
    warn("fail-soft: the file backlog is unchanged.");
    return;
  }
  const ctx = {
    repo,
    where: { branch: deriveBranch(root, repo), docsDir: config.docsDir },
    root,
    backlogPath: path.join(root, backlog),
    historyPath: path.join(root, history),
    config,
  };
  if (command === "upsert-issue") return cmdUpsert(positional[1], ctx, flags);
  if (command === "close-issue") return cmdClose(positional[1], ctx, flags);
  return cmdSyncAll(ctx, flags);
}

function usage(err) {
  if (err) console.error(`Error: ${err}\n`);
  console.log(
    [
      "Usage: node <skill>/scripts/backlog-github-sync.mjs <command> [--execute] [--repo owner/name]",
      "",
      "Commands:",
      "  upsert-issue <BKLG-NNN>   create/update the entry's GitHub issue (file→GitHub)",
      "  close-issue  <BKLG-NNN>   close the entry's issue with a linking comment",
      "  sync-all                  reconcile ## Open ⟷ backlog issues + report drift",
      "",
      "Default is --dry-run (prints intended changes). --execute performs them.",
      "Auth: `gh auth login` once, OR export GH_TOKEN with a repo-scoped PAT.",
    ].join("\n"),
  );
  if (err) process.exitCode = 1;
}

// Only run the CLI when invoked directly (so tests can import the pure helpers).
if (isEntryPoint(import.meta.url)) {
  main();
}
