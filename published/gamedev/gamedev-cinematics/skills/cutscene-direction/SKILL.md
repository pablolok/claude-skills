---
name: cutscene-direction
description: Build or repair an in-engine game cinematic from a locked script, using blockout, acting, lighting and lens, then sound and dialogue passes. Review dense frame sequences and motion shot by shot, including camera ownership, cue timing, skip behavior, and return to play.
---

# Cutscene direction

Build the accepted scene intent and prove what the player sees and hears.
Require a locked script with beats, overhead, shot cards, timing, and control/skip contracts.
If it is missing or materially incomplete, prepare it first; the scene-script skill can help if installed.
Do not silently invent a different scene during implementation.

Read [runtime roles](references/runtime-roles.md) before mapping the script onto the current engine.
Read [build and capture review](references/build-and-review.md) before starting passes or claiming completion.

## Map the script to the runtime

Use the existing architecture when it meets the contracts. Identify a beat interface, director,
cue sheet, scene context, camera rig/output, shot data, actor staging, authored sequence adapter,
dialogue/subtitle presenter, fader, and gameplay-state owner. These are roles, not required class names.
Combine roles where simple; do not impose a new framework for its own sake.

Keep shot and line IDs shared by cards, cue data, diagnostics, and captures.
Use named times and explicit dependencies so a changed beat moves its dependent cues intentionally.
Resolve spatial anchors in variable layouts; authored world positions are valid in fixed sets.
Measure actor and prop bounds before solving close framing. Focus on the named subject rather than
assuming the camera look point is the focus target.

Declare the authoritative scene clock and the pause policy of every subsystem.
Verify behavior during time dilation, pause, skip, and scene unload; do not assume all engine tracks
evaluate on the same clock.

## Build in passes

| Pass | Build | Lock evidence |
|---|---|---|
| B1 Blockout | Camera positions/cuts, blocking, cues, final intended timing | Every card's subject, size, axis side, attention, and duration read correctly |
| B2 Acting | Locomotion, clips, gaze, gestures, anticipation, contact, reaction, holds | Each scripted action is visible in its carrying shot |
| B3 Light and lens | Motivated sources, focus, material response, exposure, grade | Subject separation and continuity match the cards and intended visual hierarchy |
| B4 Sound and dialogue | Ambience, foley, accents, silence, voices, subtitles | Events synchronize; text reads on its picture; mix preserves critical cues |

Review and record each pass lock before advancing. Later passes may expose earlier defects;
return to their cause and invalidate affected evidence.
Check this: lighting may be dominated by ambient fill rather than the apparent key; isolate sources
and compare subject luminance before tuning the wrong light.

If the set, animation, or timing cannot deliver a card, log the conflict in the script and revise its
intent through review. Keep implementation corrections distinct from script changes.

## Review with dense frames and motion

Capture from a known state using the real gameplay presentation. Include relevant preceding play so
state, queued dialogue, and camera ownership are representative.
Start with a time-labeled sequence around **0.25 s intervals**, then sample faster around cuts,
contacts, subtitles, and handoffs. A coarse interval cannot prove a frame-accurate event.

For every shot, compare its card with the matching time range: framing, axis, action, visibility,
light, focus, text, sound, and UI state. Include the first/last displayed frame of cuts and blends.
Review a real-time clip with audio as well; contact sheets cannot establish rhythm or sound sync.
Log each defect with shot ID, time/frame, evidence, likely pass, fix, and recheck.

After an automation timeout, inspect current editor/playback state before retrying. Check this:
the command may still be running, so a blind retry can start a second capture or alter the wrong beat.
Never discard a first frame by convention; verify whether it belongs to the target interval.

## Completion

Require all four pass locks, resolved blocking notes, script/build agreement, dense frame evidence,
an audiovisual clip, and relevant compile/runtime checks.
Check normal completion, early and late skip, pause/resume, interruption, and repeat entry.
Normal and skipped paths must reach equivalent required gameplay state with controls, camera, HUD,
audio, subtitles, actors, and progression restored appropriately.
Disclose accepted deviations and unverified states alongside the evidence.

Unity note: Timeline can author choreography; Cinemachine can manage shots and blends.
Unreal note: Sequencer can author choreography and cuts; a Cine Camera carries lens/focus intent.
In either, inspect the displayed camera and completion behavior instead of assuming a requested cut took effect.

## Open

- Add small engine examples that demonstrate clock and camera-ownership contracts.
- Add a neutral capture example covering skip and the first playable threat.
