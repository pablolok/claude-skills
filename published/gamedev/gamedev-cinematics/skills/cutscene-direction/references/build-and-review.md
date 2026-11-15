# Build passes and shot verification

## Establish a reproducible baseline

Record build identifier, script revision, scene entry state, engine/render settings, viewport, frame rate,
time scale, input/settings, and seed if layout or timing varies. Use identifiers rather than calendar labels.
Start from a known state and exercise required preceding play. A debug jump must reproduce its preconditions.

Check this: resetting a running session may leave queued lines or actor state intact. Inspect the actual
entry state rather than assuming the reset command rebuilt everything.

## B1 - Blockout at final timing

- Resolve anchors and camera clearance in the actual set.
- Use measured bodies/proxies and the intended shot times, even with placeholder animations.
- Check actor/threat/exit placement against the overhead, then size, angle, axis side, and eye-trace.
- Inspect transition boundaries to distinguish hard cuts from blends.
- Play through the outgoing gameplay action; framing success alone does not prove a safe handoff.

Lock when every intended image reads and the merged timing sheet plays correctly.

## B2 - Acting

- Verify required clips exist; missing states must not silently leave an actor idle.
- Check anticipation, effort, contact, reaction, and held consequence in their carrying shots.
- Review locomotion speed, planted feet, joint range, look targets, and prop contact.
- Check interacting bodies together through the final camera. Check this: an action tuned against
  a proxy can penetrate the real target or hide the important pose.
- Confirm secondary actors react to the actual event rather than anticipating an unseen cue.

Lock when the scripted actions and their meaning can be seen without relying on a description.

## B3 - Light and lens

- Set the intended filmback, framing, focus subject, depth of field, and motion treatment.
- Check separation in greyscale and at delivery size; retain meaningful background context.
- Isolate key, fill, ambient, practical, emissive, and post effects if the cause of a mismatch is unclear.
  Change one contribution, recapture, compare, then restore diagnostic overrides.
- Compare exposure, material response, colour meaning, and direction across adjacent shots.
- Check geometry contact, near-plane intersections, vegetation occlusion, background voids, and moving shadows.

Lock when visual hierarchy supports the cards in both held frames and transitions.

## B4 - Sound and dialogue

- Put ambience, foley, action accents, voice, and intentional silence on the same event clock.
- Verify sync at contact, not only at animation start.
- Compare each line's actual start/end with its owning image and configured reading allowance.
- Check simultaneous channels, subtitle stacking, backing contrast, speaker identity, and localization.
- Listen for dialogue or music hiding a telegraph, quiet failure point, or final consequence.

Lock when sound and text make the intended action clearer in context.

## Dense capture protocol

1. Capture the final player-facing presentation, including UI composition and the gameplay camera.
2. Label frames with scene-clock time, frame index, shot ID, and pass/revision where possible.
3. Start around 4 samples/s for a short scene. Increase density around cuts, impacts, pops, and text changes.
4. Capture frame-by-frame windows for exact event ordering and contact; sample before and after each boundary.
5. Make a readable contact sheet and retain the full-resolution source frames for crops.
6. Capture a real-time clip with audio through entry, the whole scene, and return to play.
7. Repeat relevant windows after fixes; do not reuse evidence from a superseded revision.

Check this: if a custom capture disagrees with the visible game, compare it with a direct game-view
capture before altering UI or lighting. An extra composition pass can introduce a capture-only fault.

## Per-shot review record

| Field | Record |
|---|---|
| Identity | Script revision, shot ID, expected interval, actual interval |
| Frame | Subject, size, angle, axis side, entry/exit attention, lens/focus |
| Action | Required pose/event, exact contact, visible cause and result |
| Space | Actor/threat/exit, screen direction, eye match, prop continuity |
| Visibility | Occluders, edge clipping, near plane, set boundaries, dark detail |
| Light | Motivation, subject separation, exposure/colour continuity |
| Words/sound | Line timings, readable duration, speaker, sound sync and mix |
| UI/control | Intended HUD/prompt state, skip hint, ownership and handoff |
| Decision | Pass or finding ID; evidence time/frame; corrective pass; recheck result |

Watch motion for floating cameras, accidental easing, unmotivated moves, pose pops, jumps, axis confusion,
lighting changes, subtitle drift, repetitive holds, and a disorienting first playable input.
Review on the intended delivery device or an agreed equivalent.

## Completion packet

Include pass-lock records, shot review table, contact sheet, audiovisual clip, lifecycle test results,
script/build mapping, accepted deviations, and remaining nonblocking tasks.
An unresolved required action, incorrect skip state, or control/camera restoration fault blocks completion.
A deferred cosmetic change must have an explicit destination; it does not count as already fixed.
