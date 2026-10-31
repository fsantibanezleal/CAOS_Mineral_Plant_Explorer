"""scripts/check_documents.py on a copy of the example's committed documents (the repository's data, models, fixtures and examples):
valid as committed, and failing on a drift planted into one of them. The tests on a tree whose catalog names other documents stay in
tests/contracts/test_check_documents.py."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from contract_schemas import ROOT, edit

SCRIPT = ROOT / "scripts" / "check_documents.py"


def run(root: Path | None = None) -> subprocess.CompletedProcess:
    args = [str(root)] if root else []
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True, cwd=ROOT)


@pytest.fixture()
def copy(tmp_path: Path) -> Path:
    r = tmp_path / "repo"
    shutil.copytree(ROOT / "data", r / "data")
    shutil.copytree(ROOT / "models", r / "models")
    shutil.copytree(ROOT / "docs" / "contracts" / "fixtures", r / "docs" / "contracts" / "fixtures")
    shutil.copytree(ROOT / "docs" / "contracts" / "examples", r / "docs" / "contracts" / "examples")
    shutil.copy2(ROOT / "docs" / "contracts" / "catalog.md", r / "docs" / "contracts" / "catalog.md")  # the guard reads its rows
    return r


def test_the_repository_is_valid():
    p = run()
    assert p.returncode == 0, p.stdout + p.stderr
    assert "documents:" in p.stdout and "valid" in p.stdout


def test_a_copy_is_valid(copy):
    p = run(copy)
    assert p.returncode == 0, p.stdout + p.stderr


def test_adversarial_a_pattern_violation_fails(copy):
    # artifact.path must not contain ".." (the schema's pattern)
    edit(copy / "data" / "derived" / "manifests" / "EX01_subcritical.json",
         lambda m: m["artifact"].update(path="EX01_subcritical/../trace.json"))
    p = run(copy)
    assert p.returncode == 1, p.stdout + p.stderr
    assert "EX01_subcritical" in p.stdout and "artifact/path" in p.stdout


def test_a_min_items_violation_fails(copy):
    # the readiness holds one row per catalog row: an empty list violates minItems
    edit(copy / "data" / "derived" / "readiness.json", lambda d: d.update(contracts=[]))
    p = run(copy)
    assert p.returncode == 1, p.stdout + p.stderr
    assert "readiness.json" in p.stdout


def test_the_provider_tree_and_the_examples_are_checked(copy):
    edit(copy / "docs" / "contracts" / "fixtures" / "data" / "derived" / "manifests" / "FX01_fixture.json",
         lambda m: m.update(schema="example.manifest/v3"))
    edit(copy / "docs" / "contracts" / "examples" / "api-unavailable.json", lambda d: d["detail"].update(state="gone"))
    p = run(copy)
    assert p.returncode == 1, p.stdout + p.stderr
    assert "FX01_fixture" in p.stdout and "api-unavailable.json" in p.stdout


def test_a_document_that_is_not_json_fails(copy):
    (copy / "data" / "derived" / "EX02_epidemic" / "trace.json").write_text("{not json", encoding="utf-8")
    p = run(copy)
    assert p.returncode == 1, p.stdout + p.stderr
    assert "EX02_epidemic" in p.stdout


def test_an_absent_index_fails(copy):
    (copy / "data" / "derived" / "manifests" / "index.json").unlink()
    assert run(copy).returncode == 1


def test_a_declared_partial_bake_is_valid(copy):
    # an absent document is check_artifacts.py's business (it has the readiness to tell declared from undeclared)
    (copy / "data" / "derived" / "EX03_fast_burn" / "trace.json").unlink()
    assert run(copy).returncode == 0
