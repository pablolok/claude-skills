# TypeScript / React Standards

The TypeScript, React and Node/Deno layer on top of `clean-code-standards`: the core's design discipline applies in
full to every TS/React task, and this skill adds only what is TS/React-specific.

## What It Adds

- TypeScript conventions and React conventions for the core's rules
- the TS/React quality gates
- what to look for when reviewing or refactoring TS/React

## Where It Sits

Apply it together with `clean-code-standards` while writing TypeScript or React; `pre-implementation-review` comes
before the code and `verification-gates` after it.

## Installing

As a Claude Code plugin: `claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install typescript-react-standards@pablolok-skills --scope user` (every project) or
`--scope project`. Install `clean-code-standards` with it: this layer assumes the core. A hook that gates on this
skill sees the name `typescript-react-standards:typescript-react-standards` when it runs from the plugin: match the
part after the last colon.
