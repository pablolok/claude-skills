---
name: compliance-audit-angular
description: A specialized compliance audit for Angular applications and Angular TypeScript UI code. Use when reviewing modified Angular components, templates, styles, services, routing, or related `.ts`, `.html`, `.scss`, and `.css` files in an Angular project to enforce Angular best practices, accessibility, maintainability, and frontend test coverage gates.
---

# Conductor Compliance Audit (Angular)

When you invoke this skill, you must perform a strict, holistic audit of the Angular code that was just changed.

## Repository Boundary

This skill is read-only with respect to skill infrastructure and workflow definitions.

- Do not edit the skills themselves as part of this audit — the installed copy in `.claude/skills/`, or `skills/`,
  `published/` and the installer/publisher tooling in the skills repository — nor `conductor/workflow.md`: a skill
  that rewrites its own checklist stops being a check.
- If the audit reveals a missing Angular rule, a gap in the orchestrator, or a skill-design problem, report it to the user as a proposal.
- Let the user decide whether that follow-up should be handled in the skill repository as a separate task.

## Subagent Delegation

You MUST resolve delegation through the balancer layer before delegating review work.

Use this order:

1. If `subagent-balancer-orchestrator` is available, use it first.
2. If the orchestrator is unavailable but the correct direct balancer is already explicit from task context, you may use that balancer directly.
3. If no balancer layer is available, prefer a local audit instead of re-implementing balancing policy here.
4. Only if the audit is still too broad or risky to keep local should you delegate directly, using one bounded generalist review subagent and avoiding chained review agents.

If you choose delegation, provide the sub-agent with the following prompt:

```text
Please review the recently modified Angular files in this project and verify strict compliance with the following Engineering Principles:

1. **Angular Best Practices:**
   - Prefer standalone components, directives, and pipes when the codebase already uses them.
   - Keep components focused on presentation and orchestration; push business logic and HTTP access into services.
   - Avoid bloated lifecycle hooks and duplicated view-model logic.
   - Flag repeated UI patterns across templates and stylesheets that indicate a missing reusable component, directive, or pipe.
2. **TypeScript Rigor:** Use strict typing, avoid `any` unless justified, and keep component/service contracts explicit.
3. **Template Discipline:** Avoid overly complex template expressions, duplicated conditional rendering, repeated markup/CSS structures such as custom dropdowns or menus, and view logic that should live in the component or a reusable abstraction.
4. **Accessibility:** Verify semantic HTML, form labeling, keyboard accessibility, focus handling, and appropriate ARIA usage where native semantics are insufficient.
5. **State & Side Effects:** Keep state transitions explicit, manage subscriptions/effects correctly, and avoid shared mutable state or memory leaks.
6. **Testing & Coverage:** Ensure adequate automated tests exist for new UI logic, user-facing state changes, and Angular-specific behavior. Frontend changes must preserve or improve the project's coverage gates.
7. **Performance:** Flag unnecessary change-detection churn, repeated expensive computations in templates, avoidable rerenders, or obviously oversized client-side work.
8. **Forms & Validation:** Ensure form state, validation, and error messaging are deterministic, user-visible, and not duplicated between template and class unnecessarily.
9. **Styling Discipline:** Prefer project conventions, avoid global leakage, and keep component styling scoped and maintainable. Repeated styling for the same widget across multiple components is a signal to extract a generic reusable UI primitive.
10. **Routing & API Boundaries:** Keep routing logic clean and keep HTTP or persistence concerns out of components when a service boundary exists or is clearly warranted.
11. **Documentation & Clarity:** Public reusable UI APIs should be named clearly and documented where the codebase expects it.
12. **Static Analysis:** Code should be compatible with the project's configured linting, Angular template checks, and framework diagnostics.
13. **Domain Modeling Clarity:** Prefer enums or other strongly typed named abstractions over raw numeric codes when representing finite UI states, categories, statuses, modes, or workflow steps. Treat unexplained magic numbers in those scenarios as a readability and maintainability violation unless an external API contract requires the numeric value at the boundary.
14. **String Literal Centralization:** Treat repeated or semantically meaningful hardcoded string literals in components, services, templates, or UI state logic as a maintainability violation when they should instead come from a shared constant, typed abstraction, localization/resource layer, or configuration boundary. Leave strings inline only when they are truly local, one-off, or fixed by an external contract at that exact boundary.
15. **Reusability Audit:** Look for the same widget being implemented more than once in different Angular components, templates, or styles. When similar structure, behavior, and styling appear multiple times, treat that as a violation unless there is a clear domain reason to keep them separate. Prefer a generic reusable component API built with inputs, outputs, content projection, configuration objects, or directives so patterns like dropdowns, pickers, and repeated cards are implemented once and adapted for multiple use cases.

If you find ANY violations, you MUST return a detailed bulleted list of the violations found.
For each violation, you must specify:
* **[File Path:Line Number]**
  * **Violation:** <Description of which principle was violated and why>
  * **Suggested Fix:** <General text description of how to fix the violation>

Otherwise, state "NO violations".
```

## Remediation

1. If the audit reports **NO violations**, you may proceed with the "User Manual Verification" step.
2. If the audit reports **ANY violations**, you MUST fix the code yourself to adhere to the principles before asking the user for verification. You must loop this audit until it reports "NO violations".
