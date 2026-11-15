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
**No target, no review**: a one-sentence intended experience ("tense but fair: every failure is my fault and I
see it coming"), the player profile, and for a playtest a testable hypothesis. When none is given, ask whoever owns
the design rather than drafting one: a target the reviewer writes and then finds met proves nothing. With no one to
ask, draft a bounded working target from the brief, mark it as an assumption, and call the review provisional.
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

**Difficulty is measured against the best player, not the intended route**: a challenge that is hard along its
intended path may have an easy bypass, and then its difficulty was never measured. Before judging it, run five tests
(the numbers are starting targets; set them from the design):
1. **Forced**: close each gate the design means as mandatory, in turn, and search for a way round. There is none.
2. **No dash**: a straight run through at full speed, never stopping, started at any moment, fails (near 0 %).
3. **Must read every threat**: crossing each gate at a random moment succeeds at most about half the time per gate,
   a few percent end to end (measured end to end: patrol phases couple the gates).
4. **Never no-win**: every gate opens a window of at least about a second each cycle (a reaction plus the move).
5. **No fixed perfect line**: search the best path in space and time with the threats started at random points of
   their patterns. Started alike every run, one memorised line can thread every window; keep that only when
   mastering a line is the design's goal.

An action challenge (a chase, a hail of projectiles) is played with bots: one holding forward, one holding forward
and sprint, an average player (late reactions, never dodges) and a sharp one. The holders must fail and the average
player mostly survive. The search methods: [stealth and AI](references/stealth-and-ai.md), unwanted bypasses.
**A challenge with no measured bypass test is not reviewed for difficulty.** Distinguish an unwanted exploit from a
legitimate shortcut or mastery strategy; do not force one route where the design allows several.

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
