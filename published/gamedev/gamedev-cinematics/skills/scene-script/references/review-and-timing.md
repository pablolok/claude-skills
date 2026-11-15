# Timing, scoring, and lock

## Validate the document

Use an existing validator when available; otherwise perform these checks explicitly and label them manual.
Do not invent a successful tool run.

| Check | Required evidence |
|---|---|
| Completeness | Header, beats, screenplay, overhead, cards, lines, intensity, review, notes present |
| Identity | Unique beat/shot/line IDs; every reference resolves; every beat has intentional coverage |
| Time | First image starts at zero; times are ordered; final endpoint equals declared duration |
| Coverage | No unintentional image gaps; explicit blends/black; short shots have a readability reason |
| Continuity | Axis, eyelines, action matches, and prop states checked across neighboring cards |
| Dialogue | Exact text matches the intended text source; durations fit the reading/voice requirement |
| Competition | Text overlap, essential action under text, and sound masking are resolved or justified |
| Control | Incoming state, outgoing goal, skip state, and interruption cleanup are specified |

Build a merged timing sheet of shots, cues, lines, sound, and control state on the same clock.
Estimate reading time as character count / target characters per second, with a minimum hold and
padding chosen for the audience. Check voiced duration separately; use whichever needs longer.
Count displayed text rather than markup. Recheck after localization.

Treat sub-second readable shots, unchanged-size cuts, and axis changes as review flags. They may be
deliberate; require a reason and preview instead of rejecting them solely from a number.

## Score the script

Score each dimension 0-2: 0 = absent or materially broken; 1 = specific weakness logged;
2 = supported throughout the relevant cards. Cite cards and cues for every score.

| Dimension | Evidence for 2 |
|---|---|
| Turn | A clear want meets an observable obstacle and changes through a caused action or discovery |
| Economy | Each beat, shot, and line contributes; essential action survives the dialogue-removal check |
| Geography | Actor, threat, and route are established and retained through movement |
| Coverage | Each card has a primary job, lens/framing intent, concrete detail, and readable turning action |
| Composition | Attention, depth, and outgoing/incoming eye positions are planned |
| Rhythm | Durations fit information; anticipation, principal peak, and consequence have room |
| Lighting | Sources and separation support the intended pressure without continuity breaks |
| Acting | Observable body, gaze, and object actions carry the emotional changes |
| Sound | Each beat has an intentional mix state and accents support the causal action |
| Dialogue | Voice and knowledge fit; reading and speech land on the right images |
| Gameplay transition | Takeover, return, next goal, fair threat window, and skip state are specified |
| Story coherence | Facts, knowledge, causality, continuity, setups, and conventions agree with the bible |

Review candidate: **20/24 or higher, no zero, validation passed**.
Record exceptions with evidence; a total cannot conceal a blocker.
For deliberately word-driven scenes, document what the wordless test cannot convey and demonstrate
that the visual action supports the dialogue; assess economy against that declared intent.

## Resolve notes at their cause

- Missing motivation or causality: revise the header or beats.
- Confusing space: revise the overhead and blocking before lens polish.
- Unreadable action: revise coverage, timing, pose, or prop visibility.
- Line too long for its image: revise dialogue or the shot's duration, then regenerate the timing sheet.
- Build-only defect: carry a linked task into implementation with a measurable acceptance check.

Use the note states consistently:

| State | Meaning at review |
|---|---|
| open | Decision or solution still missing; blocks lock if it affects the script |
| accepted | Agreed fix awaiting completion; still unresolved |
| fixed | Revision and verification identify the correction |
| rejected | Rationale explains why no change is needed |
| deferred | Destination, scope, and acceptance condition recorded; script remains buildable |

Raise the revision after review-driven changes. Preserve stable IDs where practical; if an ordered ID
scheme requires renumbering, update cards, notes, implementation mapping, and captures together.

## Lock packet

Submit the full script, merged timing sheet, score/evidence table, overhead, and remaining build tasks.
Record the accepted revision and review role. Pending review is `review`, not `locked`.
If implementation demonstrates a flaw in the intended scene, reopen the relevant script fields,
revise, and obtain acceptance for the new revision before treating it as the new build target.
