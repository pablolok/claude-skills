# Reference images: clean, per piece, audited

Part of `concept-to-asset` §1. Image generator options and their caveats are in
[image-to-3d.md](image-to-3d.md#tool-options).

## The request

- **One new request per asset.** Attach the concept's own crops of the subject first (the views that show it,
  close-ups of the part), then the prompt. Several sheets for one body can share a session, which tends to keep the
  style.
- **Name the distinctive features in words.** Without them the generator draws the generic animal or object. In one
  case a head came back as an egg with a fish face three times, until the prompt described the shell's rim: where it
  starts, where it runs and where it ends.
- **State the shape the use needs.** For a worn piece, say how it is open: "an OPEN shell, open underneath where the
  arm comes out and on its inner side toward the neck". A type name alone ("a pauldron") returns a closed generic.
- **Name the proportion as a number when it drifts**: "the ribcage is a barrel, width 0.9 of its height". One
  corrective prompt with the ratio fixed what several descriptive ones did not.

## Layouts

| subject | ask for | then |
|---|---|---|
| a prop | one object, 3/4 view, plain mid-grey background, flat light, no shadow, "ONLY the <object>", bare (no plants or moss as geometry; moss only as colour) | key, generate |
| many props | a 2×2 grid, "each centred in its own quadrant, wide empty gaps" | split into four, check each |
| a body piece | a turnaround: front, side, 3/4, back in one row, same scale, orthographic, flat light, no shadow, no text, each view in its own cell with a wide gap | split, check the gaps |
| a rigging pose | bipeds in T-pose (or A-pose with clear space); quadrupeds legs straight and apart | |
| worn gear | the piece alone as worn, as a "ghost mannequin" view | fit on the bare body |
| a tiling material | "a seamless tileable square texture of ONE surface seen straight from above, no outlines" | make it seamless anyway (offset and blend the edges) |
| a trim sheet | horizontal strips of the material (a stitched strap, a riveted band, a worn edge) | make it seamless across only |
| a turn of the subject | see below | |

**The pieces a body carries are drawn as short stubs cut flat** on the parent's sheet. They say where and along
which axis the child piece leaves, and become the sockets.

**Bare body, gear separate.** One base body per species. Clothes, armour, weapons and riders are their own assets.

## Subjects generators handle badly

- **Metal through flesh** (a ring through a fist, keys grown from knuckles): generate the parts separately (the bare
  fist, the ring, the keys) and join them in the DCC, modelling the skin round the metal there. Asked whole, image
  generators may refuse or drop the image, and image-to-3D draws a hand holding the object.
- **Gore and undead**: ask for an unpainted clay sculpt ("a clay render, only the shape: I paint it"). Generators
  tend to refuse realistic rot, and the shape is all an image-to-3D generator needs; the paint is yours.
- **Repeated hardware** (chain links, rings, rivets): generate one and repeat it by code.
- **Things that swing** (keys on a ring, a lantern on a hook): each part its own image, never one fused bunch.

## A turn of the subject (a rotating preview)

- Ask for **a 3 × 3 grid of nine equal square cells separated by thin dark lines, each cell one frame of the subject
  turning about its vertical axis, 45° per frame, row by row**: front, front-left 3/4, left profile, back-left 3/4,
  back, back-right 3/4, right profile, front-right 3/4, front again. Attach only the subject.
- Cut the cells and assemble them into a GIF and an MP4 (MP4 plays everywhere; GIFs don't on every phone).
- Asked for "a GIF" directly, generators tend to return one still or rotate the image in 2D.
- The 3/4 views and small parts (counts, small details) drift between cells. Audit the grid like a turnaround.

## The audit (before generating any 3D)

Put each view beside the concept's same view at the same zoom. Write down:
1. **What it added**: a body segment behind the head, an extra strap. Cut it in 3D, or prompt it away.
2. **What it lost**: a hood, a rim, a marking.
3. **Proportions as numbers**: width ÷ height of the piece, and part-to-part ratios, against the concept's.
4. **Orientation and count** in every view.

Then check **the views don't touch**: split the sheet, and check a band of backdrop separates every pair of neighbours
across and down (start from about 3 % of the sheet's size). Touching views (an A-pose hand reaching into the next
view) are not clean views. Generate the sheet again.

**When the concept draws no front, side and back**, a generated turnaround becomes the generator's input only after
its proportions are audited as ratios against the concept. An unaudited turnaround is rebuilt in 3D with its own
errors.

## Files

- When an agent or CLI tool generates an image, copy the output file by its path into the work folder. Never pass
  the image through a command line as base64: large payloads fail on some shells.
- Keep the reference that was used in the repository beside the concept, and remove the one it supersedes in the
  same commit. A reference made later in the work (a realistic repaint over your own render) goes in the day it
  becomes the target. A stale sheet left in the repository looks like the answer to the next person.
