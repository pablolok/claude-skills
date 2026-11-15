# Feel pass

## Measure the action before adding effects

Write a target such as "a melee attack should read as deliberate and weighty, with immediate input acknowledgment."
Choose a short vocabulary for comparisons: responsive/sluggish, weighty/light/hollow,
flowing/staccato/monotonous, readable/obscured, restrained/overloaded. Tie each label to evidence.

Trace anticipation -> execution -> impact -> resolution. Identify the input-accepted signal separately
from the damaging frame and the point where another action becomes available.
For actions without contact, identify the equivalent outcome confirmation.

Record input event, first displayed acknowledgment, animation start, active window, contact/event,
feedback onset, cancellation windows, input buffer, and recovery end.
Milliseconds = frames * 1000 / recorded frames per second. Distinguish game time from real time under slow motion.
Runtime stepping can measure simulation timing; it may omit display, device, and network latency.

## Working probes

- Around 50 ms acknowledgment is a useful action-game starting target; 50-100 ms needs context;
  above 100 ms merits investigation. Intentional windup can coexist with instant acknowledgment.
- Map impact channels: visual, audio, camera/haptic, target reaction. Several channels beginning within
  roughly 100 ms can strengthen contact; verify accessibility and event importance before adding more.
- Check this: a flash can be triggered correctly yet invisible on the actual material. Verify the rendered effect.
- Compare anticipation with the time required to perceive and perform the intended response, including
  animation commitment and device/network conditions. Do not assume one human reaction constant.
- Flag unexplained inactive gaps around 0.5 s and investigate repeated gaps above 1 s in fast action.
  Suspense, observation, charge-up, and deliberate recovery can be meaningful activity.
- Repeat the action around 20 times to inspect fatigue, stacking, monotony, and inconsistent outcomes.
- Remove decorative effects temporarily: contact, direction, and state should still be understandable.
- Listen without the image and watch without sound to locate missing or overloaded channels.

## Feel rubric /14

Score each 0-2. Use 0 for broken/missing, 1 for a reproducible weakness, and 2 for the agreed target
consistently met. Set numeric targets before scoring and preserve them for the comparison.

| Dimension | Evidence for 2 |
|---|---|
| Responsiveness | Acknowledgment meets the declared latency target and inputs are not silently lost |
| Clarity | The action, affected target, and outcome remain identifiable |
| Impact | The feedback chain conveys contact and importance through appropriate synchronized channels |
| Rhythm | Commitment and release support the intended repeated action pattern |
| Payoff | Outcome and feedback are proportionate to effort, risk, and event importance |
| Waiting | There is no unexplained inactivity within the intended loop |
| Information load | Effects and camera treatment preserve threats, target, and next action |

Interpret totals as a local comparison: 12-14 strong, 9-11 targeted revision, 6-8 substantial revision,
0-5 rethink the chain. Any core failure still needs resolution regardless of total.
Show baseline -> revised per dimension; extra impact that reduces readability is a regression.

## Tune proportionally

Use event tiers so a routine action, a heavy hit, and a major outcome have different emphasis.
Prefer correcting contact/timing before increasing particles or shake.
If using hitstop, keep its real-time duration explicit, preserve input buffering, and restore time correctly.
Consider pausing only the affected actors instead of the entire simulation.
If using shake, choose a controlled signal with decay, respect settings, and verify that aiming and navigation remain usable.
Do not force overshoot, bounce, or easing onto motion that needs another style.

Report each fault with channel, timing, visible consequence, proposed adjustment, and repeatable recheck.
