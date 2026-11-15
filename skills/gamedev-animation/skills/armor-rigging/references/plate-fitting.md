# Fitting plates authored apart (Route A)

Games model each plate as its own mesh. When everything is baked into one mesh too early, the character becomes
harder to rig, skin, customise and animate.

## 1. Measure the body, then make the plates to it

For each tube-shaped segment (upper arm, forearm, thigh, shin) measure:
- the length along the bone;
- the skin's width and depth at a few stations;
- their ratio, width over length.

A stocky body wants a rerebrace about as wide as it is long, and a greave half as wide as it is long. A plate drawn to
a textbook's slim proportions (a hollow 0.15 of its length) cannot fit a limb that needs 0.6-0.9 without being bent
(check this). Put the measured ratios into the drawing brief or the prompt.

## 2. The exploded sheet

- **Every plate alone and apart**: pauldron, rerebrace, couter, vambrace, breastplate, backplate, fauld with
  tassets, cuisse, poleyn, greave. Gauntlets and sabatons can come from their own sheets.
- **One side only.** Mirror the other.
- **Each plate seen as worn on the right side**, in the bind pose's orientation, empty inside.
- **Cloth** (tabard, gambeson) on a separate sheet in the ghost-mannequin style: the garment's shape with no body and
  no plate.
- **Split the sheet into one image per piece.** Generate each piece's shape from its image, then paint each piece.

## 3. Fit each plate like a helmet

1. Align the piece's long axis to its bone.
2. Size it so its hollow holds that segment's skin, plus the under-layer, plus a gap of a few mm.
3. Bind it 100 % to its bone, or to its helper bone.
4. Mirror it for the other side.
5. Check its neighbours for overlap at the joints, the upper over the lower.

## 4. Sizing without deforming

Size a plate the way an armourer makes one to measure. The allowed operations:
- rotate;
- move;
- scale along each of the piece's own three axes (length, width, depth).

Under these, straight lines stay straight, and rims and rivets keep their shape: nothing bends or crumples.

Avoid both extremes:
- **Per-vertex conforming**: the plates crumple and the caps tear.
- **One uniform scale only**: drawings are usually slimmer than the body, so a piece scaled until its hollow fits
  comes out far too long.

Keep the section's scale within ×3 of the length's scale, and LOOK that the rivets and rims don't read stretched.

**Shape-error check.** Find the best affine transform from the drawn piece to the fitted piece, apply it, and measure
the remaining per-vertex distance. Pass: < 1 mm. This proves the piece was sized, not deformed.

## 5. The pose a piece is drawn in

A pauldron is drawn for an arm hanging down, but the body's rest pose is usually a T or an A.
- **Fitted in the T** (lames along the horizontal arm), its helper bone then turns it the wrong way in the idle, and
  it hangs in front of the chest.
- **Instead**, place pieces that ride a helper in the pose their drawing shows, usually the idle with the arms down,
  where the drawing's up and down are true. Then carry them back to the rest pose through their bone's posed matrix
  (the inverse of the posed bone matrix times the rest one).

The same applies to a shield strapped to the arm, and to anything else drawn as worn.

## 6. Hands and feet

- **A drawn gauntlet (a fist) never fits a hand that is open in the bind pose.** Make the plate hands instead from a
  copy of the body's own hand skin, thickened and given a steel material.
- **Give the gauntlet a cuff** running up the forearm under the sleeve. Ending at the wrist, its open mouth shows
  between sleeve and hand, and with back faces culled the engine draws the fist as a crown of spikes.
- **Sabatons are rigid pieces on the foot and toe bones**, pushed out of the foot and split at the ball. On the foot
  bone alone, the front lifts 6-11 cm when the toes bend.
- **Trim the outfit** at the wrists and ankles where the plate hands and feet take over.
