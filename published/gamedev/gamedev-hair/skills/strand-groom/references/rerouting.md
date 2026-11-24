# Re-routing strands that already passed review

A re-route moves part of an accepted groom (a lock turned, a part reshaped). What was accepted must not move with it.
Each check below compares the new export against the accepted one.

## Draw rank and occlusion

- **Keep each strand's draw rank and its occlusion profile from the accepted groom.** Carry the rank as it was; resample
  the occlusion profile at the same arc fraction onto the new points. An exporter that recomputes either reorders the
  strands even where positions did not change.
- One case: the rank of some loose locks went from .48 to .86, so they drew over the light locks and a dark stripe
  appeared on a part of the lobe that had not moved. Restoring rank and occlusion removed it; restoring the occlusion
  alone explained about nothing.
- Read every strand's rank shift against the accepted export, not only the re-routed strands'
  (`strand-rendering` references/ribbons-and-coverage.md, the draw order).

## Baked shading normals

- A normal read from the old mass's envelope is not outward at the new path. In one case half of the moved samples
  pointed away from the skin's outside, and the part read as a smooth dark slab.
- **Test the share of normals more than 90 degrees from skin-outward**, per part, against the accepted groom's share.
- **Correct by blending toward a smoothed skin-outward normal** (65 % in that case). Hold back the areas that must
  stay dark, and make the blend short (about 8 mm) after the turn. Full skin-outward overshot the reference and
  lightened the dark corner.

## Stale strays

- Flyaways rooted along the old route float after it moves. **List those whose visible part is more than about 6 mm
  from any hair of the region the piece owns**, and drop or rebuild them.
- Restrict the test to that region: a whole-side test flagged 164 strays where the region held 18.
