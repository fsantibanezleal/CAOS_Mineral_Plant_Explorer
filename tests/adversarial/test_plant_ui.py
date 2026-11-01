"""Local release browser gate; full browser tooling is deliberately outside cheap CI."""

import os
from pathlib import Path
import subprocess
import pytest


@pytest.mark.skipif(
    os.environ.get("OREBRIDGE_BROWSER_GATES") != "1",
    reason="Local browser release gate: set OREBRIDGE_BROWSER_GATES=1 with the built preview running",
)
def test_adversarial_phone_focus_and_selection():
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["node", "frontend/scripts/check-plant-ui.mjs"],
        cwd=root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=180,
    )
    assert result.returncode == 0, result.stdout + result.stderr
