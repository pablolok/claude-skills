---
name: game-design-review
description: Review a playable game mechanic, encounter, level, or sequence from evidence. Use for feel, responsiveness, player understanding, onboarding, stealth and AI readability, pacing, difficulty, or playtest planning. Produce scored findings ranked by player impact, with a concrete fix and verification for each.
---

# Game design review

Answer what the player experiences, why it fails or works, and which change would help most.
Review and propose tuning; implement changes only when that work is in scope.
Use evidence from play, captures, measurements, and observed testers. Code inspection supports hypotheses
but cannot establish a player's feelings or prove the delivered experience.

## Choose the lenses

| Lens | Use when | Read |
|---|---|---|
| Feel | An action responds, connects, or recovers poorly | [feel pass](references/feel-pass.md) |
| Walkthrough | A sequence needs a first-time or repeat-player perspective | [player experience](references/player-experience.md) |
| UX/onboarding | State, goal, controls, or learning are unclear | [UX and onboarding](references/ux-onboarding.md) |
| Stealth/AI | Threat knowledge, detection, pursuit, or fairness is unclear | [stealth and AI](references/stealth-and-ai.md) |
| Level/encounter | Space, pacing, navigation, or challenge flow is weak | [level and encounter](references/level-and-encounter.md) |
| Playtest | A design hypothesis needs observation or validation | [playtest](references/playtest.md) |

Use only the needed lenses. For a whole slice, start with walkthrough/playability and deepen the weakest area.

## Frame and gather evidence

State the intended experience, scope/build, player profile, starting knowledge, input device, and test conditions.
If intent is unspecified, draft a bounded working target from the brief and mark the assumption.
Separate observed behavior, measured timing, tester report, simulated perspective, and code-only inference.
Never present a role-played persona as an actual playtester.

Play through the real flow and record a time-indexed journey. Read relevant values and measure what they
mean in practice: input latency, reaction windows, travel distance, recovery time, detection, and camera coverage.
Record frame rate and clock; convert frames to milliseconds rather than treating frame counts as universal.
With no playable access, deliver a provisional document/code review and list the checks still needed.

## Review loop

1. Walk the sequence as the chosen profile without using undisclosed designer knowledge.
2. Apply the selected checks to specific moments, including audio, camera, and accessibility.
3. Score the relevant rubrics: feel /14, playability /12, onboarding /10, or test-plan quality /10.
4. Rank findings by severity, observed frequency, confidence, and player impact.
5. Give each finding one concrete first change and a measurable verification condition.
6. Recheck the same conditions after changes; show dimension-level deltas and regressions.

Use timings as calibrated targets, not laws. For action-heavy play, an input acknowledgment around 50 ms,
several synchronized impact channels, and quick retry can be useful probes. Genre, hardware, accessibility,
and intended commitment can require different targets.

Check this: a challenge that appears difficult along its intended path may have an easy bypass.
Try direct movement, alternate routes, timing variations, resource extremes, and adversarial play.
Distinguish an unwanted exploit from a legitimate shortcut or mastery strategy; do not force one route by default.

## Report

Use `critical` for blocked progress, softlocks, or severe unfairness; `high` for repeated core misreads or
major frustration; `medium` for recoverable confusion, missing feedback, or pacing gaps; `low` for minor finish.
Do not assign a quit outcome to a hypothetical player as though it were observed.

For each finding include: symptom, location/time, evidence source, measurement, player consequence,
confidence, one proposed change, and recheck. Show frequency as n/N when testers exist.
Describe what works through its mechanism and evidence, rather than praise words.
End with blind spots and the single change most likely to improve the verdict.

Unity note: use Play mode or a player build plus existing capture/debug tools.
Unreal note: use play-in-editor or a packaged build plus existing capture/debug tools.
Engine debug overlays explain causes; inspect the ordinary player view separately for readability.

## Open

- Calibrate timing and scoring examples for non-action and multiplayer games.
- Add neutral tests distinguishing mastery shortcuts from unintended challenge bypasses.
