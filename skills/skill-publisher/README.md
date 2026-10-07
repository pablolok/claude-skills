# Skill Publisher

This repository's own skill: the whole path of a skill change, from the source in `skills/<skill>/` to the plugin
updated where it is used. It is not published as a plugin — it only makes sense inside this repository.

| Step | What happens |
| :--- | :--- |
| Edit | the source in `skills/<skill>/`, generic and in English, description ≤ 500 characters, launchers' `VERSION` bumped |
| Publish | `automate_publish.py` bumps the version, writes the changelog, copies to `published/`, rebuilds the marketplace; the suite, `build_marketplace.py --check` and `claude plugin validate .` must pass |
| Commit, tag, push | the commit pushed to `main` (the marketplace is read from there), then `tag_published.py --push` |
| Roll out | `claude plugin update` on each machine (a session sees it after a restart), claude.ai syncs from GitHub, projects move their copied launchers when they should, and projects on managed copies run `node scripts/claude-skills.mjs sync <skill>@<version>` and commit the diff |

The steps, the rules each one checks and the environment variables are in `SKILL.md`.
