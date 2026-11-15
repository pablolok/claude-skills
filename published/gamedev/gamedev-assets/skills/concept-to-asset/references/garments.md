# Worn gear and garments: shape, fit, motion

Part of `concept-to-asset` §6. [src] means a source states it (list at the end); [inf] marks practice or inference
from a few assets, so check it.

## Fit

- **Size a worn piece by the concept's own piece** (its width measured on the same-scale crop), never by the body
  under it. A scarf sized to the ribcage came out 30 % small, and every push onto the bones after that pressed it
  into a film. [inf]
- **Centre it by its symmetric part** (a helmet's dome), never its whole bounding box. A 3/4 take's lopsided cheek
  guards put one helmet's crest and nose guard off centre. [inf]
- **Score a fit search by the concept's measures** (its top, its widths at a few heights). Report clearance counts,
  but don't optimise them: they jump between nearby sizes, and their lucky minimum was a helmet sitting too low. [inf]
- **A rigid piece drawn for the concept's body is fitted whole**: search small turns and moves about its joint for
  the fewest points inside, and keep the result as a constant. Bent point by point, plates crumple. [inf]
- **A plate over a joint (a knee or elbow plate) is made, not taken**: its front outline from the concept, its rim on
  the smooth surface that clears the bones with the joint swept through its bend, a dome rising inside a brim, a
  rolled rim, rivets. A take squashed to fit reads as an egg. [inf]
- **Cloth over the shoulders rides the collarbones** on a wide smooth ramp, only over the shoulder (onto the arm it
  stretches badly), fitted clear of the arms as they hang, and cut only where the arms sweep. [inf]
- **A strap's square edge is judged on the baked low**, never in clay at high density, where it looks rounded. [inf]

## Garment shape: the generated garment is the high

When the concept draws the garment, its generated take holds the concept's folds, layers, torn hems and holes.
Garments invented by code (pattern pieces draped by a cloth sim, tears from a procedural mask) read improvised beside
a concept that already draws them. Keep the made route for what no sheet draws.
1. **Reference and take**: the garment alone as worn, front view → image-to-3D, kept dense as the **high**.
   Decimated it tears into shards: it is never the game mesh.
2. **The low is a shell over it**: rays from outside toward the body's axis find its outermost surface; a smoothed
   envelope bridges the gaps between layers; a quad sheet on it, UVs across and down. Split it into panels at the
   deepest notches between tatters, each panel on one bone. A panel the concept draws whole (an apron) is kept out of
   the cuts: the take invents notches. Judge panels on the concept as worn, not on the gear sheet.
3. **Fit by moving shell and high alike**, one smooth field, so the bake between them holds. Each row stays clear of
   the bones' convex section (leather bridges hollows). What an arm sweeps through is cut.
4. **Bake** colour, normal (the folds), the high's occlusion and **opacity where a ray met the high** (outline, gaps,
   holes). Torn edges go in the alpha, never as geometry teeth [src]. Short rays: deeper, the far side fills the gaps.
5. **Paint as a painter does** (values first, then a ramp from the concept's pixels; see [surface.md](surface.md)).
   Roughness set explicitly (leather around 0.85 as a start).
6. **Replace what the reference hides**: where a made piece covers the take's (a belt ring), drop the take's piece
   and what the generator invented behind it, and put a plain sheet a few mm under the envelope.
7. **Check whether straps and bands should be made, not taken**: in one case a take fused them with the cloth under
   one shell, at twice the width. There the take was cut at the concept's hem and the straps made at the concept's
   measures. [inf]
8. **Measure the hem and straps on the concept at the model's scale** before judging. Render take, shell and game mesh
   apart: a judge's "waistcoat" was the straps' width and the shell, while the take's hem matched.

**Wound leather** (bracers, leg wraps) is made [inf, one body; ribbon straps are the common game practice]: a
generated wrap came back as a closed tube with no bone showing between its straps.
Build it on the limb's taut section (the convex hull of the bone's surface per row, smoothed): bands as rings, straps
as crossing helices, each thickened outward at the concept's thickness, painted along a trim sheet. Metal splints are
plates laid over the bands.

| need | how games do it [src] |
|---|---|
| folds, layers, torn hems | sculpted or simulated high, baked to a low sheet; tears in the alpha |
| hard parts standing proud | modelled with their own budget; flat ones (rivets) baked |
| low poly | clean quads over the high, normal and AO baked; density set by the silhouette |
| motion | joint chains with lag; a spring layer at runtime; a simulation baked to bones |

## Motion, by class

Bake every clip in the DCC where possible: anything a per-frame solve can compute ships as bone keys. Keep runtime
physics for what a clip can't know (blends, impulses, wind).

1. **Tight clothing**: copy weights from the body, never paint them [src]. Robust transfer: copy only where the body's
   nearest point is within about 5 % of the garment's bounding diagonal and normals within about 35°, inpaint the
   rest, clamp, renormalise [src]. Hide the body under it, with a buffer band at the seams [src]. Twist and helper
   bones hold volume; correctives come after good weights [src].
2. **Rigid plates**: all of a plate's vertices on one bone [src]. A plate over a joint rides a helper bone turned by a
   share of the joint (Unreal's Bone Driven Controller does this at runtime) [src]; shares around 0.3–0.6 of an arm's
   raise for a pauldron, about 0.5 of the elbow for its plate [inf]. Anything spanning a joint is cut into
   overlapping lames, each on its own bone, with a soft layer under every gap [src].
3. **Panels hung from a belt** (loincloth, tassets, tabards) [inf unless marked]:
   - one bone per panel, hinged along the panel's own top edge where it leaves the belt [src], never at the hip joint
     (the tuck swings into the pelvis) and never at the panel's very top (the tuck swings out of the belt);
   - the tuck above the hinge stays on the hips;
   - the hinge direction is the top row's principal direction;
   - pushed by the leg it hangs against, leaning toward its outward facing: front panels by the leg swinging forward,
     back panels by the leg swinging back [src], side strips by the leg opening;
   - a panel over both legs takes the larger of the two pushes, never the sum [src];
   - collision on top of the lean: per frame, turn at least enough to keep the limb's surface points a few mm behind the
     panel's rest profile; push 0 at rest;
   - a rigid panel can't answer a bump near its hinge (it flings out like a fin): limit the push near the hinge, and
     past that use a two-bone chain per panel.
4. **Skirts, robes, long coats**: a driven ring of bone columns, the upper ones driven from both thighs (the larger,
   never stacked constraints), rotation limits, a distance limit off the leg [src]. Or spring bones with leg
   capsules, or cloth simulation with a backstop [src]. One leg forward and one back defeat a single column: more
   columns, or a slit [src/inf].
5. **Capes, cloaks, scarves, hoods**: bone chains with spring physics or cloth, the top rows pinned, body capsules, a
   backstop; damping and limits where they do the job [src]. A baked looping simulation keeps a late cycle so its ends
   match [inf].
6. **Straps, pouches, sheaths**: straps skinned like the body; hard items rigid, or on a pendulum bone at the real hang
   point (the loop, not the item's centre) [src].
7. **Strips, tatters, fringes**: spring-bone chains with limits; colliders thinner than the gap they guard [src].
8. **Layers**: fit inside to outside, each at a minimum offset from the one beneath, covered faces hidden [src].

## Checks (every garment, every clip, every LOD)

- **Through the body**: worst frame per clip, inside points measured, the worst looked at.
- **Out of what holds it**: a tuck or strap end against the band over it, by radius in the same angular sector.
- **Stretch**: the deformation gate on the garment; rigid panels 0 % past it.
- **At rest**: every driven or pushed piece at its rest place.
- **The motion itself**: each driven piece's turn beyond what drives it, under its limit. A contact count says
  nothing about a piece flung out of the way.
- **Each piece alone, front view**: a fringe mirrored to the wrong side or a strap cut short shows only that way.
- **Lit, with its maps, beside the concept's crop** at the same scale. Clay is for geometry only.

## Sources

- Robust skin weight transfer via weight inpainting (SIGGRAPH Asia 2023):
  https://www.dgp.toronto.edu/~rinat/projects/RobustSkinWeightsTransfer/
- Unreal Bone Driven Controller:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-bone-driven-controller-in-unreal-engine
- Unreal clothing tool: https://dev.epicgames.com/documentation/en-us/unreal-engine/clothing-tool-in-unreal-engine
- Unreal AnimDynamics:
  https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-animdynamics-in-unreal-engine
- Unity Cloth: https://docs.unity3d.com/Manual/class-Cloth.html
- Magica Cloth, preventing penetration: https://magicasoft.jp/en/prevent-penetration-2/
- Kawaii Physics: https://github.com/pafuhana1213/KawaiiPhysics
- VRChat PhysBones: https://creators.vrchat.com/common-components/physbones
- VRM spring bones: https://vrm.dev/en/univrm/springbone/univrm_secondary/
- Dangle bones (a game modding wiki):
  https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/3d-modelling/meshes-and-armatures-rigging/dangle-bones
- Skirt rigs with drivers: https://blenderartists.org/t/skirt-rig-with-drivers-not-working/675134,
  https://blenderartists.org/t/make-skirt-rig-react-to-leg-movement/1563573
- Thigh-linked skirt bone (patent): https://patents.google.com/patent/US9675887B2/en
- Rigid plates on one bone: https://polycount.com/discussion/comment/574932
- Faulds and tassets: https://en.wikipedia.org/wiki/Faulds_(armour), https://en.wikipedia.org/wiki/Tassets
- Adaptive clothing system (GDC 2015): https://gdcvault.com/play/1022771/Adaptive-Clothing-System-in-Kingdom
- Layered cloth self-collision (GDC 2018):
  https://media.contentapi.ea.com/content/dam/eacom/frostbite/files/gdc2018-chrislewin-clothselfcollisionwithpredictivecontacts.pdf
- Game clothing workflow (sim → sculpt → retopology → bake): https://polycount.com/discussion/comment/2689197/
- Torn cloth as alpha on low sheets: https://polycount.com/discussion/comment/2645928
- Cloth retopology for game assets in Blender:
  https://www.blendernation.com/2020/05/26/cloth-retopology-for-game-asset-creation-promoted/
- Belts and straps on a trim strip: https://polycount.com/discussion/comment/2639112
- Unity skinned cloth tips: https://discussions.unity.com/t/skinned-cloth-tutorials-tips-and-tricks/500364
- Blender Studio animation testing: https://studio.blender.org/tools/artist-guide/asset-creation/animation-testing
