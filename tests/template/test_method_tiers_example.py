"""The template keeps passing its own gates as a teaching example of the method tiers (template 0.13.000): its SDD ladder fills
the tier column, its sota method is named by its level 3 notebook in both languages, it claims nothing beyond the state of the
art and declares no manuscript, all because ``.template-source`` marks it as the template. A product (no sentinel) is held to
the full rule; the plants are in tests/test_method_tiers.py. These tests need the example, so instantiate.py removes them."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SDD = ROOT / "docs" / "design" / "SDD.md"


def run(script: str, root: Path = ROOT, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(ROOT / "scripts" / script), str(root), *args], capture_output=True, encoding="utf-8", errors="replace")


def ladder_rows() -> list[list[str]]:
    section = SDD.read_text(encoding="utf-8").split("## Method ladder", 1)[1].split("\n## ", 1)[0]
    rows = [[c.strip() for c in ln.strip().strip("|").split("|")] for ln in section.splitlines() if ln.strip().startswith("|")]
    return [r for r in rows[2:]]


def test_the_template_is_marked_as_the_template() -> None:
    assert (ROOT / ".template-source").is_file()


def test_the_example_ladder_fills_the_tier_column_with_a_classical_and_a_sota_method() -> None:
    head = [c.strip().lower() for c in next(ln for ln in SDD.read_text(encoding="utf-8").splitlines() if ln.strip().startswith("| id")).strip("| ").split("|")]
    assert head[:2] == ["id", "tier"]
    tiers = {row[1] for row in ladder_rows()}
    assert {"classical", "sota"} <= tiers and tiers <= {"classical", "sota", "beyond"}


def test_the_example_still_claims_nothing_beyond_the_state_of_the_art() -> None:
    assert "None claimed." in SDD.read_text(encoding="utf-8")
    assert not [r for r in ladder_rows() if r[1] == "beyond"]


def test_every_sota_method_of_the_example_is_named_by_a_level_3_notebook_in_both_languages() -> None:
    sota = {r[0] for r in ladder_rows() if r[1] == "sota"}
    assert sota
    for lang in ("en", "es"):
        named: set[str] = set()
        for path in (ROOT / "notebooks" / lang).rglob("*.ipynb"):
            caos = json.loads(path.read_text(encoding="utf-8"))["metadata"]["caos"]
            if caos["level"] == 3:
                named.update(caos.get("methods", []))
        assert sota <= named, lang


def test_the_template_gates_pass_on_the_template() -> None:
    for script in ("check_sdd.py", "check_notebooks.py", "check_manuscripts.py"):
        r = run(script)
        assert r.returncode == 0, f"{script}: {r.stdout}{r.stderr}"


def test_the_same_files_fail_as_a_product(tmp_path: Path) -> None:
    """Without the sentinel the example is a product that claims nothing beyond the state of the art and has no manuscript."""
    product = tmp_path / "product"
    for name in ("docs", "scripts", "content", "product.json", "VERSION"):
        src = ROOT / name
        shutil.copytree(src, product / name, ignore=shutil.ignore_patterns("__pycache__")) if src.is_dir() else shutil.copy2(src, product / name)
    sdd = run("check_sdd.py", product)
    assert sdd.returncode == 1 and "method-tiers-and-manuscripts.md" in sdd.stdout and re.search(r"no beyond method|None claimed", sdd.stdout)
    manuscripts = run("check_manuscripts.py", product)
    assert manuscripts.returncode == 1 and "technical-report" in manuscripts.stdout
