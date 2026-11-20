# Binding cards and base without hair bones, and the export

One case: a short crop's generated cards (three sets) and its painted base, bound rigidly to a game skeleton with a
face driven by ARKit-style shape keys, exported as FBX to Unity. Each pitfall below was met once: check this.

## Cards: rigid on the skin at their root

- **Find each card's root** from the attributes atlas (the end where the root-to-tip coordinate is 0; card-generator.md)
  and check it is the end nearer the skin on every card.
- **Each card takes the skin's weights at its root** (interpolated on the nearest skin triangle) and **the same
  weights on every vertex**: the card moves as one rigid piece with the skin under its root. In one case the long and
  edge cards came out all head-weighted, the upper fade's cards head plus a little neck at the nape.
- **Rigid cards over skin that a face shape moves can dip into it**: brow shapes moved the forehead skin up to 2.5 mm
  at the temples, and in an extreme expression 43 card vertices went 0.26 mm under the skin at the hairline (none in
  the head-only clips). Report it with its frame and place. Remedies not tried: a little lift at the hairline, or
  the forehead's shapes on the cards.

## The base: the skin's full weights and the face shapes under it

- **Weights:** the full skin weights of its nearest skin point (interpolated, the top 4 influences, normalised).
  Purge whatever weights the base carried from an earlier copy of the skin first (stale groups with no names were
  there in one case).
- **Face shapes:** give the base every face shape that moves the skin under it by more than a threshold, as its own
  shape keys driven by the face's. In one case 8 shapes passed 1 mm (brows down and outer up, cheek puff and squint,
  jaw open); under the painted texels themselves no shape moved the skin more than 0.41 mm, the big moves lay under
  transparent base. A second binding with every shape over 0.05 mm (29) was started to fix a pale line under the
  fringe at an expression's peak and not finished: its effect is unknown.
- **The engine copies shapes, not drivers**: bake the drivers into animation curves on the base's keys at export
  (below), or copy the face's weights to them every frame at run time.
- Gates that failed by a hair and were reported, not softened: the base's distance to the skin at an extreme frame
  0.04-0.07 mm past its band; paint over the nape's card footprint +2-3 % at a full turn.

## Gates (every frame of every clip, every face shape at 1.0)

| gate | rule |
|---|---|
| cards inside the head or neck | 0 vertices newly inside (count only those outside at rest) |
| base inside, base band | never inside; its offset from the skin within the band it was built with |
| card roots | change in root-to-skin distance and slide along the skin, worst frame and place |
| ears and the art owner's lines | the painted-base checks, at several poses |
| bookkeeping | no unweighted vertex, at most 4 influences, sums of 1, the skeleton and the body unchanged (hash them) |

## Export pitfalls (one case each)

- **Face-shape curves frozen at their first value.** The exporter's own triangulation wrote a copy of the mesh that
  no shape-key animation reached, so every face curve came out constant. Triangulate the meshes in the DCC before the
  export and turn the exporter's own triangulation off; then check on the imported file that the face curves move.
- **Driven keys exported as constant curves.** Keys that follow other keys through drivers (the base's, the lashes',
  the teeth's) came out flat: sample every exported key at every frame into its own action and remove the drivers
  before the export.
- **A subdivided body must keep its shape keys.** The game body was the skin subdivided once; its face shapes had to
  be rebuilt at that level, and the cards' and base's weights were taken on that subdivided skin.
- **Check animation away from time 0.** A clip's first frame can equal the rest; check a frame well inside each clip
  (a face shape at its peak) after every re-export.
- **The look build may sit at a posed first frame, not at rest** (an idle face at time 0 with the head 1.6 degrees off
  rest, in one case): compare captures like with like, and place cards at the rest pose of the skeleton they bind to.
- Files at different frame rates (25 and 30 fps) in one chain: say which one each clip uses.
- **Unity:** import an FBX with face shapes with blend-shape normals set to Import, not Calculate: Calculate
  recomputed the expressions' normals and smeared the face at an expression's peak.

## After the export

- Re-import and compare: counts and UVs equal to the look build, cards within a few microns, base-to-skin offsets as
  built.
- Regression against the static look's captures: in one case most shots matched, while the nape differed by about
  0.07 mm on a few hundred fade-card vertices (their small neck share, accepted).
- A viewer scene that plays every clip, for the art owner to try.
