# UX readability and onboarding

## Behavioral checks

- Briefly expose a normal gameplay frame. Ask where the player is, what threatens them, what state matters,
  what they can do, and where they should go. Record wrong answers and time to answer.
- At the first interactive frame, ask for the next action before explaining it.
- Count forced tutorial reading and interruption, but treat word count as a diagnostic rather than a universal limit.
- Measure steps and waits from intent to play; show loading/progress when a wait is necessary.
- Separate meaningful gameplay decisions from navigation friction and unclear menu labels.
- Observe inactivity: offer a contextual hint when needed, without punishing a player who is still learning.

## Information priority

| Priority | Typical role | Check |
|---|---|---|
| Survival | Immediate threat and critical state | Perceptible at the action, not only in a distant numeric readout |
| Action | Availability, cooldown, resources | Supports the next decision without prolonged inspection |
| Navigation | Route, objective, landmark | World cues work before adding more markers |
| Progress | Accumulated reward, objectives | Visible at a suitable frequency without masking action |
| Context | Dialogue, notifications, explanation | Does not displace more urgent information |

Adapt the order for games without survival pressure. Test overlapping HUD, subtitles, prompts, notifications,
and menus in the same frame and with long localized text.

## Teach through practice

Introduce -> practice/develop -> change context -> test. Teach one dependency before requiring it under pressure.
Use a contextual prompt when the action becomes useful, show the current binding, and dismiss it on demonstrated success.
Allow a reminder when a returning player needs it; permanent instruction text is not the only memory aid.
Make early errors recoverable where the intended experience calls for learning safely.
Treat a deliberately dangerous introduction as a design choice that needs evidence, not an automatic failure.

### Onboarding rubric /10

| Dimension | Points | Full-credit evidence |
|---|---|---|
| Contextual prompts | 0-2 | Needed now, concise, binding-aware, dismissed by demonstrated understanding |
| Agency and repetition | 0-2 | Learning occurs through action; repeat players avoid unnecessary interruption |
| Progressive disclosure | 0-3 | Prerequisites are practiced before combination and pressure |
| Visual/behavioral language | 0-2 | Consistent cues carry meaning without relying on colour alone |
| Error recovery | 0-1 | Mistakes expose a useful correction and an appropriate retry |

Report partial credit with the specific failure. Use the same scoring interpretation in rechecks.

## Reading and accessibility

- Schedule one primary reading task at a time; do not cover a critical threat with unrelated dialogue.
- Start planning subtitles around 15-17 characters/s, then verify actual language, audience, and voice duration.
- Check speaker identity, backing/outline, wrapping, safe areas, scale, and contrast on worst backgrounds.
- Verify remapping, alternate input, hold/toggle options, and focus visibility where relevant.
- Communicate important state through more than colour or sound alone; test greyscale and muted playback.
- Verify reduced flash/shake/motion retains the rule and the warning.
- Exercise dialogue queues and branches; check this: waiting for an unfinished queue can stall progression.

Unity: UI Toolkit or the existing runtime UI system should share binding, focus, and text-scale behavior.
Unreal: UMG should share those same contracts with the input and localization systems.
Judge the player-facing result rather than preferring a UI framework as a quality test.
