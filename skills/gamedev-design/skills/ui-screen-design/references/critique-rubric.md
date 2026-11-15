# Side-by-side critique and completion

## Compare fairly

Capture the actual player-facing screen at the selected state and target viewport.
Record build and concept revisions, input/settings, content variant, and text scale.
Show the whole concept beside the whole capture, then equal-scale crops of important objects.
Review the first glance, settled state, interactive states, and entry/exit motion.

Check this: if a composed screenshot shows a missing or translucent layer that is correct in play,
compare with a direct game-view capture and inspect capture timing/composition before editing the screen.
Do not discard edge-anchored UI by comparing only a convenient central crop.

## Rubric /20

Score 0 = missing or materially wrong, 1 = a specific weakness, 2 = supported by the captures and behavior.

| Dimension | Evidence for 2 |
|---|---|
| Focal point | The brief's chosen element wins the first glance |
| Hierarchy | Primary, supporting, and action information have distinct roles without unnecessary levels |
| Grouping and spacing | Relationships, margins, alignment, and empty space explain the structure |
| Contrast and legibility | Required text and controls read across supported backgrounds and text settings |
| Ornament discipline | Decoration supports focus, shape, and identity without competing with information |
| Visual identity | Typography, form, palette, material, and behavior agree with the host game's style |
| Emotion | The intended moment registers at thumbnail scale and without relying only on sound |
| Content | Ranked inventory is present and accurate, with no implementation text or redundant instructions |
| Concept fidelity | Layout, perceived objects, joins, edge quality, and surface treatment match accepted intent |
| Next action | The intended continuation is discoverable, reachable, and correct across supported inputs |

Pass target: **16/20 or higher with no zero**. A high total cannot override a broken primary action,
unreadable critical text, or an unresolved required concept mismatch.
Record the two weakest dimensions and the first concrete improvement for each.

## Fidelity is a shape and behavior check

For each important object, compare:

1. Silhouette: one coherent object, separate parts, negative space, relative mass.
2. Joins: how frame, portrait, bar, label, and ornaments connect.
3. Corners and edges: curvature, thickness, smoothness, aliasing, clipping.
4. Surface and colour: material response, texture density, shading, palette, contrast.
5. Typography: family role, weight, spacing, line breaks, alignment, and actual localized text.
6. Internal layout: labels, values, icons, fill direction, masks, and row rhythm.
7. Motion/interaction: order, timing, focus, pressed state, disabled state, and feedback.

List differences before assigning fidelity credit. Fix blockers; record approved interpretations and
nonblocking deviations with rationale. An unresolved required difference scores 0 for fidelity.
Do not claim a match solely because measured width, height, and average colour agree.

## Functional and finish gates

- Complete the primary and alternate actions with every supported input device.
- Check default focus, focus movement, pointer hover, press, disabled state, back/cancel, and focus restoration.
- Verify binding labels come from current bindings, not hard-coded examples.
- Test supported aspect ratios, safe areas, localized lengths, text scaling, and difficult backgrounds.
- Check contrast, speaker labels where needed, colour-independent information, and reduced motion/flash.
- Verify UI timing while gameplay is paused, loading, or changing state.
- Listen to navigation, confirmation, opening/closing, and any deliberate silence in context.
- Check live data, absent/empty values, rapidly changing values, and settings persistence where applicable.
- Review actual transition input behavior; do not let a decorative delay silently eat an action.

Treat text pixel sizes and transition durations as design targets chosen for viewing conditions.
Validate them at delivery size instead of prescribing one size or easing curve for every screen.

## Review packet

```text
Brief and selected concept: [revision, selection role/record]
Build and capture conditions: [state, viewport, input, language, scale]
Score: [10 dimensions with evidence, total /20]
Weakest two: [dimension, consequence, proposed fix]
Differences: [category, blocking/nonblocking, correction or accepted rationale]
Interaction/accessibility: [checked states and results]
Motion/sound: [clip and observed result]
Unverified: [states or devices not tested]
Completion decision: [ready / revise / awaiting explicit decision]
```

If screens reuse a template, assess each purpose separately. Different moments may need different
emphasis, pacing, or content even when their components are shared.
