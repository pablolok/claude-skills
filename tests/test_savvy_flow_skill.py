"""Tests for the savvy-flow skill: published as a plugin whose root is the skill and whose `agents/` folder ships the
tiered workers and the Codex relay, with the upstream licence and attribution travelling alongside."""

from __future__ import annotations

import json
import pathlib
import re
import shutil
import subprocess
import sys
import typing
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import REPO, PublishedSkillChecks, frontmatter  # noqa: E402  pylint: disable=wrong-import-position

SKILL = "savvy-flow"
SOURCE = REPO / "skills" / SKILL
PUBLISHED = REPO / "published" / "workflow" / SKILL
MARKETPLACE = REPO / ".claude-plugin" / "marketplace.json"
CODEX_RELAYS = ("savvy-codex-astra", "savvy-codex-luna", "savvy-codex-sol", "savvy-codex-terra")
#: The relays that run Gemini through the Antigravity CLI, each pinned to one model and its default effort.
GEMINI_MODELS = {"savvy-gemini-argon": ("gemini-4-argon", "medium"), "savvy-gemini-carbon": ("gemini-4-carbon", "high"),
                 "savvy-gemini-flash": ("gemini-3.8-flash", "low"),
                 "savvy-gemini-hydrogen": ("gemini-4-hydrogen", "high")}
GEMINI_RELAYS = tuple(GEMINI_MODELS)
WORKERS = ("savvy-careful", *CODEX_RELAYS, "savvy-fable", *GEMINI_RELAYS, "savvy-heavy", "savvy-light", "savvy-medium",
           "savvy-tools")
#: The tiers that run with a tool allowlist rather than every tool the parent has.
LEAN_WORKERS = ("savvy-light", "savvy-medium")
#: The relays that run Codex or Gemini: lean too, and they edit no project file themselves.
RELAY_WORKERS = (*CODEX_RELAYS, *GEMINI_RELAYS)
#: The MIT licence asks for its copyright and permission notice to stay with every copy.
COPYRIGHT = "Copyright (c) 2026 johnnyvizz"
PERMISSION = "The above copyright notice and this permission notice shall be included in all"
ATTRIBUTION = "Originally by johnnyvizz (github.com/johnnyvizz/claude-kit), MIT; imported from main on 2026-10-11."
#: The host app's MCP servers for its task list and turn summary, and for separate sessions: a worker reports to the
#: orchestrator, so it gets neither.
HOST_ORCHESTRATION_SERVERS = {"mcp__ccd_turn", "mcp__ccd_session"}
#: The agents panel's manifest, whose `theme` option the chat themes follow.
PANEL_MANIFEST = REPO / "skills" / "savvy-progress" / ".claude-plugin" / "plugin.json"
#: The panel's `theme` values that name no chat theme of their own.
PANEL_NON_THEMES = {"auto", "classic"}
#: The chat themes, out of the skill's core: one section per month, read a section or a row at a time.
THEMES = pathlib.Path("references") / "themes.md"
#: The rules for choosing and wearing a chat theme, out of the skill's core and read once when the flow starts.
CHAT_THEMES = pathlib.Path("references") / "chat-themes.md"
#: The progress bar's calls, out of the skill's core.
PROGRESS_BAR = pathlib.Path("references") / "progress-bar.md"
#: A host's own task list, turn summary and sessions, out of the skill's core.
HOST_TOOLS = pathlib.Path("references") / "host-tools.md"
#: The Codex tier's rules, out of the skill's core.
CODEX = pathlib.Path("references") / "codex.md"
#: The Gemini tier's rules, out of the skill's core.
GEMINI = pathlib.Path("references") / "gemini.md"
#: A read-only Gemini run: every file write and every shell command denied, by permission action.
GEMINI_READ_ONLY = '{"permissions":{"deny":["write_file(*)","command(*)"]}}'
#: Antigravity loads at most this many bytes of a SKILL.md body and silently drops the rest.
ANTIGRAVITY_SKILL_LIMIT = 24000
#: A reference the skill points at, such as `references/codex.md`.
REFERENCE_LINK = re.compile(r"references/[\w.-]+\.md")
MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November",
          "December")
#: A feast that moves with Easter names no month in its window: the months the panel's calendar can put it in
#: (Carnival, 58 to 47 days before Easter; the Easter holidays, 3 days before to 2 after; Easter and its Monday).
MOVABLE_FEASTS = {"carnival": ("January", "February", "March"), "easter-holidays": ("March", "April"),
                  "easter": ("March", "April")}
#: A window from a day of one month to a day, or the end, of another: `March 1 – May 31`, `the end of February`.
MONTH_SPAN = re.compile(r"({0}) \d+ – (?:({0}) \d+|the end of ({0}))".format("|".join(MONTHS)))


def _read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def _flat(text: str) -> str:
    """The text with every run of whitespace as one space, so a rule reads the same however its lines wrap."""
    return " ".join(text.split())


def _months_of(theme: str, window: str) -> typing.Tuple[str, ...]:
    """The months a theme's window can reach, read off the window as the table words it."""
    if theme in MOVABLE_FEASTS:
        return MOVABLE_FEASTS[theme]
    span = MONTH_SPAN.search(window)
    if span is None:
        return tuple(month for month in MONTHS if month in window)
    first, last = MONTHS.index(span.group(1)), MONTHS.index(span.group(2) or span.group(3))
    return tuple(MONTHS[(first + step) % 12] for step in range((last - first) % 12 + 1))


def _theme_sections(text: str) -> typing.Dict[str, typing.Dict[str, str]]:
    """Each month's section of the themes file: its rows by theme id."""
    sections: typing.Dict[str, typing.Dict[str, str]] = {}
    month = ""
    for line in text.splitlines():
        if line.startswith("## "):
            month = line.removeprefix("## ").strip()
            sections[month] = {}
        elif month and line.startswith("| `"):
            sections[month][line.split("`")[1]] = line
    return sections


def _flow_list(value: str) -> typing.Set[str]:
    """The items of a one-line YAML flow sequence such as ``[a, b]``."""
    return {item.strip() for item in value.strip().removeprefix("[").removesuffix("]").split(",") if item.strip()}


class TestSavvyFlowSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = SKILL


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TestCodexStatusScript(unittest.TestCase):
    def test_node_suite_passes(self) -> None:
        script = SOURCE / "scripts" / "codex-status.test.mjs"
        result = subprocess.run(
            ["node", "--test", "--test-isolation=none", str(script)], cwd=REPO,
            capture_output=True, text=True, encoding="utf-8", check=False, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TestGeminiStatusScript(unittest.TestCase):
    def test_node_suite_passes(self) -> None:
        script = SOURCE / "scripts" / "gemini-status.test.mjs"
        result = subprocess.run(
            ["node", "--test", "--test-isolation=none", str(script)], cwd=REPO,
            capture_output=True, text=True, encoding="utf-8", check=False, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class TestWorkers(unittest.TestCase):
    """The workers ship in the plugin's `agents/` folder, as the source has them."""

    def test_the_workers_are_published_as_the_source(self) -> None:
        expected = [f"{name}.md" for name in WORKERS]
        self.assertEqual(sorted(path.name for path in (SOURCE / "agents").glob("*.md")), expected)
        self.assertEqual(sorted(path.name for path in (PUBLISHED / "agents").glob("*.md")), expected, "publish the skill")
        for name in expected:
            self.assertEqual(_read(PUBLISHED / "agents" / name), _read(SOURCE / "agents" / name), name)

    def test_each_worker_is_named_by_its_file_and_runs_on_a_model(self) -> None:
        for name in WORKERS:
            with self.subTest(worker=name):
                fields = frontmatter(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertEqual(fields.get("name"), name)
                self.assertTrue(fields.get("model"), "a worker names its model")
                self.assertTrue(fields.get("description"))

    def test_each_worker_is_denied_the_host_task_list_and_session_tools(self) -> None:
        for name in WORKERS:
            with self.subTest(worker=name):
                fields = frontmatter(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertEqual(_flow_list(fields.get("disallowedTools", "")), HOST_ORCHESTRATION_SERVERS)

    def test_the_lean_workers_keep_files_shell_and_progress_and_nothing_else(self) -> None:
        # Light and Medium start without the listing of every tool and skill, which is most of a fresh worker's
        # context; they keep what their tasks use and the step tool the agents panel reads.
        for name in LEAN_WORKERS:
            with self.subTest(worker=name):
                tools = _flow_list(frontmatter(_read(PUBLISHED / "agents" / f"{name}.md")).get("tools", ""))
                self.assertTrue({"Read", "Edit", "Write", "Bash", "ToolSearch", "mcp__savvy-progress"} <= tools)
                self.assertFalse({"Skill", "Agent"} & tools, "a lean worker loads no skill and spawns no agent")
        for name in set(WORKERS) - set(LEAN_WORKERS) - set(RELAY_WORKERS):
            with self.subTest(worker=name):
                self.assertNotIn("tools", frontmatter(_read(PUBLISHED / "agents" / f"{name}.md")))

    def test_the_codex_relays_run_codex_and_edit_nothing_themselves(self) -> None:
        for name in CODEX_RELAYS:
            with self.subTest(relay=name):
                self._check_relay(name)

    def _check_relay(self, name: str) -> None:
        fields = frontmatter(_read(PUBLISHED / "agents" / f"{name}.md"))
        tools = _flow_list(fields.get("tools", ""))
        self.assertEqual(fields.get("model"), "sonnet", "the relay is cheap: the work is Codex's")
        self.assertTrue({"Read", "Bash", "ToolSearch", "mcp__savvy-progress"} <= tools)
        self.assertFalse({"Edit", "Skill", "Agent"} & tools, "the relay never edits project files or spawns agents")
        body = _flat(_read(PUBLISHED / "agents" / f"{name}.md"))
        family = name.removeprefix("savvy-codex-")
        self.assertIn(f"whose `slug` ends with `-{family}`", body, "the relay picks the newest model of its family")
        self.assertIn("`codex login status`", body)
        self.assertIn("Never `danger-full-access`", body)
        self.assertIn("`-s read-only`", body)
        self.assertIn("`codex exec --json resume <session id> -o <last.md> - < <prompt> 2> <stderr> | node <root>/scripts/codex-status.mjs <new name> <resolved slug> > <log>`", body)
        self.assertIn("`codexStatus: <name>`", body, "the relay declares its status file to the agents panel")

    def test_the_gemini_relays_run_agy_and_edit_nothing_themselves(self) -> None:
        for name, (model, effort) in GEMINI_MODELS.items():
            with self.subTest(relay=name):
                fields = frontmatter(_read(PUBLISHED / "agents" / f"{name}.md"))
                tools = _flow_list(fields.get("tools", ""))
                self.assertEqual(fields.get("model"), "sonnet", "the relay is cheap: the work is Gemini's")
                self.assertEqual(tools, _flow_list(frontmatter(_read(PUBLISHED / "agents" / "savvy-codex-sol.md"))["tools"]),
                                 "the Gemini relays carry the Codex relays' lean tools")
                body = _flat(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertIn(f"Your model is **`{model}`**, effort `{effort}` unless the brief names another", body)
                self.assertIn("`<agy> models < /dev/null`", body, "the preflight proves the sign-in without spending quota")
                self.assertIn("else `$HOME/.local/bin/agy`", body)
                self.assertIn("Never run `agy -p` before this check passes", body)
                self.assertIn("Never `--dangerously-skip-permissions`, and never `--mode auto`", body)
                self.assertIn(f"`{GEMINI_READ_ONLY}`", body)
                self.assertIn("Never add `\"agentMode\":\"\"`", body, "it soft-denies commands and outside reads")
                self.assertIn('"command(git commit)"', body, "a task's settings deny the git commands that change state")
                # SAVVY_RELAY=1 tells the hooks agy runs that the run is a relay's, headless: no Stop hook continues it.
                self.assertIn("`SAVVY_RELAY=1 <agy> -p \"$(cat <prompt>)\" --model <model> --effort <effort> --sandbox "
                              "--settings <settings> --output-format stream-json --print-timeout <N>m < /dev/null "
                              "2> <stderr> | node <root>/scripts/gemini-status.mjs <name> <model> > <log>`", body)
                self.assertIn("`SAVVY_RELAY=1 <agy> -p \"$(cat <prompt>)\" --conversation <conversation id>", body,
                              "a follow-up is a relay's run too")
                self.assertIn("--conversation <conversation id>", body, "a follow-up continues the conversation")
                self.assertIn("`grep -c '\"state\":\"ERROR\"' <log>`", body, "a refused tool still exits 0")
                self.assertIn("`denied_actions`", body)
                self.assertIn("`git status --porcelain` and `git rev-parse HEAD`", body)
                self.assertIn("`geminiStatus: <name>`", body, "the relay declares its status file to the agents panel")
                self.assertIn("names a model wins", body)

    def test_every_worker_closes_its_step_count_before_reporting(self) -> None:
        # The report itself is rarely reported as a step: without a closing call a finished worker stays at 5/7.
        for name in WORKERS:
            with self.subTest(worker=name):
                body = _flat(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertIn("Before your final report, make one last call with `done` equal to `total`", body)

    def test_every_worker_says_how_many_steps_it_skipped_instead_of_counting_them_done(self) -> None:
        # A closed count alone reads 6/6 for a worker that skipped a step as for one that did them all.
        for name in WORKERS:
            with self.subTest(worker=name):
                body = _flat(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertIn("if you left planned steps undone, `skipped` set to how many (a step merged into another "
                              "is done, not skipped)", body)
                self.assertIn("Name the skipped steps in your report.", body)
                self.assertNotIn("whatever steps you merged or skipped", body)

    def test_every_worker_reports_each_step_as_it_starts_and_before_each_long_command(self) -> None:
        # A worker that reports only as a step finishes is silent for the whole of a long step: its row stayed at 0/7
        # through twenty minutes of timed runs, and the user took it for a stuck agent.
        for name in WORKERS:
            with self.subTest(worker=name):
                body = _flat(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertIn("call it again at the start of each step", body)
                self.assertIn("and before any command you expect to run longer than a minute, its `note` naming that "
                              "command", body)
                self.assertNotIn("never \"working\", as each step finishes", body)

    def test_every_worker_leaves_no_background_command_running_after_its_report(self) -> None:
        # The host moves a long foreground command to the background, and a polling loop with it; both outlive the
        # report, and the host keeps a worker that owns live background work listed as waiting, not finished.
        for name in WORKERS:
            with self.subTest(worker=name):
                body = _flat(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertIn("is moved to the background by the host and keeps running", body)
                self.assertIn("`run_in_background: true`", body)
                self.assertIn("Never wait with an unbounded polling loop", body)
                self.assertIn("stop every background command you started that is still running (`TaskStop`", body)
        for name in (*LEAN_WORKERS, *RELAY_WORKERS):
            with self.subTest(worker=name):
                tools = _flow_list(frontmatter(_read(PUBLISHED / "agents" / f"{name}.md")).get("tools", ""))
                self.assertIn("TaskStop", tools, "a lean worker stops its own background commands")

    def test_the_orchestrator_neither_repeats_the_step_rule_nor_accepts_leftover_background_work(self) -> None:
        body = _flat(_read(PUBLISHED / "SKILL.md"))
        self.assertIn("a brief does not repeat the step rule", body)
        self.assertIn("is waiting on its own background work", body)

    def test_the_plugin_root_brings_the_agents_with_it(self) -> None:
        # Claude Code finds `agents/` at the plugin root (savvy-flow:savvy-careful and so on) under the default
        # entry; declaring them too would register each worker twice, and an own manifest would conflict with it.
        [entry] = [plugin for plugin in json.loads(_read(MARKETPLACE))["plugins"] if plugin["name"] == SKILL]
        self.assertEqual(entry["skills"], ["./"])
        self.assertIs(entry["strict"], False)
        self.assertNotIn("agents", entry)
        self.assertFalse((PUBLISHED / ".claude-plugin").exists())


class TestSkill(unittest.TestCase):
    def test_the_skill_runs_only_when_named(self) -> None:
        fields = frontmatter(_read(PUBLISHED / "SKILL.md"))
        self.assertEqual(fields.get("disable-model-invocation"), "true")
        self.assertEqual(fields.get("argument-hint"), "<task description>")

    def test_the_skill_names_every_worker_it_delegates_to(self) -> None:
        text = _read(PUBLISHED / "SKILL.md")
        for name in WORKERS:
            self.assertIn(f"`{name}`", text)

    def test_the_whole_skill_file_fits_what_antigravity_loads(self) -> None:
        # Antigravity drops whatever follows its limit without a word: situational rules live in `references/`.
        self.assertLess(len((SOURCE / "SKILL.md").read_bytes()), ANTIGRAVITY_SKILL_LIMIT)

    def test_every_reference_the_skill_points_at_exists(self) -> None:
        links = set(REFERENCE_LINK.findall(_read(SOURCE / "SKILL.md")))
        self.assertTrue(links, "the skill points at its references")
        self.assertEqual(sorted(link for link in links if not (SOURCE / link).is_file()), [])


class TestModels(unittest.TestCase):
    """Workers run at their tier's model: an agent with no model of its own inherits the session's, the orchestrator's."""

    def setUp(self) -> None:
        self.text = _flat(_read(PUBLISHED / "SKILL.md"))

    def test_every_agent_call_runs_a_savvy_type_never_one_that_inherits(self) -> None:
        self.assertIn("**Every Agent call you make runs a savvy worker type.**", self.text)
        self.assertIn("Never `fork`; never `general-purpose`.", self.text)
        self.assertIn("Use an Explore subagent only for wide searches, with `model` set to `haiku` or `sonnet`", self.text)

    def test_the_model_rule_comes_before_the_flow_and_the_themes_after_it(self) -> None:
        self.assertLess(self.text.index("## Models: every worker runs at its tier's model"), self.text.index("## 1. Understand"))
        self.assertGreater(self.text.index("## Themes"), self.text.index("## 6. Close"))

    def test_fable_runs_only_with_the_user_s_yes_and_a_reason(self) -> None:
        self.assertIn("**`savvy-fable`, `savvy-codex-astra` and `savvy-gemini-carbon` are for plans only**", self.text)
        self.assertIn("**Each launch, and each resume, runs on the user's explicit yes**, whatever model you are", self.text)
        self.assertIn("why Fable rather than Heavy", self.text)
        self.assertIn("record their words with the `decide` tool (`tier: \"fable\"`, `\"astra\"` or `\"carbon\"`",
                      self.text)
        self.assertIn("goes to Heavy, or Sol for Codex, Hydrogen for Gemini, unless the user explicitly asks for Fable",
                      self.text)
        self.assertIn("**Plans only**, each launch on the user's explicit yes, recorded with `decide` (`tier: \"carbon\"`)",
                      self.text)
        self.assertIn("**Spend**: split every piece by kind of work", self.text)
        self.assertIn("One fresh worker per step, never one worker resumed for hours", self.text)

    def test_the_orchestrator_is_the_session_s_model_never_another(self) -> None:
        self.assertIn("**You are the session's model.** The orchestrator runs on the model and effort the user selected "
                      "for the session", self.text)
        self.assertIn("Never switch the session's model or effort, and never propose another.", self.text)
        self.assertNotIn("reference setup", self.text)
        self.assertNotIn("Fable is the reference", _flat(_read(PUBLISHED / "README.md")))

    def test_a_general_instruction_on_model_or_effort_covers_every_task_it_describes(self) -> None:
        self.assertIn("A general instruction (every agent on one model, every review at one effort) covers every task it "
                      "describes", self.text)
        self.assertIn("it holds until they change it: never ask again task by task", self.text)
        self.assertIn("Setting Fable this way is the yes its rule asks for.", self.text)
        self.assertIn("settles that task only, unless they set Fable themselves for more (next rule)", self.text)

    def test_a_model_or_effort_the_user_sets_reaches_the_call_the_plan_and_the_bar(self) -> None:
        self.assertIn("**A model or an effort the user sets wins over the tier's.**", self.text)
        self.assertIn("Pass it as `model` / `effort` in each such task's Agent call", self.text)
        self.assertIn("declare it in the bar (the task's `effort`, `model`), never in the title", self.text)
        self.assertIn("A worker already running keeps what it started with", self.text)
        self.assertIn("A Codex or Gemini task takes it in its brief", self.text)
        self.assertIn("plus `effort`, `model` and `agent` where section \"Models\" says so, repeated every time",
                      _flat(_read(PUBLISHED / PROGRESS_BAR)))

    def test_an_agent_the_project_requires_is_a_task_of_the_plan_and_of_the_bar(self) -> None:
        self.assertIn("**An agent the project requires** (its own reviewer, its auditor) runs as that type", self.text)
        self.assertIn('declared in the bar with `tier: "other"`, `agent` (its type) and its `model` and `effort`', self.text)

    def test_legwork_and_late_requests_get_a_tier(self) -> None:
        self.assertIn("**Legwork has a tier too**", self.text)
        self.assertIn("never sent to a generic agent", self.text)

    def test_codex_is_optional_marked_in_the_plan_and_reviewed(self) -> None:
        codex = _flat(_read(PUBLISHED / CODEX))
        self.assertIn("one shell call at the start, `codex login status`", self.text)
        self.assertIn("A Codex task is marked as such in the plan you present before it is delegated, with its intensity.", codex)
        self.assertIn("Its work gets the same adversarial review as any other tier.", codex)

    def test_gemini_is_optional_marked_in_the_plan_and_reviewed(self) -> None:
        gemini = _flat(_read(PUBLISHED / GEMINI))
        self.assertIn("one shell call at the start, `agy models < /dev/null`", self.text)
        self.assertIn("references/gemini.md", self.text)
        self.assertIn("a Gemini task marked as such before it is delegated", gemini)
        self.assertIn("Its work gets the same adversarial review as any other tier.", gemini)
        self.assertIn("**Gemini does not load Claude Code's skills or `CLAUDE.md`.**", gemini)
        self.assertIn("reaches it only when the brief names its `SKILL.md` by absolute path", gemini)

    def test_a_second_opinion_comes_from_another_family(self) -> None:
        gemini = _flat(_read(PUBLISHED / GEMINI))
        self.assertIn("take it from another family, Codex Sol or Gemini Hydrogen, whichever is available, or both for a "
                      "high-risk diff", self.text)
        self.assertIn("never move work there on your own to spare Claude", gemini)
        self.assertIn("each launch on the user's explicit yes recorded with `decide` (`tier: \"carbon\"`)", gemini)

    def test_codex_gets_the_claude_skills_it_needs_by_path(self) -> None:
        codex = _flat(_read(PUBLISHED / CODEX))
        self.assertIn("**Codex does not load Claude Code's skills or `CLAUDE.md`.**", codex)
        self.assertIn("reaches it only when the brief names its `SKILL.md` by absolute path", codex)


class TestHostTools(unittest.TestCase):
    """A host's own task list, turn summary and sessions run alongside the flow, never in place of it."""

    def setUp(self) -> None:
        self.text = _flat(_read(PUBLISHED / "SKILL.md"))

    @property
    def host(self) -> str:
        """The host tools' rules, out of the skill's core."""
        return _flat(_read(PUBLISHED / HOST_TOOLS))

    def test_the_host_task_list_holds_the_tiered_plan_and_the_progress_bar_stays(self) -> None:
        self.assertIn("**The host's task list holds the plan.** Its steps are the worker tasks, in plan order, each led "
                      "by its tier", self.host)
        self.assertIn("a step is done when its task is accepted in review (section 5), not when the worker returns",
                      self.host)
        self.assertIn("The progress bar stays current as well.", self.host)

    def test_workers_are_never_moved_to_a_separate_session(self) -> None:
        self.assertIn("**Workers are always Agent tool calls.** Never move a worker task to a separate session",
                      self.host)

    def test_a_turn_summary_does_not_close_the_flow(self) -> None:
        self.assertIn("**A turn summary closes a turn, not the flow.**", self.host)
        self.assertIn("Section 6 runs once, after the last task is accepted.", self.host)

    def test_the_budget_is_reported_in_local_time_to_the_minute_never_as_utc(self) -> None:
        self.assertIn("**Report the budget in the user's local time, to the minute.**", self.text)
        self.assertIn("one compact line per window of each family you report (5-hour and weekly)", self.text)
        self.assertIn("with the day when it is not today, and the time of the reading", self.text)
        self.assertIn("are UTC (`...Z`): read the machine's local time and offset first", self.text)
        self.assertIn("never present a UTC time as local", self.text)
        self.assertLess(self.text.index("## 4. Delegate"), self.text.index("**Report the budget in the user's local"))


class TestThemes(unittest.TestCase):
    """The chat theme is the user's ask, else the agents panel's `theme` option, else the calendar: one setting for
    both, so chat and panel never disagree."""

    def setUp(self) -> None:
        self.text = _flat(_read(PUBLISHED / "SKILL.md"))

    @property
    def rules(self) -> str:
        """How a chat theme is chosen and worn, out of the skill's core."""
        return _flat(_read(PUBLISHED / CHAT_THEMES))

    def test_a_theme_the_user_asks_for_holds_for_the_session(self) -> None:
        self.assertIn("**The user asks for one** (by name, or for none) → that one for the rest of the session",
                      self.rules)

    def test_the_panel_option_is_read_from_the_host_and_classic_keeps_chat_plain(self) -> None:
        self.assertIn("`claude plugin configure savvy-progress@pablolok-skills --json`: its `inputs.theme`", self.rules)
        self.assertIn("`classic` means no theme in chat", self.rules)
        self.assertIn("falls through to the calendar", self.rules)

    def test_a_theme_set_from_the_panel_switches_chat_from_the_next_message(self) -> None:
        self.assertIn("`/savvy-theme <theme|auto>` or from the theme picker in the panel", self.rules)
        self.assertIn("switches chat to that theme from your next message", self.rules)

    def test_the_calendar_puts_a_holiday_over_a_period_and_a_period_over_its_season(self) -> None:
        self.assertIn("A holiday wins over the period it falls in, a period over its season.", self.rules)

    def test_the_themes_live_in_a_reference_read_a_month_or_a_row_at_a_time(self) -> None:
        self.assertEqual(_read(PUBLISHED / THEMES), _read(SOURCE / THEMES), "publish the skill")
        self.assertNotIn("| Theme | When |", self.text, "the table loads with every flow: it belongs in the reference")
        self.assertIn("The themes are in `references/themes.md`, one section per month", self.rules)
        self.assertIn("the current month's section alone", self.rules)
        self.assertIn("its row alone", self.rules)

    def test_every_theme_the_panel_can_pin_has_a_chat_row(self) -> None:
        options = json.loads(_read(PANEL_MANIFEST))["userConfig"]["theme"]["options"]
        rows = {theme for section in _theme_sections(_read(PUBLISHED / THEMES)).values() for theme in section}
        self.assertEqual(rows, set(options) - PANEL_NON_THEMES)

    def test_each_month_holds_every_theme_whose_window_can_reach_it_and_no_other(self) -> None:
        sections = _theme_sections(_read(PUBLISHED / THEMES))
        self.assertEqual(tuple(sections), MONTHS)
        rows = {theme: row for section in sections.values() for theme, row in section.items()}
        for theme, row in sorted(rows.items()):
            with self.subTest(theme=theme):
                window = row.split("|")[2].strip()
                holding = tuple(month for month in MONTHS if theme in sections[month])
                self.assertEqual(holding, tuple(sorted(_months_of(theme, window), key=MONTHS.index)))
                # One theme, one row: the same marks whichever month it is read from.
                self.assertEqual({sections[month][theme] for month in holding}, {row})

    def test_each_theme_row_has_every_mark_the_rules_use(self) -> None:
        text = _read(PUBLISHED / THEMES)
        header = next(line for line in text.splitlines() if line.startswith("| Theme |"))
        columns = [cell.strip() for cell in header.strip("|").split("|")]
        self.assertEqual(columns, ["Theme", "When", "Fable", "Heavy", "Careful", "Medium", "Light", "You",
                                   "Accepted · returned · escalated", "Closing line"])
        for month, section in _theme_sections(text).items():
            for theme, row in section.items():
                with self.subTest(month=month, theme=theme):
                    cells = [cell.strip() for cell in row.strip("|").split("|")]
                    self.assertEqual(len(cells), len(columns))
                    self.assertTrue(all(cells), "an empty cell")


class TestLicence(unittest.TestCase):
    def test_the_upstream_licence_and_attribution_travel_with_every_copy(self) -> None:
        for folder in (SOURCE, PUBLISHED):
            with self.subTest(folder=folder.relative_to(REPO).as_posix()):
                licence = _read(folder / "LICENSE")
                self.assertIn(COPYRIGHT, licence)
                self.assertIn(PERMISSION, licence)
                self.assertIn(ATTRIBUTION, " ".join(_read(folder / "README.md").split()))


if __name__ == "__main__":
    unittest.main()
