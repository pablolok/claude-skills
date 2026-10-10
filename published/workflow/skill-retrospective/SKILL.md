---
name: skill-retrospective
description: Use when a piece of work closes — a backlog entry archived, a multi-round loop ended, a deliverable accepted or rejected, the user correcting the method — or when a hook asks for it. Reviews what the work taught and rewrites the skills it used in place so the next run is shorter and right first time; never appends a lessons log.
---

# Skill retrospective — every piece of work leaves the skills better

Every piece of work teaches something that makes a skill shorter or more right; what it taught is recorded by
cleaning the skill up, not by adding to it. A skill is working instructions, not a diary: a lesson goes where it
changes what is done next time, and what turned out wrong or useless goes away. A skill that only grows ends up slow
to read and contradicting itself.

## 1. Evidence (what happened, measured)

- **Which skills served the work**: `.claude/.state/skills-used.txt` (the `log-skill-use` hook), the skills edited in
  git since the last retrospective (`git log <last-retrospective>..HEAD -- .claude/skills ~/.claude/skills`), the
  skills whose scripts ran.
- **Where time went**: the commits since `.claude/.state/last-retrospective`, the rounds and their scores, the
  steps redone, the user's corrections — quote them.
- **The root cause of each waste**, not its symptom: a missing step, a wrong default, a method that was the wrong
  tool (many rounds hand-tuning an output that a different method got right in one), a check that measured the wrong
  thing, two skills that disagree. A cause goes into a skill only when the evidence shows it (a re-run, a log, an
  output); an explanation nothing confirmed is a hypothesis and stays out.

## 2. Rewrite each skill used

For every skill, open the whole file and edit it as its owner would:
- **A shared skill stays generic** — a plugin or a user-level skill (`~/.claude/skills`) serves every project and
  every person: no person's or project's names, files, tools or examples in it, no rule owned by someone ("the
  user wants…"); its examples neutral (a job, a record, a config). What is specific to this project goes in the
  project's own skills (`.claude/skills`); a general lesson learnt on a project is written in general terms.
- **Put the lesson where it acts**: the step it changes, the default it fixes, the check it adds — as an instruction.
  The reason in one line, in general terms; no story of the rounds, no dated quote.
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
  - **the project's own** (committed under its `.claude/skills/` and not listed in `.claude/claude-skills.json`): edit
    it there, in the project's commit;
  - **installed from a skill repository** — a plugin (listed as `<plugin>:<skill>`, its files in the plugin cache), or
    a managed copy (a folder under `.claude/skills/` that `.claude/claude-skills.json` lists, copied from the
    repository's tag): the source is the repository it comes from. Never edit a managed copy: its `check` fails on
    any hand edit; fix the source as below (a lesson is a patch), then the project runs its sync to the new
    version and commits the diff.
    - **Find the clone before concluding there is none**: `CLAUDE_SKILLS_REPO` names it when set; otherwise look
      for a local repository whose `git remote` is the plugin's repository (its `plugin.json`, or the
      marketplace's). When the person maintains it (a clone they push to), edit the skill there, run its tests,
      publish a new version with the repository's own flow (patch for a lesson, minor for a new step), commit, tag
      and push; then bring the projects up to it (`claude plugin update`, or the version a project pins).
    - **A repository the person does not maintain** (another organisation's plugin, a marketplace they only
      install from), or a maintained one with no clone here (a cloud session, a collaborator's machine): never
      edit the installed copy, and open no issue or pull request unasked — an issue is a public action in the
      person's name. Report the general lesson in the summary; file it only when the person asks.
  - **built into the host** (a skill that ships with the agent itself, with no repository to edit): no edit; a
    project-specific lesson goes in the project's own skills, a general one is reported.
  - **user-level** (`~/.claude/skills`) kept in a versioned repo: edit it, then copy it back there and push.
- **Scripts follow the skill**: a script the skill no longer calls is deleted; a fix that recurs becomes a script
  option, not a paragraph.

## 3. Check

- Skills that touch the same topic agree (search the others for the rule you changed).
- Every file, script and link a skill names exists; the project's doc gates pass.
- Re-read each rewritten skill top to bottom as if new to it: would it have avoided the waste found in §1?

## 4. Record and report

- Commit following the conventions of the repository the commit lands in — its CLAUDE.md or AGENTS.md, a
  commit-message rule or hook, its recent `git log`: the language, the subject's form and length, subject and body.
  The body lists per skill what changed and why. Only a repository with no convention gets the default subject
  `skills: retrospective — <the work>`.
- Write the HEAD commit to `.claude/.state/last-retrospective`; empty `.claude/.state/skills-used.txt`.
- Memory is for the user's preferences and the project's facts, not for skill content: a lesson about how to
  do the work lives in the skill.
- Tell the user in a few lines which skills changed and the one thing each will do differently.
