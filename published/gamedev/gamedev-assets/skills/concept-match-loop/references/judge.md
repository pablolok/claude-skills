# The independent judge

Part of `concept-match-loop` §5. The judge is a fresh subagent with no context from the work: it sees only what
you give it. It catches what the maker stops seeing; it does not replace the art owner.

## The rubric

Each row is scored 0–2: 0 wrong, 1 close, 2 matches the concept. It comes from stylised character practice (shape
language and readability, stylised meshes and textures; see 80.lv's articles on both) and from reviewers' verdicts.

| # | criterion | 2 means |
|---|---|---|
| 1 | **Silhouette** | the outline lies on the concept's in every view: the mass, where it is widest, how low it sits, what touches the ground |
| 2 | **Proportions** | the main masses and parts in the concept's ratios (head : body : limbs : eyes; for a prop, its main parts) |
| 3 | **Shape language** | round where the concept is soft, pointed only where it is sharp; no lumps, dents or faceting |
| 4 | **Shape hierarchy** | big > medium > small as in the concept; detail gathered where it gathers it, rest areas calm |
| 5 | **Focal point** | for a character, the face and eyes: their size, spacing and height, set in the face (orbit, lid, brow), the glint, the expression. For a prop, its focal feature (a visor, an emblem, a blade's edge) |
| 6 | **Parts** | each part made like the concept's (rings, cones, claws, rivets), growing out of the body where it does, pointing its way, at its length and count |
| 7 | **Materials** | each material reads as itself: soft against hard, wet against dry, leather against metal; nothing plastic |
| 8 | **Surface** | clean: no smudges, streaks, noise or seams; gloss only where the concept has it |
| 9 | **Colour and value** | the concept's hue and value design: lighter where it is lighter (often on top), darker under, lines in grooves and joints, the accents |
| 10 | **Appeal** | in a thumbnail, someone would describe it as the concept intends (cute, menacing, noble, worn) |

**Pass: ≥ 17/20, no row at 0, no high-severity difference.** That line comes from stylised creatures; check it
against the art owner's verdicts on your first few assets and move it if they disagree.

**A row that does not apply** (a prop with no focal feature): mark it N/A, score the rest, and scale the pass line
(≥ 85 % of the remaining maximum, no 0, no high).

**What has moved scores for a stylised creature**: these come from one asset, so check them against your concept.
- Big, round, open eyes at mid-face, inside the head's outline. A heavy lid reads sad; a pale ring reads as goggles.
- A muzzle under the eyes. Eyes over a hole read as a skull; a central bump reads as a nose.
- A low, heavy body on short legs. Legs a quarter of the body's height read as a spider.
- Segments that overlap rather than meet at even grooves. Even grooves read as tyres.
- Horns that taper to a dark point; teeth short and dense under a lip.

## The prompt (fill the brackets)

> You are a senior character artist reviewing a 3D model against its concept art for a `[style]` game. Read
> `[sheet path]`: each row is one view, concept on the left, model on the right, framed the same.
> Close-ups: `[paths]`. The subject: `[what it is and how it should feel]`.
>
> The model is a real-time asset and the concept is a painting. Judge design, shape, proportion, colour and how
> each material reads. Do not judge ink lines or cast shadows. The concept's views may cheat against each other:
> judge its intent. Not defects (the pose or the drawing can't show them): `[notes from the views spec]`.
> Views marked reference-only are not in the concept: use them to judge the model's form, not its match.
>
> Measured: `[IoU and aspect per view; lit L*/C*/h per region against the concept's; value spreads]`.
>
> Known cases: `[differences a reviewer caught before that a judge missed, with crops]`. Say for each one whether it
> is present in this sheet.
>
> Be strict and concrete. Score each criterion 0–2 with one line of evidence: `[the rubric table]`. Then list EVERY
> difference, one per line, as `severity (high/medium/low) | part | view | concept | model`, worst first, measured
> where you can. End with the total, PASS or FAIL (`[pass rule]`), and the three changes that would raise the match
> most.

## Calibration on known cases

- Keep each difference the art owner caught that a judge passed, with its crops, in the asset's state file.
- Show them to every new judge first, in the prompt. A judge that does not flag a known case present in the sheet is
  not trusted on the rest. Run another, or tighten the prompt.

## A rig or motion judge

Judges hunt the defects they are told about and pass everything else. List what is **not natural**, not only the
defects:
- a joint bending with no bony landmarks left: the two segments become one smooth tube (a "rubber hose");
- a fold at one pivot where the body bends over several joints (a neck that folds at its base into the chest);
- a joint bending past its anatomical range, or about the wrong axis;
- volume lost at the bend (a pinched elbow), or gained (a balloon knee);
- rigid parts (bone, plate, horn) stretching or bending;
- a planted foot sliding, or the body's weight outside its support;
- secondary parts (cloth, straps, hanging items) going through the body or flung out of the way.

Ask per pose: "Is this a natural pose for this body at this angle? What isn't?" On one "rubber hose" knee, three
of three judges told only to look for tears, slits and webs passed it. Twelve of twelve told the first item above
flagged it. The other items are from reviews, not from that test.

## Blind A/B

For a choice between two versions (a corrective off or on, before or after):
- Show A and B in a random order, unlabelled, from the views that matter (the game camera first).
- Ask: "Which reads as a natural pose (or a closer match), A or B, and why?" Never say which is the fix.
- A fix tuned to a metric (fewer crossings, lower stretch) can read worse than none: a rubbery lip, a lumpier fist.
  Keep the version the judge and the art owner prefer, and say what the metric missed.
