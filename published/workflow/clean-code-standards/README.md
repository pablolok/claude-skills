# Clean-Code Standards

A language-agnostic quality bar for writing, refactoring and reviewing code in any language. It is
the core that the per-language layers (`csharp-oop-standards`, `typescript-react-standards`) build on.

## What It Enforces

- single responsibility; collaborators injected, not reached for
- Tell-Don't-Ask; no god objects, including one class carrying many capability interfaces
- no business logic in static or global scope
- strong typing over magic values; semantic literals centralized
- a reuse audit before adding anything new
- fail-fast inputs; no suppressed warnings

## Where It Sits

Same principle, three moments: **plan clean → write clean → verify clean.**
`pre-implementation-review` plans the design before code, this skill (plus the language layer) governs the writing,
and `verification-gates` confirms the gates are green before the work is handed back.

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install clean-code-standards@pablolok-skills --scope user` (every project) or `--scope project`.
A hook that gates on this skill sees the name `clean-code-standards:clean-code-standards` when it runs from the
plugin: match the part after the last colon.
