# Stealth and AI readability

## Model the actual rule

Inventory perception sources, occlusion, detection accumulation/decay, suspicion, alert, search,
pursuit, return, sharing of knowledge, and reset behavior. Record ranges, angles, speeds, timings,
and exceptions from the running system. Do not assume sight cones, binary cover, or fixed patrols are required.

For each important transition, identify what information the player receives and when they can act on it.
The player needs an understandable model of relevant danger, not necessarily a display of every internal AI variable.

| Question | Evidence |
|---|---|
| What can detect me? | Visible behavior or established cue for sight, sound, proximity, or another sense |
| Am I concealed? | Readable player/environment state and clear boundaries or gradual rules |
| Is suspicion rising? | Perceptible intermediate state before a consequential transition, where intended |
| What did the enemy learn? | Search/turn/pursuit behavior consistent with the witnessed event |
| Why was I caught? | Reconstructable cause rather than unexplained omniscience |
| What can I do next? | Available escape, concealment, counterplay, or comprehensible failure/retry |

Communicate relevant off-screen danger before its consequence, unless a deliberate surprise is part of the target.
Check cues at the real camera distance and against difficult ground/backgrounds.

## Measure fairness

- Detection window = time from the earliest usable warning to the consequential threshold.
- Travel allowance = actual movement possible during that window, including turn, acceleration, and resource limits.
- Crossing requirement = time to leave exposure or reach a safe state plus the player's response allowance.
- A timing opportunity must accommodate that requirement, not merely exist for one simulation tick.
- For patrol cycles, measure longest necessary wait and whether observing a cycle explains the opportunity.
- Check overlapping threats, alert sharing, close-range exceptions, and recovery from partial detection.
- If randomized starts are intended, retain learnable behavior and reject unsolvable configurations.

Do not multiply per-gate success rates as though events were independent when patrol phases or shared awareness couple them.
Measure end-to-end outcomes as well as local windows.

## Test unwanted bypasses and impossible states

1. Establish the allowed solution space: intended alternatives, clever shortcuts, and actual exploits.
2. Search routes around authored obstacles; a nominal gate matters only if its challenge is truly required.
3. Try continuous movement, sprint, resource-rich/poor states, unusual entry times, and boundary hugging.
4. Sample patrol phases or seeds and compare successful strategies across space and time.
5. Check that required routes have sufficient opportunities and recovery; flag any unavoidable detection state.
6. Test whether one memorized line removes intended observation. Preserve it if mastery is the goal;
   vary phases only if the design requires fresh reading and remains fair.
7. Reproduce promising solver paths through actual collision, perception, movement, and camera conditions.

Check this: fresh geometry may not yet be reflected in a physics/query snapshot. Synchronize or advance
the runtime as the engine requires before trusting an audit that reports sight through a blocker.

## AI implementation diagnosis

When behavior is the cause, distinguish decision, navigation, and steering failures.
Use a state machine for clear discrete modes, behavior composition for priorities/interruptions,
or utility evaluation for graded choices when the current architecture warrants it.
Trace last-known position and knowledge sharing separately from the target's real position.
Inspect transition oscillation and add hysteresis only where the trace demonstrates a threshold problem.
Check stuck recovery, path invalidation, unreachable targets, and return-to-duty behavior.

Use debug state/path overlays to explain the cause, then hide them and judge normal-player readability.
Report visibility of warning, time available, response attempted, outcome, seed/phase, and confidence.

## Completion checks

- Rules and exceptions can be learned from consistent evidence.
- Required opportunities exist under supported states and variation.
- Detection and search behavior agree with the stated perception model.
- Failure reveals enough information to improve the next attempt.
- Retry restores the intended knowledge, patrol, resource, and world state.
- Bypasses are classified as allowed strategies or defects rather than rejected automatically.
