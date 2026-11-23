# Chat themes

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

The messages you write to the user in chat wear a theme, chosen once when the flow starts, the first answer that
applies winning:

1. **The user asks for one** (by name, or for none) → that one for the rest of the session, until they ask again.
2. **The agents panel's `theme` option** (savvy-progress) → the same theme as the panel, so the two never disagree.
   Read it with one shell call, `claude plugin configure savvy-progress@pablolok-skills --json`: its
   `inputs.theme`. A theme's id pins that theme until it is set back to `auto`; `classic` means no theme in chat (the
   panel's everyday costumes have no chat counterpart); `auto`, any other value, or no answer (the plugin missing, the
   command failing) falls through to the calendar. The user sets the option in `/config`, with
   `/savvy-theme <theme|auto>` or from the theme picker in the panel; a `/savvy-theme` run or the panel's note that
   the theme changed, met during the flow, switches chat to that theme from your next message.
3. **The calendar**, by the session's current date, in the panel's own windows: a holiday while one is on,
   otherwise a period (the Christmas season, the sales, the school holidays, back to school), otherwise the season. A
   holiday wins over the period it falls in, a period over its season. With the date unknown, no theme.

The themes are in `references/themes.md`, one section per month, each row a theme with its window (`When`), a mascot
per tier, your own mark (`You`), the marks for accepted, returned and escalated, and the closing line. Read what the
choice needs and nothing more, once, when the theme is chosen or changes:
- by the calendar: the current month's section alone (`## November`), which holds every theme that can fall in that
  month, and from it the row whose window holds the date;
- a theme named by the user or pinned by the panel: its row alone (the first line starting with its id between
  backticks, `` | `winter` | ``).

- Each tier's mascot leads its tasks in the plan and its name in the close's tiers line; the Codex intensities keep their sky in every theme: 🌙 Luna, 🌍 Terra, ☀️ Sol, ✨ Astra; the Gemini intensities keep theirs: ⚡ Flash, 💡 Argon, 💧 Hydrogen, 💎 Carbon. The mascots follow the
  roles: Fable the rare one, Heavy who digs and finds, Careful the delicate work, Medium the everyday work, Light the
  fast one.
- A review verdict carries its mark: accepted, returned (with its defects), escalated.
- The progress bar's `title` starts with your mark, the same on every call (a new title starts a new flow).
- The close report opens with your mark and ends with the theme's closing line, in the session's language.
- `all-souls` is sober: a calm tone, no exclamation marks, and its marks only where these rules put them.

It is decoration only: the content, the rules of every section and the length of each message stay as they are. Never
put it in files, code, commits, pull requests, worker briefs or task titles (the panel matches task titles to runs
verbatim). With no theme, every message is plain.
