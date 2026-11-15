# Level and encounter review

## Measure before dressing

Record movement speed/acceleration, turn time, jump/dodge reach, resource cost/recovery, enemy reach,
projectile speed, interaction range, and camera visibility. Use only metrics relevant to the host game.
Measure the gameplay camera's visible footprint at representative depths and aspect ratios.
For moving or first-person cameras, include turn-to-see time and available cues.

Size passages, traversal gaps, cover, interaction spaces, and enemy spacing against those measurements.
Check this: a dodge can be mechanically valid yet useless when corridor clearance is smaller than the
body plus required evasion path. Test the real collider and action, not only center-point distances.

## Pacing through space

Write a simple sequence table before layout polish:

| Area/beat | Role | Intensity 0-1 | New demand | Relief/reward | Exit goal |
|---|---|---|---|---|---|
| [ID] | [teach/develop/rest/test/climax] | [value] | [skill/info] | [kind] | [goal] |

Look for a rising shape with deliberate rests, variety, and a readable principal peak.
Constant intensity can exhaust; constant release can remove purpose. Match pacing to the intended genre.
Give major spikes preparation and recovery when those contrasts support the experience.

## Teach, develop, twist, test

Introduce a rule in a readable setting, let the player practice it, change its context, then combine it under pressure.
Check that a required skill was actually demonstrated before an encounter assumes mastery.
Reduce the cost of initial misunderstanding when teaching, unless costly discovery is an explicit design goal.
Avoid changing several unknown rules at once without enough observation time.

## Routes, gates, and guidance

- Critical path: verify prerequisites in order, reachable goals, and no dependency behind its own gate.
- Expected path: measure pacing and guidance where players actually go, not only where the designer drew a line.
- Branches: verify reward, orientation, rejoining, and whether missing them changes required knowledge.
- Gates: communicate locks, abilities, irreversible traversal, and soft difficulty barriers.
- If a challenge must be mandatory, validate topology rather than relying on decorative obstacles.
  If multiple solutions are intended, test them rather than closing them.
- Use sightlines, contrast, leading forms, landmarks, sound, and stable visual language to guide attention.
- Verify boundaries match visible affordances; an open-looking route blocked invisibly needs correction or explanation.

## Encounter readability

Keep the threats needed for a decision within the player's perceptual reach, or provide useful warning and time.
For a fixed overhead camera, around one to one-and-a-half visible footprints is a starting scope probe,
not a rule for every encounter or camera type.
Check near-screen edges, tall occluders, verticality, and the direction from which danger enters.
Provide recognizable recovery options appropriate to the design: cover, spacing, a defensive verb,
retreat, support, or a planned safe interval. A literal safe tile is not mandatory in every game.

Review enemy roles and combinations: what question each asks, how tells differ, what counterplay exists,
and whether combined demands remain compatible with the player's action budget.
Play at supported skill/resource extremes, not just full resources on the expected path.

## Validation record

Record route, entry state, camera conditions, completion/failure, lost moments, waiting, peak, and recovery.
Include direct-route attempts, adversarial routes, and actual player observations where available.
Blockout must carry the spatial and mechanical idea before dressing is treated as its solution.
After visual polish, recheck sightlines, collision, threats, and navigation; art can change readability.
