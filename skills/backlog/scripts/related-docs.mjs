#!/usr/bin/env node
/**
 * **Which documents talk about what you touched, and you did not open them.**
 *
 * Docs drift when work moves on and nobody looks at the neighbouring document. This lists, for a
 * change: the live docs that CITE an entry being worked on (the strong list), and those that NAME a
 * file the change touched. Docs updated in the same change are not listed — someone already looked.
 *
 * It is NOT a gate: it always exits 0. Code and docs overlap often, and "I opened them and they are
 * still right" is a frequent, useful outcome that no edit could turn green — a gate nothing can
 * close is a gate people learn to skip. It does not know whether a doc is still TRUE, only that
 * nobody went to look.
 *
 * Usage (a post-commit hook is its natural home: `node <skill>/scripts/related-docs.mjs HEAD || true`):
 *   node <skill>/scripts/related-docs.mjs                     # uncommitted work
 *   node <skill>/scripts/related-docs.mjs <commit>            # a commit already made
 *   node <skill>/scripts/related-docs.mjs --entry BKLG-NNN    # name the entry when there is no message yet
 */
import { execFileSync } from "node:child_process";
import { describesThePast, docIndex } from "./docIndex.mjs";
import { project } from "./project.mjs";
import { isEntryPoint } from "./entry-point.mjs";

// Re-exported so its test (with its control case) can sit among this tool's tests.
export { describesThePast };

const gitIn = (root) => (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1e8 });
const git = gitIn(process.cwd());

/** The files a change touched, and its message (empty for uncommitted work). */
export function change(commit, run = git) {
  const raw = commit
    ? run(["show", "--name-only", "--format=", commit]).trim()
    : run(["status", "--porcelain"]).trim();
  if (!raw) return { files: [], message: "" };
  const lines = raw.split("\n").filter(Boolean);
  const files = (commit ? lines : lines.map((r) => r.slice(3).trim()))
    // A rename arrives as `old -> new`: the new name is the one that counts.
    .map((f) => f.split(" -> ").pop().replace(/^"|"$/g, ""))
    .filter(Boolean);
  return { files, message: commit ? run(["log", "-1", "--format=%B", commit]) : "" };
}

/**
 * The only decision in here, pure. A doc that both cites the entry and names a file appears once,
 * in the stronger list.
 */
export function toCheck({ namesFile, citesEntry, changedSources, changedDocs, touchedEntries }) {
  const perEntry = [...citesEntry.entries()]
    .filter(([d, s]) => !changedDocs.has(d) && [...touchedEntries].some((e) => s.has(e)))
    .map(([d]) => d)
    .sort();
  const perFile = [...namesFile.entries()]
    .filter(([d, s]) => !changedDocs.has(d) && changedSources.some((f) => s.has(f)))
    .map(([d]) => d)
    .filter((d) => !perEntry.includes(d))
    .sort();
  return { perEntry, perFile };
}

function main() {
  const args = process.argv.slice(2);
  // The first argument that is neither a flag nor an entry id is the commit.
  const commit = args.find((a) => !a.startsWith("--") && !/BKLG-\d+/.test(a));
  const { root, config } = project();
  const { files: changed, message } = change(commit, gitIn(root));
  if (!changed.length) {
    console.log("related docs: nothing to compare — no changes.");
    return 0;
  }

  const { sources, namesFile, citesEntry } = docIndex(root, { config });
  const changedSources = changed.filter((f) => sources.has(f));
  const changedDocs = new Set(changed.filter((f) => f.endsWith(".md") && !describesThePast(f, config)));

  // The entry being worked on comes from the commit message or from the arguments — NOT from
  // source comments, which cite entries to explain history, not to say "I am working on this".
  const touchedEntries = new Set([...message.matchAll(/BKLG-\d+/g)].map((m) => m[0]));
  for (const a of args) for (const m of a.matchAll(/BKLG-\d+/g)) touchedEntries.add(m[0]);

  const { perEntry, perFile } = toCheck({ namesFile, citesEntry, changedSources, changedDocs, touchedEntries });

  console.log(`change: ${commit ?? "uncommitted work"}`);
  console.log(`files touched: ${changed.length} · of which sources: ${changedSources.length}`);
  console.log(`entries being worked on: ${touchedEntries.size ? [...touchedEntries].sort().join(", ") : "—"}`);
  // The control case: without it, "0 to look at" does not differ from "looked at nothing".
  console.log(
    `docs updated in the change: ${changedDocs.size}` +
      (changedDocs.size ? ` · ${[...changedDocs].sort().join(", ")}` : ""),
  );

  if (perFile.length) {
    console.log(`\n📄 name a FILE you touched (${perFile.length}) — to look at, not necessarily to fix:`);
    for (const d of perFile) console.log(`   · ${d}`);
  }
  if (perEntry.length) {
    console.log(`\n📌 CITE an entry you are working on (${perEntry.length}) — the stronger list:`);
    for (const d of perEntry) console.log(`   · ${d}`);
    console.log(
      "\n   One of these may state something the work just changed. Open it: if it is still true, fine;\n" +
        "   if not, rewrite it — even when that means dropping a premise or lowering a priority.",
    );
  }
  if (!perEntry.length && !perFile.length) {
    console.log("\n✅ no live doc talks about what you touched without being updated.");
  }
  // Always 0, by design (see the header): this is a prompt to look, not a gate.
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  process.exit(main());
}
