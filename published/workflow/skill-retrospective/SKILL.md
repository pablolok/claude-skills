---
name: skill-retrospective
description: Use at the close of tracked work or an accepted/rejected deliverable, or after a user correction of the method. Start with a brief evidence check; investigate and revise only skills implicated by an observed problem. No automatic rewrite or publication.
---

# Skill retrospective

## Brief closing check

Review the outcome and the evidence already collected: errors, repeated attempts, user corrections,
conflicting instructions or a repeated gap. Name the problem and the skill involved in one short note.
**No observed problem** means **no skill edits**, no transcript sweep and no publication. Report that
there is no lesson requiring a change; this completes the retrospective. Do not manufacture a lesson.

A new skill invocation, an archived entry or a commit-count hint triggers this brief check, not a
requirement to rewrite every skill. Reuse the evidence in the work's ledger and logs first.

## When a problem is observed

Read [investigation and rewrite](references/investigation-and-rewrite.md) for that problem only.
Use a transcript digest only when existing evidence cannot explain the failure, limited to the
implicated session/time range; never load whole transcripts. Revise the relevant instruction at its
source, remove the contradicted rule and verify related skills still agree. Third-party installed
copies stay untouched.

Commit, tag, push and publishing follow explicit user authorization and repository policy, even when
a detailed procedure lists them. Record prepared source changes separately from installed versions.
A skill improvement outside the authorized work is reported for a separate decision.

## Checkpoint and report

After either outcome, record the current HEAD as the retrospective checkpoint in
`.claude/.state/last-retrospective` and clear `.claude/.state/skills-used.txt` as the existing hooks
expect. This is local workflow state, not a commit. Report only the observed problem, the narrow
change and its verification, or the explicit no-change outcome.
