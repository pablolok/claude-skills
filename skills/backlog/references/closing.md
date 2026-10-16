# Closing an entry — process steps 6–10, and done / archive

The skill names these steps; this is each in full. An entry closes only when its work is done **and verified**.

6. **Close**: remove the entry from `## Open`; add at the **top** of `BACKLOG-HISTORY.md` one line **in the
   project's declared form** — the close line its preamble or conventions document gives, the close field it names
   in **.claude/backlog.json** (`fieldNames.Done`), else the shape of the newest history lines: the field's name, the
   date format, how the commit is written. Copy it exactly: a project's own tools may parse that line. Only a
   history that declares and shows nothing takes the default:
   ```
   - **BKLG-NNN** <title> — <what shipped, one line> · **Done**: YYYY-MM-DD (commit `<sha>`) · [doc](archive/<name>/<file>.md)
   ```
   Whatever the form, the line opens with `- **BKLG-NNN**` (or the card moves whole, with its heading): that is
   what the gates read as closed.
   ⛔ Only when its pending lines are gone: an entry closes when the work is done **and verified**.
7. **Archive the doc — check the filesystem, not just the entry**: `git mv <type>/<name> archive/<name>` (inside
   the backlog folder) and point the history line there — even if the entry's Doc is `—`: look in every type
   folder for one belonging to this item.
8. Declared `Architecture`: the `D<n>` leaves the doc's open defects, a row lands in its contributions section
   (`## Who worked on it` by default; the project's `words.contributions`).
9. Mirror: `close-issue BKLG-NNN --execute`. Run the gates.
10. Tell the user what shipped, what is still pending, and any Manual step.
11. **Run the `skill-retrospective` skill** (when it is installed) on the work that just closed: the skills it used
    are rewritten with what it taught. An archived entry is the end of a piece of work — the moment the retrospective
    is due; nothing else asks for it.

## done / archive BKLG-NNN

`process` steps 6–9 and 11 without implementing — for work that landed by other means or became obsolete (the history
line then carries the project's obsolete field instead of its close field — `fieldNames.Obsolete`, or what its history
shows; by default `**Obsolete**: <why>` instead of `**Done**`).

