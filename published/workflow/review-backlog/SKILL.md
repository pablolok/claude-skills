---
name: review-backlog
description: |
  Periodic review of a project's backlog (the `backlog` skill's BACKLOG.md): run the document gates, clean up what
  has rotted, and close with ONE proposal of what to do next. Use when the user says "review del backlog",
  "pulizia e proposta", "cosa c'è da fare", "cosa facciamo adesso", "controlla che i documenti siano a posto",
  "what's next", "review the backlog", or at the start of a session with no work already in progress. Read-only
  until the cleanup, and the cleanup touches ONLY documents.
---

# Backlog review — gates, cleanup, proposal

Three acts, in this order, and the order matters: **the gates say what is broken in the documents**, **the cleanup
repairs what has rotted**, **the proposal is made on a clean index** — proposing from a dirty backlog is proposing
on false premises, the very defect this review exists to remove.

> ⛔ **No act of this review stops the work.** It ends with the next move, and that move starts — never with "if
> you want we can stop here".

The register's format and the project's conventions (its extra fields, its pending ledgers, how it verifies, its
roadmap) are the `backlog` skill's and the preamble of the project's `BACKLOG.md`, with the conventions document it
links when it has one: read them first.

---

## Act 1 — The document gates

The gates ship with the `backlog` skill, in its `scripts` folder: run each as
`node <the backlog skill's base directory>/scripts/<gate>.mjs`. Run **all** of them, each **plain, then read its
exit code** — `node gate.mjs | tail` reports `tail`'s status, and `| head` is worse because it looks like a reading
(a review once reported 8 broken references where there were 224: the true count was on the line cut off).

| gate | the question |
|---|---|
| `check-doc-refs.mjs` | links, `file:line`, backticked paths, `[[BKLG-NNN]]` citations, orphan activity folders |
| `backlog-anchor.mjs --all` | what an entry DECLARES it changed cites it back, defect markers both ways |
| `architecture-shape.mjs` | every stable doc has its two canonical sections and an owner cell per defect |
| `backlog-coherence.mjs` | an entry lives in one place: never open and closed at once, never twice in one register |
| `closed-defects.mjs` | a defect whose closing entry is closed is no longer listed open |

Plus any gate the project's preamble or CLAUDE.md adds. Read each one's **control count**: "0 broken" without "out
of how many examined" cannot be told apart from "didn't look".

| result | meaning | action |
|---|---|---|
| 0 broken **and** the examined counts are non-zero | the gate really read | move on |
| an **orphan folder** under the activity folders | an entry was closed without moving its folder to `archive/`, **or** a folder was born without an entry — the most frequent finding | move the folder, or open the entry |
| a bare `BKLG-NNN` | the entry is named but not cited: the tools reading references don't see it | write `[[BKLG-NNN]]` |
| a dead `[path]` or `[link]` | the doc points at a file that isn't there: it gets believed, and its evidence can't be opened | update it; if the code was deleted, **remove the claim**. A legitimate case goes in `pathExceptions` with its reason |
| a declared doc that doesn't cite its entry | the close didn't add the row in `## Who worked on it` | add the row; once closed, the `#D<n>` marker must **leave** the open defects |
| "touched and not declared" | a **list**, not a red: the git footprint over-attributes shared files | look, don't necessarily fix |

⚠️ The gates answer **one question each**. None can tell whether a **number written in a document is still true** —
that needs re-measuring, which is Act 2.

---

## Act 2 — The cleanup

### The ledgers at the top of `BACKLOG.md`

Every pending ledger the project keeps (verification, deploy, migration…) answers *what has been committed but not
yet checked / shipped?*. The defect that grows there: lines whose check **already passed** or whose deploy already
landed, ✅ lines left behind — the ledger becomes a graveyard nobody reads. Verify each line **against the thing**
(run the check, look at the deploy) before removing it. A line with a **relative date** ("waits for tomorrow",
"today's batch") expires at midnight: rewrite it with the real date.

A **dated** section (a log of today's deploys or releases) whose date is not today is **moved** to the top of its
history file and reopened with today's date. ⛔ **Move, never delete**: what shipped, what it cost, what was
verified live — the things looked for months later, which `git log` only finds if you already know the commit.

Moving blocks between files is done with a script that reads the file's own line separator (some docs are CRLF),
then `git diff --stat`: if the changed lines are not the expected ones, restore and redo.

### The six ways an entry rots

Search for them **in this order** — the first ones invalidate the later ones.

1. **The premise was falsified by a later measurement.** Don't delete the entry: **rewrite it on the measured
   premise**, keeping the old one written as withdrawn, with the date and why. Deleting it gets the same diagnosis
   proposed again tomorrow.
2. **The work moved and the `Status` didn't.** `open` on an entry half in production wastes a round of conversation
   for whoever reads it and **gets work repeated**. Rewrite it with the true position, never better than it is — and
   the phase-table rows whose open items that work closed.
3. **The wait is dead.** `blocked — on [[BKLG-NNN]]` where that entry is closed, "waiting for the deploy" where it
   landed days ago. ⛔ **A blocker is verified in the CODE, not in the plan.** A wait for the first live data (a
   column never written, a job never seen running) is closed with **one query**, not by reading the document.
4. **A withdrawn decision has REVIVED because the population changed.** The sneakiest: "⛔ dropped — zero rows"
   stays true on the data of then and turns false when the data changes. Check against **recent** work, not the
   entry's date.
5. **Two entries say the same thing**, or one became a piece of the other. Merge them, naming which absorbs which —
   never two live entries on one defect.
6. **An observation has no home.** Something seen live and recorded in a commit, a log or a chat that belongs to no
   entry. It finds its entry or opens one — written as an observation, with the measurement, **not deduced**.

Then what the project's preamble asks a review to check (a roadmap whose slices must still exist, a `Manual` step
the person may already have done — ask, or verify in the repo).

### ⛔ The rule that holds the whole cleanup

**Every claim is verified against the thing it claims, never against another document.** "Live since the 12th" is
checked in `git log` and the deploy log; "zero rows" with a query; "that file no longer exists" with `ls`.
⚠️ **Against the real input, not a stand-in**: an entry opened from a reproduction is checked to have every field
the real input has — reproductions built on inputs the product never produces have opened entries for defects that
did not exist.

⚠️ **Never back-filled.** A `Status` deduced from memory for an entry nobody has looked at in weeks is invented
data, and it would be believed. A bare `open` is honest. Touch only what was **verified** this session.

---

## Act 3 — The proposal

**One move**, not a menu. A list of twelve candidates with pros and cons hands the decision back to whoever asked
for the review, and is how a review produces no work.

| | |
|---|---|
| **what** | the work, in one line, and which entry (or roadmap item) it belongs to |
| **why now** | the criterion — one of those below, never "it's important" |
| **what it costs** | documents only / code / a deploy or migration / a manual step / credits (say **how many**) |
| **the alternatives** | two or three, **one line each** saying why they're not first |

Criteria that make a real "now", strongest first:

1. ⭐ **An open window**: a live defect, a measurement about to expire, a change just shipped that invalidates old
   probes. Windows order the work better than any written priority.
2. ⭐ **The prerequisite of something else** — it unblocks more than itself.
3. **A defect that is wrong SILENTLY**: a refusal shows; a wrong amount or a wrong attribution does not.
4. **The cost of waiting grows**: data dirtied on every run, rows piling up.
5. **Work already half done**, with the second half cheap.

⚠️ **The priority written in the entry is not a criterion.** It is the opinion of whoever opened it, often weeks
ago — this review is where it gets corrected, more often down than up.

⛔ **Don't propose the easiest work because it's easy.** If the honest candidate is expensive, say so and propose it
anyway.

---

## What this review is NOT

| not | why |
|---|---|
| a mass update of `Status` | a field deduced from memory is invented data: touch only what was **verified** this session |
| a closing campaign | an entry closes when the work is done **and verified**, not when it looks old |
| a rewrite of the architecture docs | those are updated **in the same diff as the work** they describe |
| an inventory | "92 open, here they all are" is not a review. Say the count once; the rest is what **changed** |

## The final report

Four things and nothing else:

- **the gates**, with their control counts (`0 broken out of 567 examined`, not `0 broken`);
- **what was cleaned**, one line each, and **what it was verified against**;
- **the proposal**, in the Act 3 form;
- if the cleanup touched files, the **commit** that carries it — repaired documents are committed in the same
  session, or the next review finds them identical.
