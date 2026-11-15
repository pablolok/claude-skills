# The views spec: cameras matched to the concept

Part of `concept-match-loop` §1–2.

## Format

One file per asset, kept beside its build files. The fields used in practice (values illustrative):

```json
{
  "concept": "concept/creature_sheet.png",
  "objects": ["CreatureLow", "Creature_Eye_L", "Creature_Eye_R"],
  "views": [
    {"name": "front", "box": [70, 125, 320, 500],  "from": [0, -1.9, 0.9], "at": [0, 0, 0.28], "lens": 85},
    {"name": "side",  "box": [350, 185, 770, 470], "from": [2.25, 0.03, 0.3], "at": [0, 0.03, 0.3], "ortho": 0.97},
    {"name": "face",  "box": [572, 662, 823, 977], "from": [0.36, -1.25, 0.3], "at": [0, -0.33, 0.2], "lens": 70}
  ]
}
```

- `objects` are the meshes rendered: the shipping ones.
- `box` is a crop on the concept sheet in pixels. Draw it on the figure's own outline, not loosely: on a crowded
  sheet a loose box holds a neighbour's claw and skews the IoU.
- `from` and `at` place the camera; `lens` (mm) makes it perspective, `ortho` (the ortho size in metres) makes it
  orthographic.
- A close-up (`face` above) frames the middle of the model's part, matched to a box drawn on the concept's part.
- Fields worth adding: a flag for a view the concept doesn't draw (rendered and shown, never scored), and notes for
  the judge (what the pose or the drawing can't show).

## Scale

- **Orthographic views**: the ortho size is the box's height in pixels times metres per pixel. Metres per pixel come
  from a known length the view draws straight: the standing figure's height, or for a figure that doesn't stand
  (crouched, crawling, lying), a rigid part drawn flat in that view (the skull from crown to chin in profile).
- Never take the scale from a trunk the drawing foreshortens. On a crawling body that made the model about 1.2× too
  long.
- **Align** each view on the point the eye compares first (a crawler's leading claws, a standing figure's feet),
  not on the two figures' centres. A model longer than the concept, aligned by its centre, gets its face cut off.
- **Measure a part's place on a same-scale crop beside its render**, not by eye off a grid; a grid read can be off by
  a couple of centimetres. Read an edge at the drawing's dark outline, not at the light halo round it.
- **A sheet drawn in perspective** (front and back views often are) disagrees with an orthographic reading by
  several percent of the body's size. When that matters, fit a pinhole camera per view to joints marked on the
  sheet: least squares over the marked joints together with the joints' 3D positions, using symmetric pairs, floor
  contacts and one view held fixed as the authority. Then triangulate the joints through the fitted cameras.

## Pose for the comparison

- Pose the model on its rig to match the concept, using each bone's direction measured on the concept's views. Set
  it on the ground and tune it to the measured heights of the hips, shoulders, hands and feet.
- A wide-legged drawing compared against a narrow rest pose loses a lot of IoU that isn't a model defect. Pose it,
  then render the rest pose too.

## Light like the concept

- Key light from the front-top, **small and disc-shaped**. A big soft key turns skin to vinyl and draws square
  glints in the eyes.
- A low fill and a rim if the concept shows one. The same rig for every round: a light change between rounds reads
  as a paint change.
- Use a neutral view transform (Standard, not filmic) in the DCC when the comparison is about the paint. Judge the
  final values in the engine (below).

## In the engine

- Use a fixed capture: the game camera at its real distance and angle, plus a close-up, under the level's lighting
  and post-process volume. In Unity this has been a small editor tool that places the model, the camera and the
  volume and writes a PNG. For Unreal, the equivalent route is not yet written (see the skill's Open list).
- Sample the capture's pixels in the part's region and compare them with the concept's region (L*, chroma, hue).
  Change the material and capture again. Iterate on that output.
- **A glow's halo is drawn, not pushed**: past a certain intensity the tonemapper whitens the core before the bloom
  draws any halo. An emissive card with a radial falloff texture gives both the core and the haze.
- **A dark inside seen through a gap** (a mouth, a visor, a sleeve) is modelled: a mouth bag or a backing strip on a
  black material. Without it the engine lights whatever is behind.
- Small recesses (teeth behind a lip gap of a few mm) can read lit in the engine where the DCC's AO darkens them.
  Shade them by the state that opens them (jaw open → lit), not with a darker map that stays dark when the mouth
  opens. Check this per engine and per AO setting.
