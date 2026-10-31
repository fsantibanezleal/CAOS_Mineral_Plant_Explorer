"""Fixtures of the template's own planted-defect tests: the same ones as tests/adversarial/, imported from there so they exist once."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "adversarial"))

from adversarial_fixtures import _sandboxed_pipeline, base_copy, docs, repo, sdd_repo  # noqa: E402, F401
