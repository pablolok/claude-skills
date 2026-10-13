# Jira Workflow

Use this whenever work is tracked in Jira: the tracker is updated before the code, the backlog file, the commit and
the release, and it always says what is true.

## What It Covers

- Jira first: a ticket in progress before the work, a comment at every step, discoveries filed at once
- the status moved when the fact happens, one ticket at a time; a parent with an open sub-task stays in progress
- bug comments with the measured cause and the fix
- who does what: the user's manual work assigned to them, the agent's work labelled and unassigned
- sprints, story points and hours on every ticket at creation, continuous worklogs with the real hours
- goals, key results and releases kept current at every status change
- the total review: the queries that must return zero rows
- the Atlassian connector's pitfalls: one call at a time, the order of transitions and fields, goal ARIs, JQL limits
- ticket keys as links in chat
- dependencies as Blocks links in the right direction, and a work order that follows them

## Parameters

The skill is generic. Each project keeps a Jira playbook that declares its values — site and `cloudId`, board,
status cycle and transition ids, role and plan labels, sprints, the points constant, the story point field id, goals,
title conventions and where dependencies are written — and the skill reads them from there.

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install jira-workflow@pablolok-skills --scope user` (every project) or `--scope project`.
