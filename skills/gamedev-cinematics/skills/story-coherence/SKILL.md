---
name: story-coherence
description: Define a story bible and check game narrative content against it for canon, character knowledge, causality, continuity, voice, setup/payoff, theme, and terminology. Use when writing or revising dialogue, scenes, environmental storytelling, narrative UI, or story-bearing design documents.
---

# Story coherence

Maintain an explicit narrative source of truth and trace what the player can actually learn.
This method supports linear, branching, systemic, voiced, and mostly wordless stories.
Do not invent fixed personalities, world rules, themes, or language conventions for a host game.

Read [bible structure and coherence checks](references/bible-and-checks.md) to establish the bible
or review content. Use only relevant sections for a narrow line edit.

## Establish authority

Locate the existing bible and identify who can accept changes to canon.
If no bible exists, assemble known facts and open questions into a minimal draft.
Separate accepted facts, proposed facts, intentional unknowns, and obsolete statements.
Record evidence or an accepted decision for each governing fact; do not promote an inference to canon.

Before drafting, read the applicable world rules, beat/branch timeline, knowledge states, voice guides,
setup/payoff ledger, theme, and glossary. Check the neighboring beats and relevant alternate branches.

## Write and check

1. Frame the touched beats, entities, channels, branch conditions, and governing facts.
2. Write against those constraints; label any new fact or changed implication as a proposal.
3. Apply C1-C10 from the reference: canon, knowledge, cause, continuity, conventions, viewpoint voice,
   other voices, setup/payoff, theme/mechanics, and language/terminology.
4. Check what the audience learns separately from what each speaker knows.
5. Review neighboring content for duplicate questions, premature answers, repeated wording, and missing transitions.
6. For a broad revision, inventory story-bearing text and events in content data and runtime output.
   Search more than code literals: localization, dialogue assets, subtitles, UI, props, and documents may differ.
7. Report each inconsistency with its fact/beat reference, consequence, proposed correction, and confidence.

Distinguish an established contradiction from an unsupported fact that needs a decision.
When evidence is incomplete, say "check this" and name the comparison that would settle it.
Mystery, unreliable narration, and deliberate contradiction can be valid if their audience effect and
later treatment are recorded; do not silently flatten them into a single interpretation.

## Change the story coherently

For a canon change, show the proposed fact and affected content before treating it as accepted.
Respect existing authority and approval already given; ordinary corrections within accepted canon can proceed.
Record the decision using a revision identifier, rationale, and review role.
Update the bible and affected content together, or explicitly track every pending propagation task.
Search both old and replacement terminology, then exercise the affected branches in context.

When defining a new story, settle foundations before dependent beats: world rules, viewpoint,
desire, conflict, theme, then the ordered events and possible outcomes.
Present consequential options with their narrative implications rather than assuming one is canon.

## Completion

Deliver a coherence matrix, corrected content or proposed changes, bible updates, and unresolved decisions.
Require no undisclosed contradiction in the reviewed scope and no player-facing change described as complete
while its dependent content still states a conflicting fact.
State which branches, channels, and runtime states were not checked.

Unity note: include localization tables, dialogue assets, and Timeline events in the inventory.
Unreal note: include localization/string tables, dialogue assets, and Sequencer events.
The authority remains the story model rather than an engine-specific asset type.

## Open

- Add a neutral branching-story example with separate audience and character knowledge.
- Add a compact method for unreliable narration and intentional contradictions.
