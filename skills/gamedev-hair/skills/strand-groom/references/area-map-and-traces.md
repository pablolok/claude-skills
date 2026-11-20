# The area map, the traces, the bare borders, and growing the whole groom

What to build before the first strand of a reference-driven groom, and how each later piece is gated. The reasons
are one-line; "one case" numbers are starting points.

## The area map (once, for the whole groom)

Build the map of the reference's areas before working area by area: the groom's mental model, defined up front.

- **Two maps with the same named areas, matched area by area.** Draw the areas on the reference from its own evidence
  (painted features, flow steps, the hair mask, bare skin). Draw the same named areas on the model from its own
  anatomy (landmarks), each border following the same anatomical rule. Carry the reference's targets inside each area
  through that area's own correspondence, fitted on its borders. Never project one map onto the other picture: a
  reference painted with a different face, a lower mouth or a longer jaw is then handled where it differs, and
  nowhere else (one case: the projected map put the under-lip and chin too high and threw the throat over the
  reference's bare neck; a single shear stopped 45 mm under the lip).
- **Each area is defined on the skin in 3D (its roots)**, so one definition holds in every view. It carries its flow
  per view, its tip line (length), its volume, its density and its owning part.
- **Transition strips** cover the seams between areas (a thin strip over a fade and its neighbour).
- **Every area has an owner part.** List each area with the strands that draw in it, kept old strands included,
  before tuning any part's guides: kept strands nobody remembers can hold the defect (one case: 113 kept strands
  standing 45-70 mm forward alone held a profile standoff that no guide change moved).
- **Mark the bare features beside each area** (nose, lips, eyelids) with the reference's gap in mm. Gate both where
  roots sit and where every strand point goes, from the first round: a strand rooted below can still rise over the
  feature (one case: a moustache passed standoff, hole and outline rows while strands covered the nostrils).
- **Each area's root polygon lies inside the reference's hair in every trusted view.** A root outside the outline
  disarms the tip and outline rules, so its strand runs to maximum length (one case: a border 9-14 mm behind the
  hair's rear edge ran 77 strands 120 mm past the ear). Drop or re-root roots outside it. Gate strays as the share of
  an area's strands outside its own outline (the reference read 0.4-2.9 %).
- **Split one hair class from another by connectivity and flow, never by a straight image row**, and ask which part
  owns a zone's missing mass before chasing it with that part's roots (one case: scalp hair hanging past the ear
  counted as beard under a row cut; five builds chased it with beard roots).

## The reference's traces

Trace before building, and trace ours the same way to compare.

- In every view, trace the reference's visible locks as polylines: where each starts and ends, its length and width,
  its course. Pair them across views. Build the guides from these traces, authored by the agent from the traced
  outline, direction field and tip lines; the art owner is never asked to draw guides.
- Trace our guides and strands the same way, and compare trace against trace, view by view. The offsets, length
  errors and course errors are the defect list. Run it on every zone, not only the one under work, and add a density
  map per zone and view (hair coverage against skin showing, at the reference's pixel): sparse patches are part of
  the shape (one case: the chin and under-lip were never traced; ours was uniform stripes and an even dense cover
  where the reference had gaps and two sparse patches).
- **The traces decide over a drawn outline or mask**: when they disagree, correct the outline along the traces. Never
  gate as a defect a shape the reference shows (one case: drapes traced down to the chin were gated as a
  "horseshoe" defect because the outline stopped at the lip).
- If the strands are cut to a share of the guide arc, set the guide lengths so the tips land on the tip line.
- Every guide knot needs a target in each view where it shows. A knot only one view constrains hangs free in the
  others (one case: an end knot took a profile heading only and projected over the lip at 45 degrees; three scalar
  ladders missed it because none moved that knot).

## Growing the whole groom

- **Grow every area along the reference's traced flow from the first build**; never leave an old base's strands in
  the areas not yet worked (one case: cheeks kept an old base's random directions beside a guide-built moustache).
  Trace the flow over the whole reference, grow all guides as streamlines of it to each area's tip line, then
  refine section by section on a base that already follows the reference everywhere.
- **Prove the field before growing from it, and freeze the gate before the new groom exists.** Read the flow on the
  reference directly where registration was measured, and carry it only where the faces differ (one case: carrying a
  flow across doubled the left-right difference, 9 to 18 degrees). Reproject the 3D field into every view and list
  which views constrain each area; an area seen in fewer than two trusted views takes its shape from its outline, tip
  line and volume. Write the rows and limits in a file before the first output, and prove a new method on one area
  before the whole groom.
- **Gate a regrow on direction, shape and length together**: flow rows per area and view (mean direction, spread and
  coherence, the share of strands far off), shape rows (IoU, area ratio, edge), hull mass and height off the skin
  per zone, and each area's length against its tip line. Direction passing alone is not a pass (one case: 13 of
  13 flow cells passed while IoU fell from 0.85 to 0.67 and the jaws held no strand).
- **Before deleting a part, list each area with what remains in it.** An area left with no strands is regrown in the
  same piece, or the deletion waits.
- **Gate strays in profile** as spread and coherence per area, not only the mean: "loose" strands were often a
  moustache's own strands fanned out (spread 113-117 degrees against the reference's 69-77, coherence 0.40-0.43
  against 0.62). Add the count of strands out of the outline as a second row, with the reference's own count as the
  target.
- **A row that trades monotonically against another across many tunes points to the target or a missing term, not the
  knob.** Score the reference's own hull with the gate's mask rows first: if no shape passes every view, the target
  contradicts itself (SKILL.md §0.5). One case: a push-out floor traded front IoU against side over-reach over about
  33 tunes; most of the "missing" mass lay outside the reference's hair in some trusted view.
- **Wire the growth terms the hull rows need on every growth path** (hang, a margin law): in one case they were wired
  on one part only, and the others' mass stayed 18-41 % under the reference.
