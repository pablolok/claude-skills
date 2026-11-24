# The defects list

Numbers converge before the look does. When they have, write down what the eye sees, against the reference, before
the next round. The list is the brief for the diagnosis, and the diagnosis comes before any fix.

## Format

```
# <asset> against <reference files>: every defect seen (<the sheets it was read from>)

The numeric targets that pass: <list>. The picture still does not read as the reference.

## <area> (nose and face / moustache / mass / outline / point / ...)
1. **<short name>.** The reference shows <what>. Ours shows <what>, in <views>.
   - Where it might come from, if known; what to check first.
...

## What has been tried (do not repeat)
1. <approach>: <what it looked like, in a few words>.
```

Rules:
- **Number every defect** and keep the numbers; later diagnoses and fixes cite them.
- **One defect, one observation.** "The moustache is wrong" is not a defect; "the moustache's lower edge is level
  where the reference's falls about 30 degrees toward the corners" is.
- **Say what the reference shows**, not only what ours lacks: the fix aims at it.
- **Name the brief's own errors** when a defect was asked for ("the brief asked for a level curtain: that was
  wrong").
- **Separate the asset's defects from other owners'** (the skin's paint, the body's bake) and give them to their
  owner.
- **Name the value level a defect belongs to** (under-layer, main layer, white single hairs) with its area, size,
  spread and direction against the reference's, lighting divided out; a defect read on the whole mix hides which
  level is wrong.
- **List what has been tried** in a word each, so the next round does not repeat a failed representation.

## Diagnosis, per defect group

For each group, the causes with their evidence:
- **One change at a time** on a fixed scene: the same view with one variable switched (shadows cast or not, alpha
  as coverage, a material term off, a layer hidden). A variant table shows what moves which defect.
- **A hard border that strand edits do not move: hide each layer on its own first** (an under-layer shell, cards,
  strands), the control byte-identical, every view. A line with straight facets or stair steps is a mask's clip edge
  or a mesh's boundary, not a density wall; fade arms built before this probe are judged against a line they cannot
  touch (`strand-rendering` §5).
- **A census of who draws the defect** before any trim or second try: the strands that cover the defect's pixels,
  by part and lock, kept old strands included. A fix that moves a defect's angle or place but not its strength named
  the wrong cause (one case: a slope cap turned a streak from 15 to 27.5 degrees at the same strength; the next guess
  was also wrong, and 480 of 646 "crossing" strands belonged to the point).
- **Map a line on the still to its strands before choosing the lever.** Measure where the line sits against the
  roots (one case: it lay 4-10 rows below the top roots, so the "top root border" was the wrong reading). Read roots
  per mm2 under the bare pixels first: the cheapest number, and it names the lever (0.024-0.054 against 0.20-0.25 for
  a covered neighbour: a sparse field, fixed by adding roots, not by lifting them). Write each arm's thresholds
  before shooting and take the gauge's noise from the control against itself.
- **Name what each measurement was taken on** and check it on the frames being judged (a cover share read from masks
  shot before the look was applied described another frame).
- **Which camera shows it.** At the gameplay distance most close-shot defects vanish; mark which defects only close
  shots can show.
- **Is the judge itself wrong?** An offline sheet at a density that never ships, or a render that integrates what
  the engine clips, is a fault of the method; say so as its own group.
- **Cause found, not fixed** is a valid state; record it with its evidence and what would fix it.

Expect the causes of a look group to lie outside what the rounds have been tuning (placement), and expect at
least one fault of the method itself; counting which defects the gameplay camera can show at all often moves the
work to the close shot.

## Checking a fix against the art owner's mark

When the art owner marks a defect on a screenshot (a circle, a cross, a drawn line), the fix is checked on that
picture, not on a measure of the fixer's own making:
1. **Re-create their view**: fit the screenshot's camera by silhouette against the model (report the outline's
   residual), so their mark lands on the model.
2. **Overlay the mark** on the before and after captures from that camera, enlarged where the mark is.
3. **Show that the old result fails the same check** (paint, strands or cards under the mark before the fix): a check
   the old result passes cannot prove the fix.
4. **Look at the overlay yourself** before saying done, then send it with the numbers.

A count defined by the author of the fix is not the check. In one case a temple patch was reported removed because
the fixer's measure read 0 mm2, but that measure counted the patch's area as part of the fade; on the art owner's own
view the paint was still under their mark. The next round was checked as above: 15,193 painted pixels outside their
line or in front of the cards before, 0 after, and the enlarged overlay showed paint under their crosses before and
none after.
