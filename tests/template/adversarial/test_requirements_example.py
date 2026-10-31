"""Plants that need the example workbench or the template tree (EX-006, EX-007, EX-013): the live engine drifting from the Python
engine, and the residue guard on the example. The other refutations stay in tests/adversarial/test_requirements_refuted.py."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
from planting import NODE, NODE_MODULES, ROOT, edit, guard, link_node_modules, unlink_node_modules

needs_web = pytest.mark.skipif(NODE is None or not (NODE_MODULES / "@fasl-work").is_dir(),
                               reason="needs node and `npm ci` in frontend/")


# the residue of the template's own example exists only in the template: in an instantiated product (no .template-source)
# the planted copy has no sentinel to remove and no example to find (BD-1, CAOS_ChancaDEM 2026-10-26)
TEMPLATE_ONLY = pytest.mark.skipif(not (ROOT / ".template-source").exists(),
                                   reason="the template's example residue exists only in the template repository (.template-source)")


def test_adversarial_example_residue_planted_in_any_repository_fails_the_residue_guard(tmp_path: Path) -> None:
    """EX-013 in every repository, the products included: example residue planted in a throwaway git tree's helper scripts
    makes the guard fail and name each line (the test above needs the template's own example and runs only there)."""
    tree = tmp_path / "tree"
    tree.mkdir()
    for i in range(10):
        (tree / f"filler{i}.txt").write_text(f"filler {i}\n", encoding="utf-8")
    (tree / "scripts").mkdir()
    (tree / "scripts" / "precompute.ps1").write_text("# E.g.:  ./scripts/precompute.ps1 EX02_epidemic --seed 7\n", encoding="utf-8")
    (tree / "scripts" / "precompute.sh").write_text("# the tiny teaching engine\n", encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=tree, check=True)
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "check_template_residue.py"), str(tree)], capture_output=True, text=True)
    assert r.returncode == 1, r.stdout
    assert "scripts/precompute.ps1:1: an example case id" in r.stdout and "scripts/precompute.sh:1: prose about the example engine" in r.stdout


@TEMPLATE_ONLY
def test_adversarial_an_instantiated_product_that_keeps_the_example_fails_the_residue_guard(repo: Path) -> None:
    (repo / ".template-source").unlink()
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    r = guard(repo, "check_template_residue.py")
    assert r.returncode == 1 and "SIR" in r.stdout, r.stdout


@needs_web
def test_adversarial_an_engine_that_drifts_from_the_python_engine_fails_the_parity_and_convergence_tests(repo: Path) -> None:
    link_node_modules(repo / "frontend")
    try:
        vitest = repo / "frontend" / "node_modules" / "vitest" / "vitest.mjs"
        args = [NODE, str(vitest), "run", "src/engine/sir.parity.test.ts"]
        clean = subprocess.run(args, capture_output=True, encoding="utf-8", errors="replace", cwd=repo / "frontend", timeout=300)
        assert clean.returncode == 0 and "passed" in clean.stdout + clean.stderr, clean.stdout + clean.stderr
        edit(repo, "frontend/src/engine/sir.ts", "const newRec = p.gamma * I * dt;", "const newRec = p.gamma * I * dt * 1.01;")
        r = subprocess.run(args, capture_output=True, encoding="utf-8", errors="replace", cwd=repo / "frontend", timeout=300)
        out = r.stdout + r.stderr
        assert r.returncode == 1 and "EX02_epidemic" in out and "converges to the final size at first order" in out, out
    finally:
        unlink_node_modules(repo / "frontend")
