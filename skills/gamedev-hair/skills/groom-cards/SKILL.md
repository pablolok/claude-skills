---
name: groom-cards
description: Use when an approved strand groom must become hair cards for a game - cards generated from the groom by the engine's tool (Unreal's Hair Card Generator), their look in a forward renderer (alpha-to-coverage on sharpened coverage, coverage-keeping mips, MSAA, the grey veil from environment reflection, colour along the strand), a painted base under the hair, rigid binding without hair bones, motion in the material, the coverage checks. The groom is strand-groom; the review is hair-reference-review.
---

# Groom cards

Part of the `gamedev-hair` bundle. The groom itself is `strand-groom`; drawing strands is `strand-rendering`; judging
against a reference is `hair-reference-review`.

Strands in a game engine cost real frame time. Cards made **from** the approved groom are the cheap game version,
and the groom stays the look reference every card build is judged against. Most of what follows comes from one
short head-hair cut (a textured crop over a skin fade), one Unreal version's card generator and one forward renderer
(Unity URP, MSAA 4x): check this on yours, and read every number as what worked once.

## When

- A groom is approved and the game cannot afford its strands at the cameras it must hold.
- Cards made from a groom read as plates, show the scalp, look grey, show the head's dome through the hair, or end
  in a hard line where a fade begins.
- Cards must follow the face's animation, or move with the head and the wind, without hair bones.

## 0. Before generating

1. **The groom is approved first.** Cards copy it; a card round never fixes the groom's shape.
2. **Write the art owner's acceptance rules before the first card**, as checks. One art owner's set, worth asking
   about every time: no grey veil over the hair; the head's shape never readable through it; coverage judged with
   any base under the hair hidden.
3. **Read the groom's own coverage** in each shot as the target: the share of skin in sight over the hair's region
   (the groom's zones in the shot, closed a few px). In one case the groom itself showed 6.5 % at the close face
   shot; the cards' gate was that plus 2 points.
4. **Set the budget per set** (triangles, atlas size) and decide which strands become cards and which are painted.
   Strands too short to make a card (under about 2.5 mm in one case) go into the painted base (§3).
5. **Decide the route by cost.** A strand route in the engine (`strand-rendering`) stays the reference, not the game
   version, unless the budget allows it at the weakest target GPU.

## 1. Generate the cards from the groom

Use the engine's own generator rather than placing cards by hand. Reason: in one case many hand-built rounds
reached the coverage only with crossed cards that halved the tufts' detail, and still ended in a comb-like hairline;
the generator's first output was close to the groom in the DCC and in its own engine, and its faults in another
engine were that renderer's settings.
[references/card-generator.md](references/card-generator.md)

- **Unreal's Hair Card Generator** (experimental, run through Dataflow): it needs its plugins enabled in a project
  and a Python ML stack (PyTorch and a dozen packages, gigabytes) on first run: get the owner's yes for the download.
- **Sets by job:** the long zones with their under-coat merged into one groom; the band at the top of a fade; the
  upper fade's strands long enough to card. Each set has its own clump count, triangle target and texture count.
- **What comes out:** per set a mesh and four atlases (depth, coverage, tangent, attributes with the root-to-tip
  coordinate and a per-strand seed). **No colour**: the colour is yours (§2).
- **Check in the DCC before any engine look work:** card roots against the groom's roots, extents, and a flat-colour
  render with coverage as alpha and no base, beside the groom in the same flat colour.

## 2. Show them in a forward renderer

The generator's own engine reads its cards as they are; a forward renderer does not.
[references/forward-renderer-look.md](references/forward-renderer-look.md)

- **Opaque with alpha-to-coverage on the coverage sharpened at a threshold**, mips that keep coverage at that same
  threshold, **MSAA on the whole pipeline** (the game project needs it too). Raw coverage as alpha-to-coverage left
  a third of the scalp in sight; sharpened at 0.20 it met the groom's coverage plus 2 points (one case).
- **The grey veil is the environment reflection at grazing angles**, not the tips: card normals that follow the skin
  are seen edge-on, and the renderer's grazing term rises whatever the DCC's specular level says. Hold the grazing
  term at F0 for hair.
- **Colour along the strand** from the attributes' root-to-tip coordinate: a ramp of the groom's own colour, a root
  darkening, a small per-strand change from the seed, a gain and saturation fitted to the groom's render.
- **No anisotropic highlight when it reads as a grey sheen**; no card shadows when they alias under a fringe.
- **Judge coverage with any base under the hair hidden**, against the groom's own coverage in the same region.

## 3. The painted base under the hair

A thin mesh just off the skin under the cards hides what the cards leave open; painted wrong, it draws the head.
[references/painted-base.md](references/painted-base.md)

- **One root colour under all long hair** (the cards' root colour in shadow), its edge soft at the forehead.
- **The short fade drawn as strokes** along the groom's fade directions, thinning to the line the art owner drew.
- **Rules to keep** (one art owner's, as defaults to confirm): never painted in front of the cards at the temples;
  both sides identical (the right side is the left mirrored); a visible gap of skin around the ears, measured
  against the ear's silhouette in the side view; nothing dark from the base or the skin's own texture on skin
  outside the hair at the hairline.

## 4. Bind without hair bones

A short cut needs no hair bones. [references/binding-and-export.md](references/binding-and-export.md)

- **Each card takes the skin weights at its root and stays rigid**, the same weights on every vertex of the card.
- **The base takes the skin's full weights** and the face shapes that move the skin under it.
- **Check every clip and every face shape at full weight**: rigid cards over skin that the brows move can dip into
  it; report it rather than hide it.
- **Export pitfalls** (one case each, check this): shape-key curves frozen at the first frame, a subdivided body
  that lost its keys, a look build sitting at a posed first frame; always check animation away from time 0.

## 5. Motion in the card material

Head movement and wind without bones or simulation: one small script and a vertex offset.
[references/motion.md](references/motion.md)

- **A spring-delayed head**: a damped spring on the lag between the head and a head with momentum, in fixed
  sub-steps so it moves the same at any frame rate, reset on a pose jump (a clip change, a teleport).
- **Per-vertex weights in a spare UV channel** (0 at the root, rising to the tip); wind with a phase per lock.
- **Never into the head**: drop the offset's inward part along the head's radius.
- **Every pass moves the cards the same way** (colour, shadow, any debug marker); off draws exactly as before.
- **Side effect**: a moving fringe uncovers whatever is painted on the skin under it. Check that skin at the
  largest swing and the strongest wind.

## 6. Checks

Run them on captures from the shipping renderer, at the shipped cameras.

| check | rule (one case) |
|---|---|
| coverage, base hidden | skin in sight over the hair region within about 2 points of the groom's own |
| base in sight | where the cards leave the base visible on the long zones: near 0 (under 1-2 %) |
| hairline | made by edge cards or strokes, never a clean arc or one even row |
| grey veil | hair saturation and value against the groom's render on the same pixels |
| join | the value step at the cards' lower edge against the groom's own step there |
| ears, temples, mirror | §3's rules, on the side views and at several poses |
| motion off | the static captures reproduced; motion on: nothing inside the skin at the worst state |
| distance | coverage at the gameplay camera close to the close shot's (mips must not thin the cards) |

- **A fix to a spot the art owner marked is checked on their view, against their mark** (`hair-reference-review`
  references/defects-list.md): a count the author of the fix defined passed while the paint still sat under the mark.
- **Hand the art owner a scene to try** (a viewer with the states and the motion presets) once the cards work in the
  engine, before more measurement rounds.

## Engines

- **Unity (URP):** a custom shader (the stock Lit shader's alpha clip does turn on alpha-to-coverage, but multiplies
  a flat colour by grey coverage and keeps the grazing reflection); MSAA set on the pipeline asset; coverage maps
  imported as linear data with coverage-keeping mips; an FBX with face shapes imported with blend-shape normals set
  to Import, not Calculate (Calculate smeared the face, one case).
- **Unreal:** the cards are the groom's card LODs and the engine's hair card material reads the four atlases in the
  layout above; §2's look problems are the forward renderer's, §3-§5 apply as written. Untested here as a shipped
  route: check this.

## Open

- Card frame cost was not measured in the case above: "cheap" rests on triangle counts (about 15k for the cards and
  5k for the base on one head) and on the strand route's measured cost.
- Why raw coverage as alpha-to-coverage covers so little: layers with the same partial alpha may cover the same MSAA
  samples (a hypothesis, untested; blending still left a quarter of the scalp in sight).
- A soft lower edge for cards made over a fade: the generator's cards keep the clump's size, so their lower edge
  stays one band; only the texture shortens.
- Long hair, beards, and a deferred renderer: none of this was tried there.
- A sheen that reads as hair, not as a grey lobe, on generated cards in a forward renderer.
- Using cards generated by one engine in a game made with another: read the engine's licence for that case first.
