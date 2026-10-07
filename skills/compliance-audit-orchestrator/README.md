# Compliance Audit Orchestrator Skill

A central dispatcher for **Claude Code** that runs a generic verification-gate audit first, then determines and executes the correct specialized compliance audit based on the files modified during a development phase.

## Overview

This skill is designed to solve the problem of selecting between multiple specialized compliance audits while also blocking premature manual verification. It acts as a smart orchestrator that inspects your changes, invokes the generic verification-gate audit, and then delegates to the appropriate specialized skill.

## How it Works

1.  **File Inspection:** The orchestrator identifies which files were modified in the current phase.
2.  **Skill Presence Verification:** Before triggering any audit, the orchestrator MUST verify that the required skill is "installed" and available for use in the current environment (e.g., in the project's local `skills/` directory or the user's global `.claude/skills/` directory).
3.  **Smart Delegation:**
    *   **Verification Gates:** Triggers `compliance-audit-verification-gates` first for code changes so required tests, builds, and static checks are green and warning-free before manual verification.
    *   **C# Files:** Triggers the `compliance-audit-csharp` skill if it's available.
    *   **Script Files:** Triggers the `compliance-audit-scripts` skill if it's available.
    *   **Angular Files:** Triggers the `compliance-audit-angular` skill when Angular indicators are present and Angular UI files were changed.
    *   **Avalonia UI Files:** Triggers the `compliance-audit-avalonia` skill when Avalonia markers are present and Avalonia UI files were changed.
    *   **Frontend Styling Files:** Triggers the `compliance-audit-frontend-styling` skill when frontend indicators are present and styling files or co-located UI styling concerns were changed.
4.  **Sequential Execution:** If you modify multiple supported file groups, it runs all available audits in sequence with verification gates first.
5.  **Graceful Error Handling:** If a specialized audit is required based on your file changes but the skill is NOT found, the orchestrator will inform you and ask for guidance.

## Future Extensibility

To add support for a new specialized audit (e.g., `compliance-audit-react`), simply:
1.  Add a new file pattern to the **Determine and Dispatch** logic.
2.  The orchestrator will automatically handle the presence check and dispatching.

### Mandatory Setup
This is the **only** skill you should manually add to your `conductor/workflow.md`. It is designed to be the single entry point for all compliance audits.

### Usage
To trigger the automated orchestration, simply instruct Claude Code:
> "Use the compliance-audit-orchestrator skill."

## Benefits

*   **No Conflicts:** Prevents Claude from being confused by multiple audit skills.
*   **Automatic Selection:** You don't have to remember which audit to run.
*   **Workflow Integration:** Serves as the single entry point for compliance audits in the Conductor workflow.
