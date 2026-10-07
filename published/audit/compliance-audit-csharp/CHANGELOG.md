# Changelog

## [1.3.8] - 2026-10-07
- README: manual usage names the skill compliance-audit-csharp


## [1.3.7] - 2026-07-01
- Publish Claude Code migration (retarget from Gemini CLI distribution)


## [1.3.6] - 2026-04-06
- Flag repeated or semantic hardcoded string literals and prefer centralization through shared constants, resources, or configuration


## [1.3.5] - 2026-04-06
- Allow localized warning suppressions in generated Entity Framework migration files under `Migrations/`


## [1.3.4] - 2026-04-04
- Prefer enums over raw numeric domain codes when the value set is finite and semantic.


## [1.3.3] - 2026-04-04
- Block warning suppression shortcuts such as pragma, NoWarn, SuppressMessage, and GlobalSuppressions unless explicitly justified.


## [1.3.2] - 2026-03-27
- Extend the C# audit to flag duplicated implementation patterns and require extraction of generic reusable abstractions when the same behavior is implemented more than once.

## [1.3.1] - 2026-03-23
- Publish C# audit updates that defer balancing to the orchestrator


## [1.3.0] - 2026-03-23
- Taught the C# audit to route through `subagent-balancer-orchestrator` and to distinguish CLI quota balancing from API cost balancing.

## [1.0.1] - 2026-03-22
- Initial changelog creation and version bump for testing.
