"""Contratti delle istruzioni che evitano lavoro ripetuto senza perdere evidenza."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / 'skills'


class EfficiencyContractsTest(unittest.TestCase):
    def test_jira_declares_opt_in_cadence_with_compatible_default(self):
        text = (ROOT/'jira-workflow/SKILL.md').read_text(encoding='utf-8')
        self.assertIn('| Update cadence |', text)
        self.assertIn('entry-exit', text)
        self.assertIn('continuous remains the default', text)

    def test_retrospective_can_end_without_edits_or_transcript_sweep(self):
        text = (ROOT/'skill-retrospective/SKILL.md').read_text(encoding='utf-8')
        self.assertIn('No observed problem', text)
        self.assertIn('no skill edits', text)
        self.assertIn('references/investigation-and-rewrite.md', text)
        self.assertNotIn('For every skill, open the whole file', text)

    def test_gate_reuse_requires_identical_inputs_and_known_provenance(self):
        text = (ROOT/'verification-gates/SKILL.md').read_text(encoding='utf-8')
        self.assertIn('Evidence reuse', text)
        self.assertIn('untracked files', text)
        self.assertIn('after compaction', text.lower())
        self.assertIn('environment', text)


if __name__ == '__main__':
    unittest.main()
