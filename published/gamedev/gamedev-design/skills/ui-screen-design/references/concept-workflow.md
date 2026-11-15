# Purpose, references, concept, and build plan

## Screen brief

Write one line for each field before designing:

| Field | Decide |
|---|---|
| Moment | What just happened and what state the player is in |
| Emotional transition | What should register now and what should become possible next |
| Functional job | Information, decision, action, or interruption the screen exists to serve |
| Content | Ranked items, source data, optional/required content, maximum plausible length |
| Focus | The first thing to notice and why |
| Primary action | What continues the experience and what alternate actions are needed |
| Conditions | Viewports, viewing distance, devices, localization, scale, backgrounds, pause state |
| Success check | What a player should understand or do without explanation |

For a death screen, consider a brief consequence, an understandable cause, useful run/session meaning,
and fast recovery. Measure actual input-to-play time if quick retry is part of the target.
For settings or inventory, prioritize accurate state and efficient navigation over the same emotional pattern.

## Reference study

Use a small set of relevant references with different useful principles rather than a large image dump.
For each, write what it contributes: title dominance, information grouping, live scene backdrop,
illustration focus, restrained ornament, motion pacing, or action placement.
Check the host game's existing visual grammar and reusable components.
Do not copy another product's content, branding, distinctive composition, or exact ornament as a substitute for design.

## Distinct concept directions

Give each direction a different compositional idea, not merely another colour:

- Title-led: a dominant phrase or symbol with limited supporting information.
- Result-led: the outcome and choices carry the composition, with a clear information sequence.
- In-world: the game scene or a live subject supplies the focal image while UI frames the decision.

These are examples, not mandatory options. Use real content, readable text, plausible safe areas,
and the target aspect ratio. Show the highest-risk dynamic state, not only a short ideal label.

For each mockup, include the intended entry order, focal point, next action, and production tradeoffs.
If an image tool renders text inaccurately, overlay correct text or supply an annotated layout.
Mark illustrative subjects that will be live-rendered or modular in implementation.

## Selection record

Record chosen direction/revision, accepted combinations, requested changes, review role, and unresolved questions.
If an accepted concept already exists, use it rather than generating alternatives as ritual.
If choice is delegated explicitly, make and document the choice within that authority.

## Translate to a buildable specification

- Define proportional layout, minimum spacing, safe areas, size limits, typography roles, and responsive changes.
- Map visible objects to existing components or required art; verify the component actually matches the concept.
- Preserve connected shapes, joins, edge treatment, material, and row layout.
- Separate frame, portrait, fill, text, and masks where useful; test layering and clipping with live values.
- Use live rendering or modular parts when the displayed subject changes; validate several actual variants.
- Plan loading, missing data, empty content, long text, and error cases that the screen can actually reach.
- Define navigation order, default focus, cancel/back behavior, binding labels, and confirmation needs.
- Define entry/exit motion, input availability during transitions, and pause-compatible timing.
- Inventory audio feedback and mix priorities; reduced motion must preserve focus and state feedback.

Check this: a separately produced kit can drift in silhouette or material from the selected concept.
Compare the kit element with the concept crop before wiring it into the screen.

## Rendering checks

Inspect final displayed size and enlarged crops for jagged edges, blur, halos, and unstable fine detail.
Choose texture resolution, filtering, mipmaps, vector/SDF treatment, or slicing according to the asset and UI path.
Do not enable a blanket import setting on every UI asset; verify the resulting downsampling and edges.
Keep alpha edges clean and test against bright and dark backgrounds.

Unity: verify UI Toolkit or the existing canvas system's scale, layout, text rendering, and draw order.
Unreal: verify UMG layout, DPI scaling, brushes/materials, text rendering, and draw order.
The selected concept specifies the visible result; engine defaults are not proof of fidelity.
