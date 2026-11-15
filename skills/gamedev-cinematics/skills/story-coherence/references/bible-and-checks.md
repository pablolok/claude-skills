# Story bible and coherence review

## Minimal bible

Use the host project's storage conventions. Start with the smallest structure that makes decisions traceable.

| Section | Store |
|---|---|
| Governing decisions | Stable fact ID, accepted statement, scope, revision, rationale, authority role |
| World constraints | What can happen, limitations, costs, and explicit unknowns |
| Viewpoint and arc | Immediate desires, long-term changes, perspective, intended audience experience |
| Beat/branch map | Event IDs, prerequisites, causes, consequences, entry/exit states, branch conditions |
| Knowledge ledger | Fact, who learns it, how, earliest beat, conditions, audience knowledge |
| Voice guides | Vocabulary, sentence habits, register, imagery, boundaries, variation rules |
| Setup/payoff ledger | Setup, reinforced appearances, payoff or intentional unresolved state |
| Theme and mechanics | Intended tension and how play supports or deliberately challenges it |
| Glossary and language | Preferred terms, prohibited variants, speaker labels, punctuation, localization intent |
| Content map | Where each fact appears: scene, dialogue, UI, world detail, text data, design document |

Distinguish an in-world timeline from presentation order. A flashback or remembered event needs both.
For a narrow task, a few fact rows and a knowledge table may be sufficient.

## C1-C10

| ID | Check | Ask | Failure evidence |
|---|---|---|---|
| C1 | Canon | Is this fact established, proposed, deliberately uncertain, or contradicted? | Content conflicts with an accepted rule or asserts an undecided fact as certain |
| C2 | Knowledge | Could this speaker know it on this branch at this moment? | A line uses information before its acquisition, or ignores a known event without reason |
| C3 | Causality | What in-world event makes this happen now? | A reversal has no established cause, motivation, or discoverable mechanism |
| C4 | Continuity | Can bodies, objects, injuries, time, and place reach this state? | Impossible travel, duplicate presence, disappearing prop, or incompatible branch state |
| C5 | Conventions | Which mechanics are fiction, abstraction, or interface assistance? | A line accidentally canonizes a reset, marker, or tutorial behavior that the bible treats as nonliteral |
| C6 | Viewpoint voice | Does the viewpoint's language fit its senses, knowledge, and voice guide? | Exposition, vocabulary, or emotional articulation exceeds its defined capabilities |
| C7 | Other voices | Does each speaker sound and behave according to their role and knowledge? | Interchangeable lines, unearned familiarity, or the wrong register for the relationship |
| C8 | Setup/payoff | What prepares this revelation, and what will resolve this hint? | An unprepared resolution or an abandoned hint with no intentional status |
| C9 | Theme/play | What does this event or mechanic imply about the story's central tension? | Play repeatedly rewards the opposite claim without an intentional narrative treatment |
| C10 | Language | Do terminology, speaker labels, grammar, and localized meaning agree? | Inconsistent terms, mixed target language, altered implication, or lost voice |

Do not impose a universal word count on a voice. Define constraints appropriate to the speaker and language.
Do not automatically remove tutorial-like dialogue; check whether instruction is plausible within the fiction.

## Knowledge table

| Fact ID | Audience learns | Viewpoint learns | Other role learns | Condition | Permitted implication |
|---|---|---|---|---|---|
| F1 | B1 | B3 | B2 | [branch or observation] | [what can be inferred, not merely recited] |

Distinguish hearing a statement, understanding it, believing it, and knowing it is true.
For replays and optional discovery, define whether the speaker's knowledge persists and whether the
audience may know more than the current viewpoint.

Check this: cast presence can drift between a beat sheet and actual dialogue bindings.
Compare each speaker's scene presence with the runtime speaker assignment before altering the story.

## Setup/payoff table

| ID | Setup | Reinforcement | Payoff | Availability | Status |
|---|---|---|---|---|---|
| P1 | [observable clue] | [optional recurrence] | [event or inference] | [mandatory/optional/branch] | [planned/resolved/intentionally open] |

If a mandatory revelation depends on an optional clue, add redundant preparation or record the intended
uncertainty. Do not call an undocumented omission a deliberate mystery.

## Review procedure

1. Extract claims and implications from the new content, including visual and mechanical claims.
2. Map them to fact IDs and state prerequisites.
3. Apply C1-C10 to the content, predecessor, successor, and affected alternatives.
4. Compare the intended text with localized data and actual displayed/spoken output.
5. Resolve direct corrections; propose canon changes to the proper authority.
6. Propagate accepted changes through the content map and recheck affected play states.

## Review record

```text
Scope: [beats/branches/channels and revision]
Fact/beat: [ID]
Content: [line, event, image, or mechanical implication]
Check: [C1-C10]
Evidence: [source of truth and conflicting output]
Classification: [contradiction / unsupported proposal / intentional uncertainty / needs check]
Consequence: [what the audience or speaker now wrongly believes]
Correction: [specific text, event, or fact proposal]
Propagation: [affected content and remaining tasks]
Verification: [comparison or runtime branch checked]
```

End with unresolved decisions and blind spots. A documentation comparison alone cannot establish
that a player receives a clue; verify the channel where it is actually delivered.
