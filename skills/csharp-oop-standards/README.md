# C# / OOP Standards

The C#/.NET layer on top of `clean-code-standards`: the core's design discipline applies in full to every C# task,
and this skill adds only what is C#-specific.

## What It Adds

- C# conventions and idioms for the core's rules
- the C# quality gates and the coverage bar
- the persistence stack (repository, UnitOfWork, EF) as an opt-in, project-specific rule — never a universal one
- what to look for when reviewing or refactoring C#

## Where It Sits

Apply it together with `clean-code-standards` while writing C#; `pre-implementation-review` comes before the code
and `verification-gates` after it.

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install csharp-oop-standards@pablolok-skills --scope user` (every project) or `--scope project`.
Install `clean-code-standards` with it: this layer assumes the core. A hook that gates on this skill sees the name
`csharp-oop-standards:csharp-oop-standards` when it runs from the plugin: match the part after the last colon.
