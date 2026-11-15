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
- **List what has been tried** in a word each, so the next round does not repeat a failed representation.

## Diagnosis, per defect group

For each group, the causes with their evidence:
- **One change at a time** on a fixed scene: the same view with one variable switched (shadows cast or not, alpha
  as coverage, a material term off, a layer hidden). A variant table shows what moves which defect.
- **Which camera shows it.** At the gameplay distance most close-shot defects vanish; mark which defects only close
  shots can show.
- **Is the judge itself wrong?** An offline sheet at a density that never ships, or a render that integrates what
  the engine clips, is a fault of the method; say so as its own group.
- **Cause found, not fixed** is a valid state; record it with its evidence and what would fix it.

Expect the causes of a look group to lie outside what the rounds have been tuning (placement), and expect at
least one fault of the method itself; counting which defects the gameplay camera can show at all often moves the
work to the close shot.
