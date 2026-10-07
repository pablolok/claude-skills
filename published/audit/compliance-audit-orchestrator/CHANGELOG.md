# Changelog

## [1.4.4] - 2026-10-07
- Dispatches the C# audit by its installed name, compliance-audit-csharp (the retired compliance-audit-c# name matched no installed skill, so the C# audit never ran); a plugin-installed skill (<name>:<name>) counts as present


## [1.4.3] - 2026-07-01
- Publish Claude Code migration (retarget from Gemini CLI distribution)


## [1.4.2] - 2026-04-04
- Route frontend styling changes to the dedicated cross-framework frontend styling audit.


## [1.4.1] - 2026-04-04
- Route cross-framework frontend styling changes to `compliance-audit-frontend-styling` when frontend indicators and styling files are present.

## [1.4.0] - 2026-03-25
- Route Avalonia UI changes to `compliance-audit-avalonia` when Avalonia project indicators are present.


## [1.3.0] - 2026-03-24
- Run the verification-gate audit before specialized audits and document the warning-free verification policy


## [1.2.3] - 2026-03-24
- Make orchestrator workflow and skill-definition changes proposal-only instead of automatic.


## [1.2.2] - 2026-03-24
- Route Angular changes to compliance-audit-angular when Angular project indicators are present.


## [1.2.1] - 2026-03-23
- Publish audit routing updates that defer balancing to the orchestrator


## [1.2.0] - 2026-03-23
- Added support for the balancer split by preferring `subagent-balancer-orchestrator` and falling back to CLI-vs-API balancer selection when needed.

## [1.0.1] - 2026-03-22
- Initial changelog creation and version bump for testing.
