---
name: skill-retrospective
description: Use when a piece of work closes — a backlog entry archived, a multi-round loop ended, a deliverable accepted or rejected, the developer correcting the method — or when a hook asks for it. Reviews what the work taught and rewrites the skills it used in place so the next run is shorter and right first time; never appends a lessons log.
---

# Skill retrospective — every piece of work leaves the skills better

The developer (2026-10-02): "quello che impari dagli errori va registrato e non aggiungiamo robe a una skill, la
skill deve essere ripulita e ottimizzata; ogni lavoro si può imparare qualcosa che permetta di ottimizzare la
skill". A skill is working instructions, not a diary: a lesson goes where it changes what is done next time, and
what turned out wrong or useless goes away. A skill that only grows ends up slow to read and contradicting itself.

## 1. Evidence (what happened, measured)

- **Which skills served the work**: `.claude/.state/skills-used.txt` (the `log-skill-use` hook), the skills edited in
  git since the last retrospective (`git log <last-retrospective>..HEAD -- .claude/skills ~/.claude/skills`), the
  skills whose scripts ran.
- **Where time went**: the commits since `.claude/.state/last-retrospective`, the rounds and their scores, the
  steps redone, the developer's corrections — quote them.
- **The root cause of each waste**, not its symptom: a missing step, a wrong default, a method that was the wrong
  tool (many rounds hand-tuning an output that a different method got right in one), a check that measured the wrong
  thing, two skills that disagree.

## 2. Rewrite each skill used

For every skill, open the whole file and edit it as its owner would:
- **A user-level skill (`~/.claude/skills`) stays generic** — it serves every project (the developer, 2026-10-03:
  "le skill generiche devono rimanere generiche"): no project's names, files, tools or examples in it; its examples
  neutral (a job, a record, a config). What is specific to this project goes in the project's own skills
  (`.claude/skills`); a general lesson learnt on a project is written in general terms.
- **Put the lesson where it acts**: the step it changes, the default it fixes, the check it adds — as an instruction.
  The reason in one line (with the date and the developer's words when they matter); no story of the rounds.
- **Delete** what proved wrong, obsolete or unused: a superseded method, a retired tool's steps, a rule repeated in
  three places. Moving the reasoning into a commit message is fine; keeping it in the skill is not.
- **Merge and order**: one place per rule; the procedure in the order it is done; the best method first, the
  fallback after (or gone).
- **No "Lessons", "History", "Changelog" or "Notes" sections.** If a list of traps is genuinely needed, it is a short
  checklist used at a named step, each line an action.
- **Keep it lean**: aim at ≤ ~200 lines for a SKILL.md; past that, split by responsibility or move detail into a
  referenced file or a script. The `description` stays an accurate trigger.
- **Edit a skill at its source** — an installed copy is overwritten at the next update. Find where each skill comes
  from before touching it:
  - **the project's own** (committed under its `.claude/skills/`): edit it there, in the project's commit;
  - **installed from a skill repository** — a plugin (listed as `<plugin>:<skill>`, its files in the plugin cache):
    the source is that repository. When a clone of it is
    on this machine (the `CLAUDE_SKILLS_REPO` environment variable names it) and the person working owns it, edit
    the skill there, run its tests, publish a new version with the repository's own flow (patch for a lesson, minor
    for a new step), commit, tag and push; then bring the projects up to it (`claude plugin update`, or the
    version a project pins). Without a clone — a cloud session, a collaborator's machine — never edit the installed
    copy: open an issue on the skill repository with the lesson as the instruction to add, and say so in the report;
  - **user-level** (`~/.claude/skills`) kept in a versioned repo: edit it, then copy it back there and push.
- **Scripts follow the skill**: a script the skill no longer calls is deleted; a fix that recurs becomes a script
  option, not a paragraph.

## 3. Check

- Skills that touch the same topic agree (search the others for the rule you changed).
- Every file, script and link a skill names exists; the project's doc gates pass.
- Re-read each rewritten skill top to bottom as if new to it: would it have avoided the waste found in §1?

## 4. Record and report

- Commit: `skills: retrospective — <the work>`, the body listing per skill what changed and why.
- Write the HEAD commit to `.claude/.state/last-retrospective`; empty `.claude/.state/skills-used.txt`.
- Memory is for the developer's preferences and the project's facts, not for skill content: a lesson about how to
  do the work lives in the skill.
- Tell the developer in a few lines which skills changed and the one thing each will do differently.
