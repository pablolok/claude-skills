# The sweep method: values chosen by a rule written first

Use it for any look value with more than two knobs (occlusion, base value, tone spread, silver, lobes, under-layer).
Hand-tuning by eye drifts and cannot be repeated.

## Before rendering

1. **Reproduce the baseline.** Fresh stills of the current look and of every other look the change could touch
   (the cards, the bare skin, earlier patches) must be byte-identical to the saved ones. If not, find out why before
   anything else; numbers from two sessions that differ on the baseline do not compare.
2. **New knobs default to neutral** and the neutral setting reproduces the baseline byte for byte.
3. **Write the arms** (a factorial grid over the knobs, plus the baseline as a control and any diagnostic arms) to a
   file, and hash it.
4. **Write the gauge**: the region (the reference's mask eroded a few px), the rows (from `hair-reference-review`),
   and the same code for the reference, the DCC render and the engine.
5. **Write the rule**: hard limits per row per view (for example p50 within 2 L*, p90 at most the reference's + 2,
   dark share within 0.05, a* and b* within 1.5, clump contrast inside the reference's band), then a ranking for
   the eligible arms, then a diagnostic ranking for when none is eligible. Put the ranking in a small pure module
   with its own tests.

## Rendering

- One scripted run: the engine driven by a script (an editor bridge or a batch mode), every arm at every view, the
  stills saved per arm. No edits to the shader, the arms or the limits between arms.
- Log what can fail silently: missing stills, duplicate stills, heap growth across arms (a mesh copy per arm leaks).
- Keep every reading in one JSON: arm, every row per view, eligibility, the reason for each miss, the rank.

## Choosing

- The rule chooses. If no arm is eligible, say so plainly, report the nearest arms and what each misses, and do not
  loosen a limit after seeing the results.
- A second sweep is allowed when the first shows a reason (a curve that invents light tips, a range edge), with its
  own table written first. A prediction from interpolating the measured arms is not evidence; render it.
- Then look at the nearest two arms by eye, at the views and in enlarged crops of the places the defects live
  (a cheek, the chin, the jaw band), against the reference. The eye can overrule the ranking between near arms;
  write down why.

## After choosing

- **The constants reproduce the chosen arm byte-identically** at every view.
- Every other look is byte-identical to before (cards, earlier patches, the bare skin).
- Drop the knobs left at neutral by the chosen arm, and note that older sweeps which set them no longer replay on
  the new version.
- The usual gates: compile clean, tests, any project checks.
- Keep the arms file, the readings, the sheets (reference | before | after) and the regression results with the work.
