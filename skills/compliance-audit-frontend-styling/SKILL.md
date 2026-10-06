---
name: compliance-audit-frontend-styling
description: A specialized compliance audit for cross-framework frontend styling systems. Use when reviewing modified frontend UI styling, theme files, component stylesheets, design tokens, or related `.css`, `.scss`, `.sass`, `.less`, and frontend component files across Angular, React, Vue, Svelte, Next.js, Nuxt, Vite, or other web UI stacks to enforce reusable styling primitives, token discipline, selector maintainability, accessibility-aware states, and responsive consistency.
---

# Conductor Compliance Audit (Frontend Styling)

When you invoke this skill, you must perform a strict, holistic audit of the frontend styling and UI-structure code that was just changed.

## Repository Boundary

This skill is read-only with respect to skill infrastructure and workflow definitions.

- Do not edit the skills themselves as part of this audit — the installed copy in `.claude/skills/`, or `skills/`,
  `published/` and the installer/publisher tooling in the skills repository — nor `conductor/workflow.md`: a skill
  that rewrites its own checklist stops being a check.
- If the audit reveals a missing styling rule, a gap in the orchestrator, or a skill-design problem, report it to the user as a proposal.
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
Please review the recently modified frontend styling files in this project and verify strict compliance with the following Engineering Principles:

1. **Reusable Styling Primitives:** Treat repeated component-local CSS or SCSS as a violation when the same visual pattern appears more than once. Prefer shared primitives such as reusable components, utility layers, token-driven variants, mixins, or shared theme classes instead of re-authoring the same widget styling in multiple places.
2. **Design Tokens:** Prefer named tokens or centralized variables for colors, spacing, typography, radius, shadows, z-index, motion, and breakpoints when those values are part of the product's visual language. Treat repeated hardcoded values as a violation unless they are truly one-off.
3. **Themeable Colors:** Treat hardcoded product colors in component styles, shared stylesheets, templates, or inline style bindings as a violation unless they come from reusable theme tokens or an explicitly documented theme layer. Prefer semantic color tokens such as `--color-primary`, `--color-surface`, or equivalent abstractions over raw hex, rgb, or hsl values. Allow narrow exceptions such as `transparent`, `currentColor`, or `inherit` when they do not bypass the theme model.
4. **Selector Discipline:** Avoid fragile selectors, deep descendant chains, over-specific overrides, `!important` abuse, and styling that depends on incidental DOM structure rather than a stable component contract.
5. **Scope & Ownership:** Use component-local styles for local differences, not to recreate the same base primitive across many components. Shared styling concerns should live in a shared stylesheet, theme layer, token file, design-system primitive, or equivalent reusable boundary.
6. **Responsive Consistency:** Keep responsive behavior coherent across the UI. Prefer shared breakpoint logic and layout primitives over duplicated desktop/mobile style forks when the same intent can be expressed through reusable responsive utilities or tokens.
7. **Accessibility-Aware States:** Verify visible focus states, adequate contrast, non-hover-only affordances, and motion choices that remain usable and accessible. Styling changes should not quietly remove keyboard-visible or contrast-safe states.
8. **Theme Consistency:** Preserve the project's theming model. Avoid ad hoc color systems, local shadow systems, or one-off type scales when the project already has a shared visual language.
9. **Dead Style Cleanup:** Flag stale selectors, duplicated declarations, dead variants, and copy-pasted style blocks that should be consolidated or removed.
10. **String Literal Centralization:** Treat repeated or semantically meaningful hardcoded string literals related to theme names, token keys, utility identifiers, class-name contracts, or styling state names as a maintainability violation when they should instead come from shared constants, token definitions, or another central styling contract. Leave strings inline only when they are truly local and non-reusable.
11. **Framework-Agnostic Practicality:** Adapt to the stack in front of you. Angular, React, Vue, Svelte, or plain web apps may use different styling mechanisms, but the same reuse, token, and maintainability principles still apply.
12. **Documentation & Clarity:** Shared style APIs, utility conventions, token layers, and theme extension points should be named clearly and documented where the codebase expects it.

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
