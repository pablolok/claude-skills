---
name: mermaid-diagrams
description: Mermaid diagrams in the markdown docs of ANY project, so that they really RENDER in the VS Code preview and on GitHub. Use it before adding or changing a diagram in docs/ — layers, architecture, UML, sequence. Carries the rule for when to pre-render to SVG, the validator and the renderer behind one stable project command, the mechanism by which the preview leaves empty boxes with no error, and the dead ends already ruled out.
---

# Mermaid in markdown documents

**The failure is silent.** A diagram that does not work in the VS Code preview gives no error: it leaves an empty
box. There is nothing to read, so one guesses, and every guess costs a round of someone looking at the preview — a
broken diagram has taken seven such rounds before its real cause was found. This skill exists so that it does not
happen again.

## The stable command

The skill is a plugin (`mermaid-diagrams@pablolok-skills`) and serves every project. The plugin's path changes with
every version, so **no document or hook names the skill's folder**: the project copies the skill's
`bootstrap/mermaid.mjs` once to `scripts/mermaid.mjs`, commits it, and from then on the command is always the same:

```bash
node scripts/mermaid.mjs check <file.md> [more.md]       # the validator (check-mermaid.mjs)
node scripts/mermaid.mjs render <diagrams-folder>        # the renderer (render-svg.mjs)
```

The launcher pins the skill's version (`VERSION`, the one place the project chooses it) and finds the skill this way:
`MERMAID_SKILL_DIR` if set; a copy in the project's `.claude/skills/mermaid-diagrams` at the same version; otherwise a
clone of the skills repository at the tag `mermaid-diagrams@<version>`, fetched once into `CLAUDE_SKILLS_CACHE`
(default `~/.cache/claude-skills`) and reused offline. Arguments pass through to the scripts, the exit code comes back,
the cwd stays yours. **The clone has no `node_modules`**: when `mermaid` or `jsdom` resolve neither from the project
nor from the clone, the launcher installs the skill's `package.json` there once (`bun install`, or `npm install`
without bun) and says so in one line. A project that already has the dependencies never triggers the install.

In a session, in a project without the launcher, the scripts also run from the skill's base folder
(`node <skill folder>/check-mermaid.mjs …`) — but there the only dependencies are the project's.

Dependencies resolve in order: **first the project you are in, then the skill.** The project wins on purpose: whoever
pinned a version keeps it, and the version comparison in *Versions in play* is cwd-based and would die if the skill's
copy won. The skill's copy is the safety net, not the rule. To keep the dependencies in the project instead:

```bash
bun add -d mermaid jsdom @mermaid-js/mermaid-cli   # the first two for the validator, the third for the SVGs
```

> ⚠️ `bunx mmdc` is only the **last** resort (it needs bun on PATH and downloads mermaid-cli on every run). The
> renderer looks for the installed binary first, and the shim names on Windows are not interchangeable: **npm writes
> `mmdc.cmd`, bun writes `mmdc.exe`**, POSIX a bare `mmdc`. Looking for only one fails silently: it falls back to
> bunx and seems to work.

The two configuration files (`.mermaid-config.json`, `.mermaid-puppeteer.json`) travel **with the skill**, not with
the project — including the Chrome path, which belongs to the machine, not to the repository (the skill's default is
`C:/Program Files/Google/Chrome/Application/chrome.exe`). A project that wants different ones, or a machine whose
Chrome lives elsewhere, puts a copy in its own root: that one wins. Never fix them inside the skill: the plugin's next
update overwrites them.

## The rule, in one line

| the document has… | do |
|---|---|
| **up to 2 simple diagrams** | live ```` ```mermaid ```` blocks — *Procedure B* |
| **3 or more, or large diagrams** | **pre-render to SVG** — *Procedure A* |
| in every case | validate before saying it works |

The threshold is not aesthetic: above two diagrams the preview **loses a race** and draws nothing. Why is in *The
race*, below — the one thing to understand once.

---

## Procedure A — pre-render to SVG (the reliable way)

The sources live in `.mmd` files, authoritative and diffable; the document embeds the image and links the `.mmd`. An
image has nothing to compute: it renders at once, everywhere, and there is no race to lose.

### ⚠️ One folder PER DOCUMENT, under `diagrams/` — never a shared bin

**A diagram belongs to one document only.** Its sources live in a folder dedicated to that document and named **like
the document** — and those folders all sit **under one `diagrams/`**, next to the documents:

```
docs/architecture/billing.md
docs/architecture/readers/pdf.md
docs/architecture/diagrams/
    billing/                 ← billing.md's diagrams, and nothing else
        01-flow.mmd + .svg
        02-decision.mmd + .svg
    readers/pdf/             ← the document's path, without `.md`
        01-two-classes.mmd + .svg
```

⭐ **The rule in one line: the document's path without `.md`, under `diagrams/`.** For a document in a subfolder the
subfolder repeats — so two documents with the same name in different folders do not collide, and a `.mmd` leads back
to its document without a search. For a piece of work with its own folder (`<docs>/<work-name>/spec.md`) the folder is
that work's `diagrams/`: the same rule, **one per document**, not one per repository.

- **The intermediate `diagrams/` is not cosmetic.** Diagram folders sitting beside the documents cannot be told apart
  from subfolders that hold documents (like `readers/`), and a listing of the area no longer says what it holds
  (measured: eleven diagram folders among one architecture folder's documents). Under `diagrams/` the root is again
  the list of documents plus one folder.
- **A flat `diagrams/` collecting every document's diagrams looks like order and is not** (measured while undoing
  one): the names must carry the document's prefix (`billing-01-…`) not to collide — that prefix **is** the missing
  folder, written by hand on every file; the numbering no longer restarts, so it stops saying "this document's first
  diagram"; the renderer re-renders everything on each run, untouched documents included, where one folder per
  document regenerates only that one; and when a document dies nobody knows which diagrams to take with it.
  These four properties depend on **one folder per document** existing, not on where the folders sit: nesting them
  under one parent keeps all four, merging them into a flat folder loses all four.

```bash
node scripts/mermaid.mjs render docs/architecture/diagrams/billing
```

In the document (the link starts from the document; the caption in the document's language, or in the wording the
project's documents already use):

```markdown
![What the diagram shows](./diagrams/billing/01-flow.svg)

<sub>Source: [`diagrams/billing/01-flow.mmd`](./diagrams/billing/01-flow.mmd).
Regenerate with `node scripts/mermaid.mjs render docs/architecture/diagrams/billing`.</sub>
```

To change one: edit the `.mmd`, regenerate, commit **both**.

The renderer uses **mermaid-cli driving the installed Chrome** (the skill's `.mermaid-puppeteer.json`, so no Chromium
is downloaded; where Chrome lives elsewhere, a copy of that file in the project's root fixes it, not an edit in the
skill). It fails on its own on three conditions, the three ways this has already gone wrong:

- **`foreignObject` in the output** — an `<img src="*.svg">` does **not** render it, so with HTML labels the boxes
  would come out empty: the same bug by another road. Hence `htmlLabels: false` in `.mermaid-config.json`.
- **A stretched `viewBox`** (ratio above 12) — the signature of a renderer that did not measure the text (*Dead
  ends*, item 3).
- **A missing or invalid `viewBox`.**

The dark background is baked into the SVG (`-b '#1e1e1e'`): the dark theme draws light text, which would vanish on a
white page.

## Procedure B — live blocks (small documents)

```bash
node scripts/mermaid.mjs check <file.md> [more.md]
```

Two passes, because they fail differently: **`parse`** catches the syntax, **`render`** runs `mermaid.render()` under
jsdom and catches what the parse does not see. It exits 1 when anything fails.

> ⚠️ **Check that it counts the diagrams** (`<file> — N diagram(s)`): a file where no block is found prints nothing,
> and the validator ends with "All diagrams parse.". Measured: an earlier version looked for ```` ```mermaid ````
> followed by `\n` only, and on a CRLF file — any Windows checkout with `core.autocrlf` — it found **no** block and
> passed. It now accepts `\r\n` too.

> **`render` under jsdom does NOT check the layout.** It says "threw no exception", not "looks right". The drawing
> needs a browser: Procedure A.

The theme is set **once per project**, in `.vscode/settings.json`:

```jsonc
"markdown-mermaid.lightModeTheme": "dark",
"markdown-mermaid.darkModeTheme": "dark",
"markdown-mermaid.mouseNavigation.enabled": "never",
"markdown-mermaid.controls.show": "never",
"markdown-mermaid.resizable": false,
"markdown-mermaid.maxTextSize": 100000
```

`dark` is forced in both modes because `darkModeTheme` alone should follow VS Code's theme and instead the diagrams
came out light on a dark page.

**In live blocks hard-code no colours**: the theme takes care of them, and a fixed dark fill becomes unreadable for
whoever opens the same file on GitHub in light mode. Only semantic `classDef`s, with colours that hold on both
backgrounds — and the `classDef` **always before** the `class` lines that use it:

```
classDef bad fill:#5c1a1a,stroke:#ff8a80,color:#ffffff
class GATE bad
```

(In pre-rendered SVGs the opposite holds: the colour is hard-coded on purpose, because the image must stand on its
own.)

---

## What really breaks a diagram

| construct | outcome | use instead |
|---|---|---|
| HTML entities in labels: `subgraph D["src/lib/&lt;domain&gt;"]` | empty box | no entities: `["src/lib"]` |
| HTML tags in labels: `A["<b>Api</b>"]`, `<i>`, `<span>` | with `htmlLabels: false` (this skill's setting) the tag is not interpreted: the box reads `<b> Api </b>`. The parse does not notice — only looking does | no bold, italics or `<span>`: emphasis through the node's shape or a `classDef` |
| generics with a comma in a `classDiagram`: `Map~K, V~ handlers` | parse broken | `Map handlers` |
| a comma in the TEXT of a note over **two** participants: `Note over A,B: x, y` | parse broken — `Expecting 'SOLID_ARROW'… got ','`: after `A,B` the parser is still reading the participant list, and the text's comma sends it back there. With **one** participant the same comma passes (measured: same file, same text, only the second participant differs) | remove the comma from the text, or reduce to `Note over A: x, y` |
| `class X bad` before `classDef bad` | parses, application not guaranteed | `classDef` always first |
| HTML labels in an SVG inside an `<img>` | empty labels | `htmlLabels: false` (already in Procedure A) |
| a multi-line `note right of X … end note` in a `stateDiagram-v2` | parses, and `check` passes it (parse and jsdom render both) — the real renderer dies: `Error: splitLineToFitWidth does not support newlines in the line` | a one-line note, or none — ask first whether it is needed: in the real case it repeated the prose beside it, and removing it improved the document |

The last row is the sharpest proof of the boundary this skill draws: **jsdom tells you a diagram parses, not that it
draws** — only Procedure A or a manual render catches it.

What holds: `<br/>` in labels (mermaid treats it apart, not as HTML), parentheses and punctuation in quoted strings,
cylinders `[( )]`, circles `(( ))`, `classDef`/`class`/`style`, a `subgraph` with a quoted title, `<<interface>>`,
`alt`/`else` in sequence diagrams, and accented letters — labels are written in the document's language (measured:
`"Perché è già"` parses in `check` and comes out whole in the rendered SVG).

Rule of thumb: **quoted strings and plain text in labels** — no entities, no tags. Whatever is not text goes in the
prose around the diagram, where no parser can break it.

## The race — why the preview leaves empty boxes

From the extension's source, `dist-preview/index.bundle.js`, at the end:

```js
async function h03(){
  for (let i of cs2) i.dispose();   // throws away the diagrams already drawn
  ls2?.abort();                      // CANCELS the previous render
  ...
}
window.addEventListener("vscode.markdown.updateContent", h03);
h03();                               // and starts one at once
```

**Each cycle cancels the one before.** On opening, one starts inline and VS Code triggers more with `updateContent`:
when a cycle does not finish before the next, it is aborted and the container stays empty **with no error at all**.
Editing the file with the preview open sends a single update, the render reaches the end and the diagram appears.

Hence the diagnostic symptom: **"it shows while you edit, it vanishes when you reopen" = a lost race**, not broken
content.

Measured: an `architecture.md` with 5 diagrams takes ~1700 ms per cycle, `smoke-test.md` (6 small diagrams) ~200 ms.
The second wins the race. That is where the two-diagram threshold comes from.

## When something does not show, in this order

1. **Are you still writing the file?** Finish, then look. (Not the main cause — *Dead ends*, item 1 — but it removes
   noise.)
2. **Run the validator.** If it passes, the content is not the cause: go to step 4.
3. If it fails, fix it with the table above.
4. **Open `smoke-test.md`** (next to this skill): six diagrams in a ladder, each adding one thing to the one before.
   The first that vanishes names the culprit; if number 1 already fails, it is not the content.
5. **Switch to Procedure A.** If the document has more than two diagrams, it is the answer anyway.
6. **`Ctrl+Shift+P` → *Developer: Open Webview Developer Tools*** with the preview open: the only place where the
   real error shows. Everything else is inference; this is observation — and it comes first, not after five tries.

## Dead ends — verified false, do not walk them again

1. **"The file changes under the preview while you look."** Plausible, and once written down as the main cause.
   **False**: the symptom was the opposite — the diagram appeared *during* edits and vanished *on reopening*. The
   cause is the race on opening.
2. **"Two mermaid extensions in conflict."** False: only one was installed, `bierner.markdown-mermaid-1.32.1`, which
   bundles mermaid 11.12.2.
3. **"Generate the SVGs with jsdom."** The worst attempt. It threw no exception and produced unusable files:
   `viewBox="-8 -8 27822 34"`, every node on one endless row, plus a duplicated `style` attribute that made the XML
   invalid. Without text measurement there is no layout. **jsdom says whether a diagram PARSES, not whether it
   DRAWS.**
4. **"It's the `%%{init: {'theme':'dark'}}%%` directive."** Suspected because it coincided with two disappearances.
   Almost certainly innocent: it was the race. Still discouraged — the theme is set in the settings, not per diagram.
5. **"It passes the parser, so it is fine."** The conceptual error under all the others: parse, render and layout
   are three different claims, and for six rounds one was verified and passed off as the other two.

## Versions in play

- VS Code preview: `bierner.markdown-mermaid` 1.32.1 → **mermaid 11.12.2**.
- The scripts: **mermaid** and **@mermaid-js/mermaid-cli** from the project you run them in when it has them,
  otherwise from the skill's own `node_modules` (11.17 / 11.16 as of 2026-08).
- GitHub: its own, undeclared.

They never fully match. To try an older version: `bun add mermaid@10 jsdom` in a temporary folder and run
`check-mermaid.mjs` from there. Done for 10 and 11 — both passed while the preview showed nothing, which is how it
became clear the syntax was not the cause.

## Conventions for architecture diagrams

- **Layers** = `flowchart TD`, one `subgraph` per layer; the arrows say who calls whom.
- **Components** = `classDiagram`, `<<interface>>` on the contracts.
- **Paths** = `sequenceDiagram`, `alt`/`else` for the two worlds (online / offline).
- A `%%` comment inside the block does not appear in the render: use it to annotate the choices.
- The diagram shows the structure; numbers and evidence live in the prose around it. A label that wants a sentence is
  prose in disguise.

## Way out: publish as an Artifact

When the diagrams must be read outside VS Code, publish the markdown as an Artifact: it renders mermaid natively and
follows the viewer's theme. For that copy remove the hard-coded colours, which would fight the native theme. The
markdown in the repository stays the source of truth; say so at the top of the page.
