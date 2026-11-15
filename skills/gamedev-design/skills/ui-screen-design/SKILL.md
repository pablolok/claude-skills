---
name: ui-screen-design
description: Design or redesign a game screen, overlay, panel, or HUD element from purpose and content through visual references and a selected concept before code. Compare the built screen side by side with its concept using a scored rubric, then verify interaction, motion, sound, legibility, and accessibility.
---

# UI screen design

Design the screen's purpose and visual intent before implementing it.
Use [concept workflow](references/concept-workflow.md) for the brief, references, alternatives, and build plan.
Use [critique rubric](references/critique-rubric.md) for comparison and completion.

## Purpose before pixels

Write the moment, the player's current state, the desired next feeling/action, and the screen's job.
For a death screen, consider closure, explanation of the outcome, and a clear next attempt or exit.
Do not assume every screen serves retention, displays statistics, or needs a full-screen illustration.

Inventory and rank the actual content. Choose one initial focal point and the primary next action.
Identify dynamic content, input devices, target viewports, localization, text scaling, and accessibility needs.
Remove information with no player-facing purpose, including implementation notes and redundant instructions.

## Choose a concept before code

Study relevant visual references and the host game's approved style. Extract principles such as hierarchy,
spacing, restraint, material, and timing rather than reproducing another screen's identity.

Prepare two or three genuinely distinct directions when the direction is undecided: for example,
a restrained title-led composition, a results-focused composition, and an in-world presentation.
Use actual content and target proportions in mockups. Draw, compose, or generate images with available tools;
do not make the method depend on a particular image service.

Present the concepts with tradeoffs and a recommendation. **Obtain a selection before implementation.**
An already selected concept or explicit delegated choice satisfies this step; do not request the same decision again.
If selection is pending, finish the reviewable concepts and implementation plan, then keep code work pending.

## Build the selected intent

Record layout, scale rules, typography, grouping, material/shape language, motion order, and interaction states.
Separate static art from live data and variable-form subjects. A changing character or equipment set may
need a live render or modular presentation rather than a unique painted image for every state.

Preserve the concept's perceived silhouette, joins, and material. Check this: several individually correct
rectangles may fail to read as the single flowing frame shown in a concept.
Use one asset or multiple layers as appropriate; the visible object and behavior are what must match.
Source screen data from the game's data model rather than scraping incidental scene state.

Implement focus, hover, pressed, disabled, loading, and error states where relevant.
Plan entry/exit order and sound together. Choose a clock policy that works while gameplay is paused.
Respect input bindings, focus navigation, settings, localization, and reduced-motion behavior.

## Critique side by side

Compare final game captures with the selected concept at full-screen and equal element scale.
Score 10 dimensions from 0 to 2 using the reference: focal point, hierarchy, spacing, legibility,
ornament, visual identity, emotion, content, concept fidelity, and next action.
Require **at least 16/20 and no zero**, plus working interaction/accessibility checks.
Report the two weakest dimensions, concrete fixes, and every remaining discrepancy.
Do not let matching dimensions and colours conceal a wrong shape or surface treatment.

Check this: a custom capture can disagree with the real game-view UI composition.
Verify through a direct player-facing capture before correcting an apparent transparency or missing-layer defect.
Review motion and sound as well as stills; a static mockup cannot prove navigation or transition behavior.

## Completion

Deliver the brief, chosen concept, selection record, build captures, score/evidence table, interaction results,
and discrepancy decisions. Fix blocking differences; explicitly accept or track nonblocking deviations.
An unresolved concept mismatch is not silently converted to a pass by a high total.

Unity note: use UI Toolkit or the existing UI stack and verify focus, scaling, filtering, and paused animation.
Unreal note: use UMG or the existing UI stack and verify navigation, DPI scaling, material filtering, and pause behavior.
Keep layout and interaction intent independent of either framework.

## Open

- Add neutral concept/build comparisons across wide, narrow, and large-text layouts.
- Add examples of dynamic character presentation and reduced-motion transitions.
