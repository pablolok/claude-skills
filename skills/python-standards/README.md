# Python Standards

The Python layer on top of `clean-code-standards`: the core's design discipline applies in full to every Python task,
and this skill adds only what is Python-specific — always through the project's own runner, minimum version and
checkers, never tools it does not use.

## What It Adds

- Python conventions and idioms for the core's rules
- the Python quality gates (tests, coverage, type checker and linter where the project defines them)
- what to look for when reviewing or refactoring Python

## Where It Sits

Apply it together with `clean-code-standards` while writing Python; `pre-implementation-review` comes before the code
and `verification-gates` after it.

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install python-standards@pablolok-skills --scope user` (every project) or `--scope project`.
Install `clean-code-standards` with it: this layer assumes the core. A hook that gates on this skill sees the name
`python-standards:python-standards` when it runs from the plugin: match the part after the last colon.
