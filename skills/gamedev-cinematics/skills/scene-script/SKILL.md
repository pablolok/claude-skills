---
name: scene-script
description: Write, review, time, and lock a game scene script before building or rebuilding its cinematic staging. Use for a cutscene, boss entrance, reveal, or other authored scene that needs beats, screenplay, overhead geography, shot cards, timed dialogue, and a scored review.
---

# Scene script

Produce a buildable script before spending effort on in-engine direction. Keep the method engine-agnostic;
use the project's existing writing and review tools when available.

## Prepare

Read [the template](references/template.md) when starting a script and
[cinematography A-L](references/cinematography.md) before choosing beats and shots.
Use [review and timing](references/review-and-timing.md) for every review and lock.

Identify the story constraints, the playable space, the player's last action, and the next playable goal.
If the moment can deliver its purpose through player action, propose staging it during play.
For an existing scene, inventory its actual cues, lines, and captures before writing the intended revision;
an old script is not evidence of what currently runs.

## Write in this order

1. Frame the scene's story job, audience knowledge, setup/payoff, and need for authored control.
2. Fill the header: incoming/outgoing player state, want, obstacle, stakes, value change, turning action,
   five anchors, environmental pressure, geography, action axis, and total duration.
3. Write causal action/reaction beats. Pick an arc and remove beats that repeat the same change.
4. Write a present-tense screenplay of visible actions and audible events. Remove dialogue temporarily
   and check that the essential action and turn remain understandable.
5. Draw an overhead with the spatial anchor, actors, threat, exit, axis, camera positions, look directions,
   and movement paths. Resolve impossible geography here.
6. Make one card per shot: a single primary job, size, lens/filmback or equivalent framing, focus subject,
   axis side, motivated movement, concrete action, eye-trace, light, sound, and incoming transition.
7. Cover the turning action explicitly. For a physical rupture, check strain, the thing giving way,
   and the consequence; an insert is useful only if it makes that change readable.
8. Define key poses and close-up prop requirements before requesting rig or animation changes.
9. Put every line on the scene clock with its speaker, channel, key, start/end, and owning shot.
10. Draw an intensity curve with a clear principal peak and space for anticipation and aftermath.
11. Validate the timing sheet, table-read the scene, score it, log findings, and revise at the level of the fault.

Write actions a builder can stage: "backs away, lowers the shoulders, then turns toward the exit"
instead of "looks afraid." Adapt acting to the body's available features.
For an emotional or narrative rule that is not established in the story bible, mark it as a proposal.

## Review and lock

Score 12 dimensions from 0 to 2 using the reference rubric: turn, economy, geography, coverage,
composition, rhythm, lighting, acting, sound, dialogue, gameplay transition, and story coherence.
Require **at least 20/24, no zero, and passing structural/timing checks** for a review candidate.
A score does not override an unresolved contradiction or an unreadable essential action.
Read it adversarially: imagine a director who has never seen the scene reading only the cards. Would they know
what to shoot, from where, and why? A card they could not shoot fails coverage or geography, whatever its total;
the writer's memory fills gaps a builder will not. "Good", "clear" and "cinematic" are not scores.

Use `draft -> review -> locked`. Present the script, timing sheet, rubric, and remaining build tasks
to the designated reviewer. Lock only the revision they accept; existing explicit acceptance counts.
Do not imply that an unreviewed script is locked.

Track notes with an ID, target, evidence, decision, rationale, revision, and verification.
`open` and `accepted` mean unresolved work. `fixed` needs proof; `rejected` needs a reason.
`deferred` needs a destination and acceptance condition. Defer implementation-only work to the build,
but resolve story, timing, and staging blockers before locking.

Keep shot IDs traceable across cards, cues, and captures. If order-based IDs change, update all
cross-references together. A change to the locked intent requires a new revision and review.

## Handoff

Deliver the locked revision, overhead, shot cards, timing sheet, pose/prop requirements, rubric,
and outstanding implementation tasks. The cutscene-direction skill can consume this packet if installed;
the packet also works independently.

Unity note: plan authored timing for Timeline and camera ownership for Cinemachine.
Unreal note: plan authored timing for Sequencer and lens/focus for a Cine Camera.
Neither engine's timeline replaces the written beat, transition, or skip contract.

## Open

- Add neutral examples of playable staging and authored scenes using the same beat.
- Calibrate dialogue timing for more languages and accessibility settings.
