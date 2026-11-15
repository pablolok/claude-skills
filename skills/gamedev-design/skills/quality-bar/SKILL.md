---
name: quality-bar
description: Set and review a high production quality bar for player-visible or audible game work across light, materials, motion, sound, and staging. Use when planning polish, comparing a build to its concept, auditing presentation, or deciding whether an asset, effect, scene, or screen is finished.
---

# Quality bar

Treat AAA as a standard of intentional, consistent finish within the chosen style and budget.
Measure the piece against its approved concept and player-facing purpose. Do not assume realism,
a particular palette, expensive rendering, constant motion, or maximal effects define quality.

Read [channel checks](references/channel-checks.md) for the domains the piece touches.
Read [comparison protocol](references/comparison-protocol.md) before capture, measurement, or final review.

## Define the target

Record the piece, viewing conditions, intended emotion/readability, approved concept or references,
delivery platform, performance budget, and relevant settings.
Name its obligations across **light, matter, motion, sound, and staging**.
Plan missing channels explicitly; intentional stillness and silence need a purpose, not filler.

If no comparison target exists, prepare a concise style/behavior target and identify assumptions.
Use existing accepted references rather than expanding the art direction without reason.
Write observable acceptance conditions before tuning, including required gameplay information.

## Review the complete piece

1. Check structure first: silhouette, proportions, placement, timing, and causal readability.
2. Capture representative final presentation in the actual camera, lighting, materials, and UI.
3. Compare stills side by side and with equal-scale crops. List differences in shape, joins, edges,
   surface response, colour/value, typography if relevant, and composition.
4. Measure useful image properties only after matching viewpoint, crop, exposure, and colour space.
   Numbers support the visual review; equal averages do not prove equal images.
5. Review moving elements at real speed with sound, then inspect dense frames around faults.
6. Listen in context for source identity, synchronization, spatial meaning, priority, and fatigue.
7. Check player-build behavior, input/settings, accessibility, and performance where the piece depends on them.
8. Rank mismatches by player impact, fix the largest cause, and recapture affected evidence.

Check this: an asset that passes a clay or isolated preview may fail when lit with final textures.
Review its full material response and interacting bodies in the delivered scene before approving it.

## Use measurements honestly

Choose tolerances from the intended style and display; report measured values and their limitations.
Mean luminance, upper-percentile luminance, dark-pixel share, subject/background separation, event timing,
and frame cost can reveal drift. A single global luminance threshold cannot certify composition or quality.

For tactile action games, roughly 50 ms input acknowledgment and several synchronized impact channels
can be useful starting checks. Tune them to the action; deliberate commitment is not unexplained lag.
Do not require shake, flashing, hitstop, or depth of field where they harm clarity or accessibility.

## Completion evidence

Deliver target/reference, matched stills, equal-scale crops, a real-time audiovisual clip when applicable,
measurement context, a channel checklist, and remaining deviations.
Mark each item `pass`, `revise`, `not applicable`, or `unverified`, with evidence and reason.
A missing required channel or untested required setting prevents an unconditional completion claim.
Accepted deviations need a rationale and owner; unresolved work needs a destination and acceptance check.

When a designated art or design reviewer is part of the workflow, provide a concrete review packet
and record their decision. Do not substitute a score for that decision or invent approval.

Unity note: inspect the selected render pipeline, material response, camera/post stack, and player build.
Unreal note: inspect the selected rendering path, material/post stack, scalability, and packaged build.
Use the existing toolchain; feature availability alone does not demonstrate the target look.

## Open

- Add calibrated comparison examples for stylized, pixel, and physically based art.
- Add platform-specific evidence for motion, sound, and performance budgets.
