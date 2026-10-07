---
name: compliance-audit-orchestrator
description: Use when finalizing an implementation phase in a Conductor track to invoke the generic verification-gate audit first, then determine and invoke the correct specialized compliance audit (C#, Scripts, Angular, Avalonia UI, or Frontend Styling) based on the files modified.
---

# Compliance Audit Orchestrator

This skill acts as the central entry point for compliance audits. It ensures that the correct specialized audit is performed based on the files you have modified during the current implementation phase.

## Repository Boundary

This skill is read-only with respect to skill infrastructure and workflow definitions.

- Do not edit specialized audit skills, published skill payloads, installer/publisher tooling, or `conductor/workflow.md` while performing orchestration.
- If you discover that routing should change, a new audit is needed, or a workflow rule is stale, report that as a proposal to the user.
- Let the user decide whether the follow-up belongs in the skill repository as a separate implementation task.

## Orchestration Logic

When you invoke this skill, you MUST:

1.  **Identify Modified Files:** List all files created or modified during the current implementation phase.
2.  **Skill Standards Audit**: If any skill-related files (`SKILL.md`, `metadata.json`) were modified, verify that they meet the official standards (SemVer, correct frontmatter, present README).
3.  **Verify Skill Presence:** Before any invocation, you MUST verify if the required specialized skill is "installed" and available for use in the current environment. A skill is considered available if its `SKILL.md` file exists in either:
    *   The project's local `skills/` directory.
    *   The user's global `.claude/skills/` directory.
3.  **Resolve Delegation Through The Balancer Layer:** Before dispatching to a specialized audit:
    *   If `subagent-balancer-orchestrator` is available, invoke it first and carry its routing decision into the specialized audit.
    *   If the orchestrator is not available but a direct balancer is already clearly appropriate from explicit task context, you may invoke that balancer directly.
    *   If no balancer layer is available, prefer a local audit rather than re-implementing balancing policy in this skill.
4.  **Fallback Policy Without A Balancer Layer:** If no orchestrator or direct balancer is available:
    *   preserve explicit user model constraints
    *   prefer a local audit first
    *   only delegate when the audit is clearly too broad or risky to keep local
    *   if delegation is still needed, use one bounded generalist review subagent and avoid chaining
5.  **Determine and Dispatch:** a skill is present under its name (`compliance-audit-csharp`) or, when installed as a Claude Code plugin, as `<name>:<name>` (`compliance-audit-csharp:compliance-audit-csharp`) — either counts.
    *   **Verification Gates Audit:** If any code files were modified, verify the presence of `compliance-audit-verification-gates`. If present, invoke it first to confirm required automated verification is complete and warning-free before manual verification can proceed.
    *   **C# Audit:** If any **C# files** (`.cs`, `.csproj`, `.sln`) were modified, verify the presence of `compliance-audit-csharp`. If present, invoke it.
    *   **Scripts Audit:** If any **Script files** (`.ps1`, `.py`, `.sh`, `.bat`, `.js` for Node.js scripts) were modified, verify the presence of `compliance-audit-scripts`. If present, invoke it.
    *   **Angular Audit:** If Angular indicators are present (for example `angular.json`, `@angular/` imports, Angular component/template/style conventions, or Angular workspace structure) and Angular UI files (`.ts`, `.html`, `.scss`, `.css`) were modified, verify the presence of `compliance-audit-angular`. If present, invoke it.
    *   **Avalonia Audit:** If Avalonia indicators are present (for example `Avalonia` package references, `App.axaml`, `Styles.axaml`, `FluentTheme`, `.axaml` files, or Avalonia resource dictionaries) and Avalonia UI files (`.axaml`, `.xaml`, related `.cs`, `.csproj`, and UI asset files) were modified, verify the presence of `compliance-audit-avalonia`. If present, invoke it.
    *   **Frontend Styling Audit:** If frontend indicators are present (for example `angular.json`, `package.json`, `vite.config.*`, `next.config.*`, `nuxt.config.*`, `src/app`, `src/components`, `src/styles`, `@angular/`, `react`, `vue`, or `svelte`) and frontend styling files (`.css`, `.scss`, `.sass`, `.less`) or co-located UI component files with styling concerns were modified, verify the presence of `compliance-audit-frontend-styling`. If present, invoke it.
6.  **Handling Missing Skills:** If a specialized audit is required based on the file changes but the skill is NOT found:
    *   DO NOT fail silently. 
    *   Inform the user clearly: *"The implementation modified <file types> but the required specialized audit skill '<skill name>' was not found."*
    *   Propose alternative verification or skip as per user preference.
7.  **Sequential Execution:** If multiple audits are required and available, run them sequentially with `compliance-audit-verification-gates` first, then C#, then Angular, then Avalonia, then Frontend Styling, then Scripts.

## Future Extensibility Pattern

To add support for a new specialized audit (e.g., `compliance-audit-react`):
1.  Add a new file pattern to the **Determine and Dispatch** logic.
2.  Specify the required skill name.
3.  The orchestrator will automatically handle the presence check and dispatching.

## Remediation

Follow the remediation steps defined within each specialized skill. You are only "Done" when all invoked and available specialized audits report "NO violations".

## Workflow Integration Policy

If the file `conductor/workflow.md` does not mention the `compliance-audit-orchestrator` skill where it should, propose the change to the user instead of editing the workflow automatically.

If specialized audit routing or workflow text should change, handle that in the skill repository as a separate approved task.
