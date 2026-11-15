---
name: concept-match-loop
description: Use when a 3D model (a creature, a character, a prop, a part) is being made or fixed to match its concept art, before anyone reviews it — a views spec with cameras matched to the concept's views and scale, renders of the shipping LOD, side-by-side sheets, silhouette IoU and L*/chroma/hue numbers, close-ups part by part in colour and clay, an independent judge with a rubric, fixes at the source, and going upstream when two rounds don't move it.
---

# Concept match loop

Part of the `gamedev-assets` bundle. Making the model itself is `concept-to-asset`; a body's skeleton
and ranges of motion are `anatomy-study`.

The art owner's eye is the final gate; this loop runs before it so their review finds little. It fails in two ways:
a bad source tuned for many rounds (no amount of hand-shaping fixes a take generated from the wrong image), and
parts never looked at up close (a jaw on backwards, eyes too small for their sockets, a piece floating off its
socket — each visible at a glance after the overall sheet and score had passed them).

## 0. Find the reference in force

The reference is the brief. Before the first render, and before asking the art owner anything:
- Find the image(s) the work is **measured against now**: start from what the checks, masks and plan point at, not
  from a folder listing. A later reference (a realistic repaint, an approved turnaround) supersedes an earlier
  painting; working from the old one wastes every round.
- Name the exact file in every brief, sheet and report.
- Before writing "you asked for X", check whether the reference already shows X. It usually answers the question.

## 1. The views spec

A small data file per asset (JSON or similar). It lists the concept image, a crop box for each view it draws (front,
side, back, 3/4, top, close-ups of parts), and a camera for each view that sees the model as the concept does. See
[references/views-spec.md](references/views-spec.md) for the format, the scale rules and the lighting.

- Tune the cameras **once**, on the first round, until the silhouettes overlap. A framing mismatch reads as a model
  mismatch and sends the fixes the wrong way.
- Take the scale from the concept itself: the figure's pixel height equals the body's height. An orthographic camera
  is then the box's height times metres per pixel. A figure that doesn't stand takes its scale from a rigid part the
  view draws flat (the skull in profile), never from a foreshortened trunk.
- Frame a close-up on the part itself in both images: the box on the concept's part and the camera on the model's.
  Framing it on the body's midline cuts the part in one of the two.
- A view the concept doesn't draw (often the 3/4) is rendered and given to the judge as reference only.

## 2. Render what ships

- Render **the shipping mesh**: the game LOD0 with its baked maps, in a real-time-like renderer. Don't render the
  dense source. Clay judges a shape change alone; it is not the score.
- **Pose it as the concept stands** for the comparison only, bone by bone, using directions measured on the
  concept's views. Then tune it to the concept's measured heights (hips, shoulders, hands, feet), never to the IoU:
  a pose chased by IoU drifts into a stance the creature would never take. Render the **rest pose** too, so the
  judge can separate the body's own shape from the pose.
- Tell the judge what the pose can't show: gear placed for the game's stance, or a cheat in the drawing, so it isn't
  scored as a defect.
- **What the engine's grade changes is judged in the engine**: emission colour, metal value, albedo value, gloss.
  DCC and engine tonemappers differ (a bright emission whitens, a saturated green shifts toward yellow, metal goes
  dark with nothing to reflect). Capture in-engine from the player's camera under the level's lighting. Sample those
  pixels against the concept's and iterate on that output; never convert sRGB values by formula.

## 3. Sheet and numbers

- **Sheet**: one row per view, concept left, model right, at the same framing and scale. A before | after sheet for
  each fix.
- **Numbers** ([references/metrics.md](references/metrics.md)): silhouette IoU and outline aspect for each view; CIE
  L*, chroma and hue of the lit half; broad and fine value contrast; accents inside their palette region.
- Numbers settle placement and colour, where a judge by eye drifts (the same paint "too pale", then "too dark").
- Numbers never settle a **shape**. A 1 cm surface distance on a 12 cm ear is a different ear. For every visual
  comparison, first write the list of what differs in the images (outline, folds, seams, proportions), worst first,
  then quote numbers as support. If you can't see a difference clearly, crop and zoom before judging.

## 4. Close-ups, part by part

The sheet hides what a reviewer sees first. For each part:
- Render it from the **front, both 3/4 views, the side, below and behind**, in **colour and clay**, beside the same
  crop of the concept. One defect (bare stubs where jaws should grow) showed only from the front in clay, after
  three rounds had passed it from every other angle.
- Check each of these in every view:
  - **count**: legs per side, teeth, spikes. A side view shows the far side's limbs between the near ones; a
    generator copies them as extra limbs.
  - **orientation**: points close in, not out.
  - **size against its socket**: an eye fills its orbit.
  - **attachment**: joined as the concept joins it (a soft cuff, a socket under a rim), the colour continuous
    across, with no gap, flat cut or exposed tube.
  - **seams**: a dashed or stepped line is a mesh crack or a broken bake mask, never "texture noise".
  - **edges**: round an eye or a plate, no teeth and no shards.
- **Clay finds defects; the score is taken on the shipping mesh with its maps**, from the player's views (the game
  camera, each cutscene framing). A low-poly skin scored in clay against its dense source loses points for folds
  that only its normal map carries.
- Trust an automated defect check (wrong-layer texels, holes, crossings) only once it flags the defect a close-up
  shows. A check with a fixed absolute tolerance can read 0 on a part covered in visible shards.

## 5. The independent judge

A fresh subagent with no stake in the work, given the sheet, the close-ups, what was measured and the rubric:
[references/judge.md](references/judge.md) has the prompt and the rubric.
- **Calibrate it first**: show it the known cases, the differences the art owner once caught that a judge passed. A
  judge that does not flag them is not trusted on the new sheet.
- **Tell a rig judge what is not natural**, not only which defects to hunt. Asked to look for tears and slits, judges
  passed a knee with no bony landmarks bending as one smooth tube. Told that this is not natural, they flagged it.
- **A choice between two versions is judged blind**: "which reads as natural, A or B, and why", never told which
  one is the fix. Fixes tuned to a metric can read worse than no fix.

## 6. Fix at the source

Worst difference first, one piece at a time, each fix proving itself before the next.
- **Proportions first**, measured per segment at the concept's scale (upper arm, forearm, hand; thigh, shin, foot;
  trunk; shoulder width), always on the concept, never on the model being corrected.
- A correction measured on one generated take belongs to that take. When the take is replaced, reset its
  corrections and measure again.
- Turn a judge's word for a region ("no grin", "too heavy") into **landmarks** first. On same-scale crops, walk from
  a point both images share (the eyes) to the region; the first landmark that differs is where the fix starts.
- Fix the shape in the build recipe or the take, and the paint in the paint. Never move the camera to hide a
  difference, and never hand-edit the result.
- **Isolate a visual defect before the first fix.** Zoom on it in clay, then without the normal map, then in base
  colour only. The channel that carries it names the cause, and one defect can have two causes (faces dipping into
  an eyeball in clay *and* sliver UV islands in base colour).
- **One surface showing where another should cover it**: cast a ray at that pixel and name the front-most surface
  before moving either.
- **A piece that goes through stages** (source take → baked shell → game mesh): render each stage apart beside the
  concept's crop to find the stage that adds the defect.
- **A fix that "does nothing"**: read the code and check its inputs. A mask that read the whole texture as valid
  turned three paint fixes into no-ops.

## 7. Repeat, stop, or go upstream

- **Stop** at a pass: the rubric's threshold, no row at 0, no high-severity difference. The default is ≥ 17/20;
  calibrate it against the art owner's verdicts.
- **Go upstream after two rounds that don't move the score.** Get a new source rather than more tuning: the whole
  piece asked again with the concept's own structures named (`concept-to-asset`, reference images). Don't swap
  another part on or carve one in.
- The same applies to a piece that won't **sit** (worn gear, a part on its socket). After two honest placements,
  render the take alone beside the concept's crop and ask whether it is the right object: open where the body
  passes through, the right silhouette in every view. A closed cup cannot become an open pauldron by placement.

## 8. Show the art owner

Show the sheet, the close-ups beside the concept, the score, the open differences, and the exact reference file.
Their verdict is final. A difference they see that the loop missed becomes a new check here and a known case for
the judge.

## The asset's state file

One file per asset beside its work files, read by every agent at the start and rewritten at the end, so a crash, a
pause or a new agent costs nothing. It holds:
- the task and what counts as done;
- the reference in force (the exact file);
- the restore command and the files it loads;
- for each region, its score and open differences;
- what was tried and failed, one line each with why;
- the art owner's verdicts, as known cases;
- the next step.

An agent's context is never the record: it grows, compacts and loses precision.

## Open

- Ship reference scripts (render views from a spec, build the sheet, compute the metrics) so the loop isn't
  rebuilt per project.
- Calibrate the 17/20 pass line and the severity rules across more assets and art styles (it comes from stylised
  creatures).
- A rubric variant for hard-surface props and environment pieces (rows 5 and 7 are creature-shaped).
- An engine capture recipe for Unreal like the Unity one in the views spec reference: fixed camera, the level's
  post-process, pixel sampling.
- How many judges to run and how to merge their scores (one judge has been used so far).
