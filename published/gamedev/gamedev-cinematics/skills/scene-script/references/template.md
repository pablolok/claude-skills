# Script template

Keep one document per scene. Choose its storage location using the host project's conventions.
Replace bracketed fields; they are authoring prompts, not approved content.

```markdown
# Scene [ID] - [purpose]

## Header
- Status: draft
- Revision: A
- Story references: [canonical facts and beats]
- Implementation reference: [optional host-project identifier]
- Duration: [seconds including transitions and handoff]
- Player in: [last action, position, camera, controls, relevant state]
- Player out: [first available action, goal, camera, relevant state]
- Want: [one driver and immediate goal]
- Obstacle: [what blocks the goal and how it is perceived]
- Stakes: [cost of failure]
- Value: [starting condition -> ending condition]
- Turn: [beat and observable action that changes the value]
- Anchors: [emotion; recurring motif; physical object; disruption; final image]
- Pressure: [environmental condition sustaining the scene]
- Geography: [actor, threat, exit relative to a spatial anchor]
- Action axis: [two endpoints; meaning of left/right/on-axis]
- Control contract: [takeover, skip, interruption, retry, final state]

## Beats
| ID | Action -> reaction | Value change | Purpose |
|---|---|---|---|
| B1 | [causal event] | [before -> after] | [new information or pressure] |

## Screenplay
[Interior/exterior; place type; lighting condition]

[B1: present-tense visible action and audible events.]
[SPEAKER, channel or off-screen status: dialogue.]

## Overhead
[Text sketch or diagram: anchor, scale, actors, threat, exit, axis,
camera IDs, look directions, paths, relevant occluders.]

## Shots
### S1 - [plain title]
- Start: 0.0 s
- End: [next shot start or scene end]
- Beat: B1
- Job: [one clause]
- Function: [establish/reveal/pressure/detail/reaction/turn/impact/aftermath/exit]
- Essential: [yes/no; what breaks if removed]
- Size: [extreme wide/wide/full/medium/close/extreme close/insert/black]
- Lens: [focal length and filmback, or equivalent projection/FOV]
- Angle: [height, pitch, relationship to actor]
- Focus: [subject or deliberate deep focus; any motivated change]
- Axis side: [left/right/on-axis; transition if changing]
- Camera: [anchor-relative position, orientation, path]
- Move: [hold or one dominant move; motive; settle time]
- Action: [actors, gestures, animation needs, prop state changes]
- Eye-trace: [initial attention; attention at the cut]
- Light: [source motive, separation, environmental pressure]
- Sound: [ambience, foley, voice, accent, intentional silence]
- Incoming transition: [cut, cut on action, blend, fade, other; reason]
- Outgoing state: [pose, direction, prop state, sound carried onward]

## Lines
| ID | Start | End | Channel | Speaker | Text key | Text | Shot |
|---|---|---|---|---|---|---|---|
| L1 | [s] | [s] | [subtitle/thought/other] | [role] | [key] | [text] | S1 |

## Timing sheet
| Start | End | Shot | Action marker | Line IDs | Sound marker | Control state |
|---|---|---|---|---|---|---|
| 0.0 | [s] | S1 | [event] | [IDs/none] | [event/silence] | [state] |

## Intensity
| Shot | Intensity 0-10 | What changes | Why this duration |
|---|---|---|---|
| S1 | [value] | [contrast, scale, movement, sound] | [reason] |

## Key poses and detail assets
| Time | Pose or visible detail | Body/prop requirements | Readability check |
|---|---|---|---|
| [s] | [observable state] | [joints, ranges, geometry, material] | [silhouette or crop] |

## Review
Revision: [ID]. Reviewer: [role].
[12 criterion scores, evidence, total, structural/timing result, decision.]

## Notes
| ID | Target | Finding and evidence | Decision | Rationale/destination | Revision | Verification |
|---|---|---|---|---|---|---|
| N1 | S1 | [specific issue] | open | [next action] | A | [pending/proof] |

## Lock
Accepted revision: [ID or none]. Accepted by: [review role].
Build tasks carried forward: [IDs and acceptance conditions].
```

Use a common clock for shots, lines, events, and control state. Explicit end times help reveal gaps;
if end times are derived, show the derived values in the review sheet.
Make intentional overlaps, black intervals, and concurrent actions explicit.

A neutral turning-action example: a figure strains against a stuck door; an insert shows the latch
breaking; a wider shot shows the opening and the new threat beyond it. Choose this coverage only
when the latch breaking is the scene's decisive information.
