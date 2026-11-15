---
name: gear-fitting
description: Dress a bare game character with an outfit and worn gear and prove it fits — fit a ghost-mannequin garment onto the base body, smooth it, skin it to the same skeleton, mount rigid gear (helmet, quiver, shield, held weapon) on its bones, hide covered body parts by bone. Then check with numbers and renders that no body shows through in any clip, the cloth rests naturally and held gear clears the body. Use whenever clothes, armour or gear go on a body.
---

# Gear fitting — dress, then check

A character is built bare, and its gear is mounted on it. The body and the skeleton are shared by every outfit; an
outfit is fitted to them and checked against every clip. For plate armour, fit the outfit here, then rig the plates
with the `armor-rigging` skill.

## 1. The rules

- **Make bodies bare and mount the gear.** Rigid gear rides one bone. Soft gear is fitted and skinned to the same
  skeleton.
- **Never move or edit the body to fit the clothes.** Every fix is on the clothes, because the body is shared.
- **Nothing of the body comes through the clothes.** Check it every time, in numbers and by eye.
- **Clothes rest naturally and make sense**: no ballooning, no dents, hems and cuffs where the garment has them.
- **A hand that holds something closes round it.** Give the rig fingers and a thumb, make a fist in every clip, and
  mount the weapon in the fist's grip bone, never on a flat hand (`character-animation` skill, `references/rig.md`).
- **What is hidden is decided per outfit; the body never changes.**
  - Each outfit lists the bones whose skin it covers.
  - The engine draws the shared body without the vertices owned by those bones (equipment slots).
  - A vertex is hidden when ≥ 50 % of its weight is on covered bones (check this). Use the same rule in the 3D tool's
    checks and in the engine.

## 2. Fitting soft gear (clothes)

1. **Prepare both meshes.** Weld duplicate vertices and make the normals consistent before any inside/outside test.
   Generated meshes often import as triangle soup and give thousands of false pokes. Move nothing.
2. **Read the body at REST.** Set the rig to its rest pose, or read the bind pose, for fitting and weight copying. A
   skeleton left in a clip's pose gives cloth the wrong bones' weights (side panels taking the forearms' weights,
   flapping off the hips in the walk).
3. **Fit the outfit to the body.**
   - Align it by landmarks (neck, shoulders, wrists, waist, knees, ankles), and fit the feet.
   - Push the cloth out of the skin along the skin's normal to a small offset.
   - Smooth where it was pushed.
   - Wrap what still shows.
   - Never use Laplacian smoothing with volume preservation: it rescales the whole mesh.
4. **Loosen at the joints.** Add more cloth where the body bends (armpit, elbow, groin, knee).
5. **Wrap covered regions** to a small standoff (~1 cm, check this) where the body still comes near.
6. **Skin like the body.**
   - Transfer the body's weights to the cloth using "nearest face, interpolated". Projecting along the cloth normal
     measured worse.
   - Then clean the weights: drop influences below 0.1 and keep at most 4 per vertex.
   - Smoothing the weights leaks every bone a little everywhere (the head's onto the shoulders); clean after smoothing.
7. **Mind the modifier stack.** A modifier applied after the Armature bakes the skeleton's current pose into the mesh
   and moves every cloth vertex. Move fitting modifiers ABOVE the Armature before applying them.

## 3. Rigid worn gear (helmet, quiver, shield)

Fit worn rigid gear in the 3D tool like the clothes, then bind it to its bone. Never place it at runtime from
bounding boxes: a helmet ends up tipped and floating, and a strap goes through the chest.

Per piece: `references/worn-gear.md`.
- **Helmets**: level the rim first, seat the skull in the hollow, and put the rim at the brow.
- **Closed helms**: the edge stops at the neck.
- **Quivers**: thin to a real girth, diagonal on the back, the strap a band cut from the outfit's own surface.
- **Shields**: held upright by the grip in the fist.

Then list the pieces on the character after its outfit, and attach them by bone name in the engine.

## 4. Held gear (weapons, tools)

- **Export each held piece** straightened along one axis, with its grip at the origin.
- **In the engine**, attach it as a child of the grip bone at zero offset, rotated only by the file's axis
  conversion.
  - An instantiated character shows the file's LAST pose, not the bind pose. Place held gear in the grip bone's own
    space, never "as in the T-pose".
- **Keep real proportions.** A spear is ~1.9 m and thin; a generator often draws it thick and short.
- **No held piece goes into the body in any clip.** Sample the piece from butt to tip in every frame of every clip
  that carries it, and test each sample against the body. Pass: 0.
  - Carry clips hold a long weapon tilted forward ~30° (check this), so it clears the swinging arm and the striding
    leg.
  - A one-hand thrust keeps the fist out by the hip.

## 5. The checklist (every dressed character, before export)

1. **Clipping, in numbers.** Count body vertices that show through the cloth, at rest and in frames of every clip
   (idle, walk, run, every attack, hit, death). A vertex is "visible" when it meets three conditions:
   - it is covered skin (not head, neck or hands unless the outfit covers them);
   - there is no cloth straight out of it along its normal;
   - it has a clear line to one of the game camera's directions.

   Target 0 at rest, and report the per-clip numbers honestly.
   - **Confirm before fixing.** Confirm a point counted inside with ray parity before moving anything for it; the
     nearest face's sign alone is fooled by faces turned inward.
   - **Locate the count** (which part, how deep) before choosing a fix.
   - **Expect some residue.** A rigid piece riding one bone over a joint whose other side moves on its own (a
     pauldron on the upper arm over the collarbone) keeps what lies under its inner edge. Look at the render before
     chasing that number.
2. **Clipping, by eye.** Paint the body red and the cloth grey. Take screenshots at rest (front, side, back) and at
   the worst clip frames from the game's angle. A number without a look is not a check, and a look without a number
   is not either.
3. **Rest of the cloth.**
   - No ballooning: compare the dimensions before and after fitting. The outfit may grow a few cm, never tens.
   - No dents or ridges where it was pushed.
   - Hems and cuffs where the garment has them: cuff over the wrist, boots enclosing the feet, collar at the neck
     (not over the mouth).
   - No floating slivers.
   - Boots at least as wide and long as the feet.
4. **Anatomy in the clips** (the dressed body must still pass the `character-animation` checks):
   - hands below the shoulders at idle;
   - stance feet planted;
   - elbows and knees bending one way only;
   - wrists inside their range, and the forearm's turn inside its range without flipping sign between keys;
   - every hand target within reach;
   - a two-handed weapon's second hand ON the shaft.

   Look at the extreme frames with the weapon in the fist, and at the hands in close-up.
5. **Grip.** Every hand that holds something is a fist round it in every clip, and carry clips hold the item upright
   (forearm forward, elbow ~90°). A hand busy with another item (a light, a shield) never joins a two-handed blow.
6. **Held gear clearance** (§4) is 0.
7. **Only then export.** Bring the character into the engine, render it there in its clips, and state the numbers in
   the report.

## 6. Pitfalls (each one an instruction)

- **Inside/outside tests**: nearest-surface tests fail where cloth folds into cloth (the armpit). Test visibility
  along the skin normal and from the camera directions instead. Generated shells are rarely manifold, so read
  inside/outside by distance and ray parity, never by their normals.
- **Shoulders and armpits**: residual pokes in animation cluster there when the arm moves a lot. Widening the cloth
  helps only a little; the body mask (§1) is what removes them.
- **In-betweens**: check every frame between the keys, not just the keys. Euler in-betweens can fold an upper arm
  through the helmet between a high wind-up and the blow, crushing the pauldron.
- **Exported textures**: an export's main texture is often the FIRST material's. Joined pieces that keep their own
  materials need each texture exported under its own name.

## Open

- Layered garments (shirt under coat): an order of fitting and a check of layer against layer.
- Cloth simulation in the engine versus baked skinning: when each is worth it, and how to check a simulated hem.
- The 50 % mask rule and the ~1 cm standoff on more bodies.
- Scripts for the visible-clipping count and the held-gear clearance.
- Hair, capes and long skirts against the legs in a run.
