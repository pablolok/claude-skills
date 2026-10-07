# Mermaid Diagrams

Mermaid diagrams in a project's markdown docs that really render — in the VS Code preview and on GitHub. A broken
diagram fails silently there (an empty box, no error), so the skill carries the rule for when to pre-render to SVG,
a validator and a renderer, the race that blanks the preview, and the dead ends already ruled out.

## How It Works

- **Up to two small diagrams**: live ```` ```mermaid ```` blocks, checked with the validator.
- **Three or more, or big ones**: sources in `diagrams/<document>/NN-name.mmd`, pre-rendered to SVG by a real Chrome
  (mermaid-cli), the document embeds the SVG and links the `.mmd`.
- The scripts resolve `mermaid`, `jsdom` and mermaid-cli from the project (the cwd) first, then from the skill's own
  folder: a project that pins a version keeps it.

| File | What it is |
| :--- | :--- |
| `SKILL.md` | The rule, the two procedures, what breaks a diagram, the dead ends. |
| `check-mermaid.mjs` | Validator: parses and renders (under jsdom) every mermaid block of the given files; exit 1 on a failure. |
| `render-svg.mjs` | Renderer: every `.mmd` of a folder to a sibling `.svg`; fails on `foreignObject` or a broken viewBox. |
| `render-svg-wsl.mjs` | The renderer under WSL, through the Windows copy's `mmdc.exe` and Chrome. |
| `smoke-test.md` | Six diagrams in a ladder: the first one the preview drops names the culprit. |
| `package.json`, `bun.lock` | The skill's own dependencies, the fallback when a project has none. |
| `.mermaid-config.json`, `.mermaid-puppeteer.json` | The renderer's defaults (`htmlLabels: false`; the Chrome to drive). |
| `bootstrap/mermaid.mjs` | Copied into a project (not run from the skill): the stable command below. |

## The Stable Command

The plugin's folder changes with every version, so no doc or hook names it. Copy `bootstrap/mermaid.mjs` into the
project as `scripts/mermaid.mjs` and commit it; it is the one place the project pins the skill's version
(`VERSION`):

```bash
node scripts/mermaid.mjs check <file.md> [file.md ...]
node scripts/mermaid.mjs render <diagrams-folder>
```

Arguments pass through, the exit code is the script's, the cwd stays the caller's. The skill is found at
`MERMAID_SKILL_DIR`, else at `.claude/skills/mermaid-diagrams` in the project when it is the same version, else in a
shallow clone of this repository's tag `mermaid-diagrams@<version>` under `CLAUDE_SKILLS_CACHE` (default
`~/.cache/claude-skills`), fetched once. A clone has no `node_modules`: when `mermaid` or `jsdom` resolve neither from
the project nor from the clone, the launcher installs the skill's `package.json` there once (`bun install`, else
`npm install`) and says so in one line. It has the same shape as the `backlog` skill's `backlog-gate.mjs`.

## The Chrome Path

`.mermaid-puppeteer.json` names a default Windows Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`)
and is only the skill's default. A project — or a machine whose Chrome lives elsewhere — puts its own
`.mermaid-puppeteer.json` (or `.mermaid-config.json`) in its root: the renderer uses that one. Never edit the copy
in the plugin; the next update overwrites it.

## Installing

`claude plugin marketplace add pablolok/claude-skills`, then
`claude plugin install mermaid-diagrams@pablolok-skills --scope user`. It pairs with `writing-architecture-docs`.
