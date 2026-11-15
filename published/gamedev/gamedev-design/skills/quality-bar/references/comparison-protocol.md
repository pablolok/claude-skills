# Compare the delivered piece to its target

## Set up a fair comparison

Record target revision, build identifier, camera/projection, viewport, render settings, display assumptions,
input state, audio settings, and the exact moment captured. Use the real gameplay view, not a substitute
preview that bypasses lighting, materials, UI, post effects, or animation.

Match camera angle, scale, crop, exposure intent, and colour space before comparing numeric values.
If a painted concept contains impossible lighting or perspective, describe the agreed interpretation.
Do not silently alter the concept to make the score improve.

## Stills

1. Compare full frames at delivery size: focal point, silhouette, value hierarchy, composition, context.
2. Compare equal-scale crops: structure, joins, edges, surface detail, material response, and text.
3. List each discrepancy and its consequence. Separate structural mismatch from rendering artifacts.
4. Inspect a greyscale view and a thumbnail; ensure important information survives reduced detail.
5. Check several relevant states rather than selecting the only flattering frame.

For characters and props, use final materials under representative lighting as well as any diagnostic view.
For UI, compare both the whole screen and the specific object at the same displayed size.

## Measurements

Useful measurements include mean and percentile luminance, share of pixels below a declared dark threshold,
subject/background luminance difference, hue/value distribution by region, silhouette occupancy, and edge density.
State how luminance was computed and what crop/mask was used; display-encoded values are not scene-linear light.

Compare regions that carry the design rather than relying only on global averages.
Record tolerance and why it was chosen. Example fields:

| Metric | Target | Build | Tolerance/reason | Visual interpretation |
|---|---|---|---|---|
| Subject separation | [measured range] | [value] | [agreed readability need] | [silhouette reads or merges] |
| Dark-area share | [value, threshold] | [value] | [style/display choice] | [lost information or intentional space] |
| Contact timing | [event marker] | [frame/time] | [action requirement] | [sync or visible lag] |
| Frame cost | [budget] | [representative distribution] | [platform target] | [stable or hitching] |

Check this: matching average brightness can coexist with a wrong silhouette or missing focal contrast.
Use measurements to locate a problem, then verify its perceptual cause.

## Motion and sound

- Capture real-time video through the approach, action, reaction, and recovery.
- Inspect frame windows around impact, camera cuts, UI changes, and control return.
- Listen at a consistent level in context, then isolate layers only to diagnose a fault.
- Check repetitions: variation, fatigue, stacked effects, rhythm, and recovery of attention.
- Verify exported video/audio on the intended playback device or agreed equivalent.
- Include reduced-motion/flash/shake settings when those alter the presentation.

Stills cannot establish weight, locomotion, temporal stability, audiovisual sync, or pacing.
Motion alone may hide material and edge defects; retain matched stills and crops as well.

## Review packet

```text
Piece and target: [scope, purpose, accepted reference revision]
Capture context: [build, view, settings, device assumptions]
Light: [pass/revise/not applicable/unverified + evidence]
Matter: [status + evidence]
Motion: [status + evidence]
Sound: [status + evidence]
Staging: [status + evidence]
Largest discrepancies: [ranked differences, impact, concrete next change]
Measurements: [values, masks/crops, tolerances, limitations]
Evidence: [full frames, crops, audiovisual clip, runtime checks]
Accepted deviations: [reason and review role]
Remaining tasks: [destination, acceptance check]
```

Recheck only affected evidence after a change, broadening when it introduces a new risk.
Do not relabel an unresolved mismatch as accepted without an actual decision.
