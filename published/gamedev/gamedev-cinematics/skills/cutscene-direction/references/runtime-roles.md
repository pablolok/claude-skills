# Runtime roles and verification contracts

Map these responsibilities onto the existing system. The table describes behavior rather than a class hierarchy.

| Role | Responsibility | How to check it |
|---|---|---|
| Beat interface | Enter, advance, complete, and leave a bounded unit of staging | Exercise each beat; entry initializes once; completion is reachable; exit releases owned state |
| Director | Select/order beats, own transitions, handle completion and skip | Reject missing/invalid beat mappings; trace actual order; prevent duplicate transitions |
| Shared scene context | Provide actors, anchors, presentation services, and state to beats | Validate required bindings before takeover; report a missing dependency explicitly |
| Cue sheet | Schedule actions on one declared clock with deterministic ordering | Tick across several cues at once; each fires once in order; cancellation removes obsolete cues |
| Camera rig/output | Own the displayed cinematic camera, cut/blend, move, shake, release | Inspect rendered output at boundaries; requested cuts show no unintended interpolation; gameplay regains ownership |
| Shot data | Store pose, projection, filmback/FOV, subject, focus, transition, and light intent | Resolve every binding; compare framing against bounds; inspect focus and exposure in the actual frame |
| Authored sequence adapter | Bind tracks/events and evaluate authored choreography on the scene contract | Check missing tracks, clock drift, event duplication, final state, and early stop |
| Actor staging | Suspend conflicting control/AI, play clips, move, turn, look, hide/show | Verify clip/state existence; contact and arrival times; no foot sliding or competing controllers |
| Patrol/AI adapter | Stage supporting actors while retaining a recoverable AI state | Confirm path reachability, gaze, interruption, and correct behavior after return to play |
| Dialogue/subtitles | Resolve text/voice, schedule display, identify speaker, manage queues and channels | Check exact text, overlap, reading time, settings, safe area, and queue cleanup |
| Fader | Own transition opacity, timing, and draw order | Verify fade during pause, subtitle layering, no hidden input trap, and clear state after skip |
| Lighting/visibility adapter | Apply shot emphasis or temporary presentation overrides | Check affected objects and restoration; avoid leaking shot-only light or visibility into play |
| Gameplay-state owner | Save/restore control, HUD, prompts, progression, camera, and relevant world state | Compare normal/skip final-state snapshots; retry and interruption leave no stale locks or UI |

## Clock contract

Specify clocks for cues, animation, camera, UI, fader, audio, and simulation. Common choices are game time
for action and real time for pause UI, but the correct policy follows the intended pause and slow-motion behavior.
An authored sequence may instead own the whole cinematic clock.

- Define whether entering a beat resets its local clock and how local time maps to scene time.
- Resolve equal-time cues with an explicit order, especially cut -> pose -> sound -> subtitle events.
- Handle a large time step crossing several cues; do not drop events solely because a frame was missed.
- Separate seeking/scrubbing from ordinary advancement; avoid replaying irreversible gameplay side effects.
- Check time scale zero, reduced speed, pause/resume, and restoration to the previous scale.
- Cancel delayed work on exit, skip, unload, or replacement. A stale cue must not affect the next scene.

## Camera and lens contract

- Specify camera ownership and whether a transition is a cut, blend, or fade.
- Ensure the shot lives long enough for its blend and readable hold; avoid a blend spanning unrelated angles.
- Record filmback/sensor dimensions and FOV axis when translating lenses between tools.
  Vertical FOV = 2 * atan(sensor height / (2 * focal length)).
- Measure the live actor bounds, including pose changes, for close framing and near-plane clearance.
- Derive focus from the subject position or an authored focus distance, not a generic look target.
- Inspect autofocus/focus tracking, motion blur, exposure adaptation, and shake for information loss.
- Check this: a camera request can be overridden by another camera manager; record which camera actually renders.

Unity: map sequence timing to Timeline, camera selection to Cinemachine or existing camera control,
and actor work to the animation/controller systems already in use.
Unreal: map sequence timing to Sequencer, lens/focus to Cine Camera, and control restoration to
the existing player/camera management. Check sequence completion and restored state explicitly.

## State and lifecycle contract

Define required end-state fields: progression flags, actor transforms/visibility, AI modes, relevant props,
camera ownership, input locks, HUD/prompts, subtitle queues, fader opacity, audio state, and time scale.
Presentation can differ between played and skipped paths; required gameplay outcomes cannot.

Make terminal-state application safe if requested more than once. Verify:

1. Normal completion.
2. Skip before the first action, during a transition, and near the final cue.
3. Pause/resume during animation, dialogue, and fade.
4. Interruption or unload while delayed work is pending.
5. Re-entry and retry after both played and skipped paths.
6. Missing binding behavior with a clear diagnostic and recoverable player state.

Use deterministic checks for lifecycle and event ordering, then runtime captures for presentation.
A lifecycle test cannot prove that an action reads on camera.
