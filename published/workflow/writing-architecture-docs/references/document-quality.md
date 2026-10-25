## The nine rules that make the difference

The skeleton is the easy part. What separates a useful document from a neat essay:

1. **Every defect is structural, numbered and proven.** A bold line stating the defect, then its evidence at
   `file:line`. `D3 — The transport is written inside the use case, 19 times.` The numbers exist so the rest of the
   document can refer to them: "D4 disappears" is a sentence that can be checked. A defect without evidence is an
   opinion; a defect that does not come back on its own is a bug, and bugs belong in the spec.

2. **Every claim is verified at the source, and every count is measured.** A table of numbers — how many calls, how
   many covered, how many forgotten — comes from a command, not from the eye, and its denominator is checked:
   counting "the domains with a queued action" leaves out the reads nobody writes. A statement about behaviour
   (a table cell, an invariant) is read in the body of the code it describes — a header comment can say the opposite
   of what the function does — and the brief or entry that asked for the document is a hypothesis, checked the same
   way before its premise is written down.

3. **A CLOSED defect leaves the document.** The defects section holds only the **open** ones: an architecture document
   describes how the code is *now*, and a closed item no longer does — it reads as current state, which is how a
   document becomes false without any line being wrong, and the reader has to work out which items are still true.
   **Where the story goes**: into the **entry** that closed the defect (rule 4).
   ⚠️ **Numbers are never recycled**, and the document says which have left and toward which entry: the closed
   entries and the commits that cite `D2` still exist, and a new `D2` would make them lie.

4. **The document carries the PRESENT and a list of links; the past lives in the entries.** An architecture file holds
   what is there now, not the problems there were and how they were solved — the linked backlog entries are for that.
   Once a problem is solved, what remains is the clean design of what exists, then the plain list of who worked on it.

   An **open** defect stays in the document: it is a property of the code of now, and that section is the only place
   that shows what nobody is closing. All the rest of the past — what was broken, how it was fixed, what was believed
   before — **does not describe the code of now**, so it does not belong here. It belongs in the entry, which is made
   for that and survives in `archive/`.

   Hence the closing move, the one usually skipped: when a piece of work closes a defect the document **does not
   gain** a paragraph telling the closure. It **loses** one — the defect's item — and gains **one line in a list**:

   ```markdown
   ## Who worked on it
   | | |
   |---|---|
   | [[BKLG-012]] | every import asks the catalogue for the record's identity |
   | [[BKLG-019]] | the CSV import goes through the same lookup |
   ```

   (The default section name and citation; a project's own replace them, as above.)

   One line per entry, no story: whoever wants to know *what* happened opens the entry, which has the plan, the
   measurements and the migration's diagram. Duplicating it here makes two versions of the same story, and the one in
   the document ages first because nobody rereads it.

   ⚠️ **`> Corrected/Updated on <date>` blocks are TRANSIENT, not an archive.** They serve while a false sentence is
   still in circulation and someone might remember it; then the sentence is rewritten right and the block goes,
   because a new reader has nothing to unlearn. Piled up, they are a second past-tense document wedged inside the
   first; the traceability they defended is in `git log`, in the linked entry and in the list's row.

   The test, on any paragraph: **does it describe how the code is now?** If it is in the past tense, or names a closed
   entry to explain *why* something changed, it goes into the entry.

5. **At least one rejected alternative, with its price written down.** "We chose X" is not a decision until it says
   what Y would have cost. The cost is concrete: a store to own, sync rules to keep aligned with security, one more
   dependency. If no alternative had a price, no document was needed.

6. **Decisions live in a table, one row each, with the why beside it.** Not in scattered prose: they must be
   rereadable in twenty seconds six months from now, and it is the only place where an accepted risk
   ("last-write-wins, one user on two devices") becomes explicit instead of implicit.

7. **"What does NOT change" and "the main risk" are not optional.** The first bounds the work — it tells the reader
   where to stop worrying. The second names **the invariant this work has no right to break**, and it is written before
   starting, not after breaking it.

8. **Phases say what they deliver, not what they touch.** "F4 — outbox + registry: the 19 branches disappear and the
   40 forgotten ones are covered by themselves", not "F4 — changes to transactions.ts". And say which phase first
   gives the user back the thing they reported: the rest is structural work, and it must be said that it is.

9. **The diagram is part of the document, not an illustration: it is updated in the SAME pass as the prose.** This is
   the rule easiest to skip, because the prose is already being written and the `.mmd` is another file — and the cost
   of skipping is lopsided: **the diagram is what gets looked at first**, so a right paragraph over an old picture
   reads as a right picture and a confusing paragraph. A `> Updated on <date>` block repairs nothing if the drawing
   above still says the old thing; the mistake is invisible rereading the text.

   Three moves, in this order, every time a change touches a section that has a diagram:
   - **grep the `.mmd` for the names you are changing** (a renamed function, a new field, a branch that disappears).
     It is the ten-second check that finds everything.
   - **regenerate and look at the sizes**: an absurd ratio, or a file whose size does not change, says the render did
     not take what you thought.
   - **ask whether the change opened a section without a diagram.** If a section has just gained a real decision and
     its twin has a drawing, the missing one is a hole, not a choice.
