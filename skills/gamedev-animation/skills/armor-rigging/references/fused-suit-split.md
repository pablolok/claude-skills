# Splitting a suit generated as worn (Route B)

Use this when a generator gives the whole outfit as one fused surface with the plates only painted on. The shapes
already fit this body; what they lack is the cuts. Split the surface into a real harness's pieces by POSITION and
move no vertex: the plates cannot deform by construction.

**Why not by paint.** A colour mask that tells plate from cloth by paint is usually wrong: it misses most of the
metal, reads dark plate as cloth and painted shadows on cloth as plate. If you must use a mask, look at it before
using it.

## 1. Joint helper bones in the rig, posed by the bake

| helper | follows | parent |
|---|---|---|
| couter | ½ of the elbow's swing | upper arm |
| poleyn | ½ of the knee's swing | thigh |
| pauldron | ~0.45 of the arm's swing (check this) | clavicle |
| tasset | ½ of the thigh's swing | hips |

- Leave the twist out: a couter does not roll with the forearm.
- Pose the helpers in every frame of every clip, and key them like any bone, so the engine just plays them.
- Rebake all clips after adding them.
- Check: couter and poleyn at exactly half the joint, 0 mm off the joint, in every frame.

## 2. Open the joints' hollows

- Find each joint's flexion side from the clips (the side the joint closes toward).
- Delete the plate on that side: inside the elbow, behind the knee.
- Kept rigid, that plate folds through itself in shards at a deep knee (~113° in a run).

## 3. Split the suit into pieces

1. **Assign each face to the segment it is nearest to**, then **along that segment to its piece**:

   | segment | pieces |
   |---|---|
   | arm | pauldron from the shoulder JOINT outward; then rerebrace, couter, vambrace |
   | leg | cuisse, poleyn, greave |
   | trunk | the cuirass on the chest; the belt and fauld on the hips; the waist at about a quarter of the spine |

   - Medial of the shoulder joint, pauldron plate turns up in spikes when the arm hangs down.
   - The vambrace rides a forearm twist bone that carries about a third of the roll.
2. **No distance limit.** Plate can stand 9-20 cm off a bone, and a limit leaves the arms as sleeves.
3. **Slice with a plane** across the segment at every seam. Cut face by face, a generated mesh gets saw-tooth edges
   that read as shards when the pieces part.
4. **Tidy the islands.** Small islands of a piece (< ~40 faces) join the piece around them; loose slivers under ~15
   faces are dropped.
5. **Tuck each piece under its neighbour.** Each piece reaches ~3 cm under its neighbour: a copy of its faces, tucked
   ~4 mm inside, with its far edge sliced straight too. Copies made by growing rings of triangles stick out ragged.
6. **Bind rigidly.** Every vertex of a piece is 100 % on its bone or helper.
7. **No blended band between pieces.** One to three rows of blended "lames" tear into streaks at a raised shoulder
   and a turned waist.

## 4. Sabatons

Run the same split on their material: the foot and the toe cap part at the ball.

## 5. Keep the tabard as cloth

- **Below the belt**, mark as cloth what is clearly cloth: its saturated colour, grown a couple of rings over its
  trims, plus the middle panels by position.
  - By position alone, a wide front panel's sides go to the tassets and cuisses and break into plates in a lunge.
- **Keep the cloth on the weights it took from the body.** Re-weighting it to hang from the belt, or from panel bones
  pushed by the thighs, tends to put the knee through it or fold the hem over itself. Compare the options side by
  side before choosing one.

## 6. Mail under

- Copy the body's skin, push it out ~4 mm, and keep it over every plated bone and over the head (a coif under the
  helmet). Wherever plates part, mail shows.
- Name its material so the engine maps it to a metal shader.

## 7. Check, then export

Run the checks in the skill's §8 on every clip and every profile bake, every 3rd frame at least. Then look at the
close-ups with each piece in its own colour, in the 3D tool and in the engine.

Export:
- **the body**: it carries the new bones and the rebaked clips;
- **the outfit**: rigid pieces, cloth and mail.

The export's main texture is often the FIRST material's. When pieces keep their own materials after joining, export
each material's texture under its own name, or the whole suit takes one piece's colour.
