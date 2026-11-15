# Worn rigid gear — helmets, quivers, shields

Fit each piece in the 3D tool against the body and its clips, bind it to one bone, and check it in every clip.

**Pass for every piece**: no points of the piece inside the body, or inside the outfit's other pieces, in any clip.

## Helmets

**An open hat** (a kettle hat, a cap):
- **Level the rim first.** An image-to-3D generator working from a low three-quarter view gives a tipped mesh, often
  by tens of degrees.
- **Seat the skull in the hollow**, with the rim at the brow line.
- **Squash a deep bowl** along its height rather than let the rim come down over the eyes. Generated bowls are often
  deeper than a skull.

**A closed helm**:
- Fit the head inside it, above the chin.
- Its lower edge stops at the neck, never at the shoulders: pauldrons rise into it in a swing.
- It must be at least as wide as the head; a helm narrower than the head, sitting high over the chin, reads as
  floating.

**Binding**: 100 % on the head bone. For an open hat, a skull bone works if the rig has one.

## Quivers and back-carried tubes

- **Thin it to a real girth.** Generators often draw quivers far too wide. Measure the tube's clearance from
  its own axis; lay the straps and buckles on the cloth afterwards.
- **Place it diagonally on the back**, its mouth toward the draw hand's shoulder.
- **Weight it along the spine.** The foot hangs by the hips, so weight it from the spine (at the foot) to the chest (at
  the mouth). Bound to the chest alone, a hit reaction swings it into the buttock.
- **Hold it on with a strap cut from the outfit's own surface**, as a band that lies on the chest in every clip. A
  separate strap mesh floats or sinks.

## Shields

- **Hold a shield upright by its grip in the fist**, on the hand or grip bone. It hangs by the side in the idle, and
  comes forward in the walk and the blow.
- **Don't strap a shield along the forearm when the idle arm is held well out from the body.** A strapped shield then
  either puts its top into the pauldron or stands off the arm like a wing.
- **Fit a shield drawn as worn in the pose it is drawn in**, then carry it back to rest through its bone's posed
  matrix. The same holds for pauldrons (`armor-rigging` skill).
- In a blow, the shield (or the off arm) comes forward as the counterweight.

## Gauntlets and footwear on a dressed body

- **A drawn gauntlet (a closed fist) does not fit a hand that is open in the bind pose.** Make it from the hand's own
  skin, thickened, with a cuff up the forearm under the sleeve.
- **Boots and shoes are at least as wide and long as the feet.** A slim boot leaves the little toe out.
- **Trim the outfit at the wrists and ankles** where the rigid hands and feet take over.

## In the engine

- **List the worn pieces after the outfit** on the character. Attach each by its bone name.
- **The material names map to the engine's shaders** (steel, mail, leather), so name them consistently on export.
- **Render the dressed character in the engine**, in its clips. Some 3D-tool previews do not draw alpha-cut materials
  (a scarf, a fringe) at all.
