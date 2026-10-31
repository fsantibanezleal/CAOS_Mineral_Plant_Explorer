"""The holes an adversarial review found in the spec-area guards (0.05.000) that are planted into the example: the example workbench's
requirement rows (EX-001, EX-002), the example's trace schema and its catalog history rows. The base guards are taken verbatim by
every product and tested here, in the template; instantiate.py removes tests/template/. The plants that need no example stay in
tests/adversarial/test_guard_holes.py. The ids (S-1a, C-3, T-8, B-1 ...) are the rows of the review's refutation table
(CAOS_MANAGE wip/product-template/review-0-05-000-guards-2026-10-11.md, D2)."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from planting import SDD, sdd, sdd_text, section, drop_row, edit, git_commit, guard, make_tree, set_cell

VERSIONS_INPUTS = ("scripts/*.py", "docs/contracts")
FEATURES = "docs/design/features"
WORKBENCH = f"{FEATURES}/workbench/requirements.md"
WORKBENCH_VALIDATION = f"{FEATURES}/workbench/validation.md"
GHOST_PY = "tests/adversarial/test_ghosts.py"
GHOST_TS = "frontend/src/ghost.test.ts"


def gate(repo: Path, cell: str, *, rid: str = "EX-001", rel: str = WORKBENCH) -> None:
    set_cell(repo, rel, rid, 2, cell)


PY_GHOSTS = {
    "S-1a a def inside a string": ('DOC = """\ndef test_ghost():\n    pass\n"""\n', "test_ghost"),
    "S-1a a def in a comment": ("# def test_ghost():\n#     pass\n", "test_ghost"),
    "S-1i a nested def": ("def helper():\n    def test_ghost():\n        pass\n", "test_ghost"),
    "S-3a a skipped test": ("import pytest\n\n\n@pytest.mark.skip\ndef test_ghost():\n    assert False\n", "test_ghost"),
    "S-3a skip with a reason": ('import pytest\n\n\n@pytest.mark.skip(reason="later")\ndef test_ghost():\n    assert False\n', "test_ghost"),
    "S-3a skipif(True)": ('import pytest\n\n\n@pytest.mark.skipif(True, reason="never")\ndef test_ghost():\n    assert False\n', "test_ghost"),
    "S-3a a skipped class": ("import pytest\n\n\n@pytest.mark.skip\nclass TestGhost:\n    def test_ghost(self):\n        assert False\n", "test_ghost"),
    "S-3a pytestmark skip": ("import pytest\n\npytestmark = pytest.mark.skip\n\n\ndef test_ghost():\n    assert False\n", "test_ghost"),
    "S-3a a module-level skip": ('import pytest\n\npytest.skip("x", allow_module_level=True)\n\n\ndef test_ghost():\n    assert False\n', "test_ghost"),
}


@pytest.mark.parametrize("plant", sorted(PY_GHOSTS))
def test_sdd_a_python_name_that_is_not_a_live_test(sdd_repo: Path, plant: str) -> None:
    text, name = PY_GHOSTS[plant]
    (sdd_repo / GHOST_PY).write_text(text, encoding="utf-8")
    gate(sdd_repo, f"`{GHOST_PY}::{name}`")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-001" in r.stdout and name in r.stdout, r.stdout


TS_GHOSTS = {
    "S-1b a // comment": "// it('adversarial: ghost', () => {})\n",
    "S-1c a block comment": "/* it('adversarial: ghost', () => {}) */\n",
    "S-1c a string": "const DOC = \"test('adversarial: ghost', () => {})\";\n",
    "S-1c a template string": "const DOC = `\nit('adversarial: ghost', () => {})\n`;\n",
    "S-1f inside another body": "it('real one', () => { const s = \"it('adversarial: ghost'\"; expect(s).toBe(s) })\n",
    "S-1f a test nested in a test": "it('real one', () => {\n  it('adversarial: ghost', () => {})\n})\n",
    "S-3b it.skip": "it.skip('adversarial: ghost', () => {})\n",
    "S-3b it.todo": "it.todo('adversarial: ghost')\n",
    "S-3c a skip option": "it('adversarial: ghost', { skip: true }, () => {})\n",
    "S-3c a describe block": "describe('adversarial: ghost', () => {})\n",
}


@pytest.mark.parametrize("plant", sorted(TS_GHOSTS))
def test_sdd_a_typescript_name_that_is_not_a_live_test(sdd_repo: Path, plant: str) -> None:
    (sdd_repo / GHOST_TS).write_text(TS_GHOSTS[plant], encoding="utf-8")
    gate(sdd_repo, f"`{GHOST_TS}::adversarial: ghost`")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-001" in r.stdout and "adversarial: ghost" in r.stdout, r.stdout


def test_sdd_s2_a_prefix_of_a_test_name_is_not_the_name(sdd_repo: Path) -> None:
    (sdd_repo / GHOST_TS).write_text("it('adversarial: ghost and more', () => {})\n", encoding="utf-8")
    gate(sdd_repo, f"`{GHOST_TS}::adversarial: gho`")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "adversarial: gho" in r.stdout, r.stdout
    gate(sdd_repo, f"`{GHOST_TS}::adversarial: ghost and more`")  # the whole name is a real test
    assert sdd(sdd_repo).returncode == 0


@pytest.mark.parametrize("plant,cell", [
    ("S-1g a markdown file with a test name", "`docs/design/SDD.md::test_anything`"),
    ("S-1g README with a test name", "`README.md::x`"),
    ("S-1h a function of a script, not a test", "`scripts/check_sdd.py::main`"),
    ("S-4 a plain README", "`README.md`"),
    ("S-4 a plain markdown design file", "`docs/design/SDD.md`"),
    ("S-4 a plain json file", "`data/derived/manifests/index.json`"),
])
def test_sdd_a_gate_that_is_not_a_test_or_a_script(sdd_repo: Path, plant: str, cell: str) -> None:
    (sdd_repo / "README.md").write_text("readme\n", encoding="utf-8")
    gate(sdd_repo, cell)
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-001" in r.stdout, r.stdout


def test_sdd_s4b_a_validation_row_that_is_not_a_plant(sdd_repo: Path) -> None:
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-002", 1, "it works")
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-002", 2, "`README.md::x`")
    (sdd_repo / "README.md").write_text("readme\n", encoding="utf-8")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-002" in r.stdout, r.stdout


def test_sdd_sv3_a_validation_gate_that_is_an_ordinary_test(sdd_repo: Path) -> None:
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-002", 1, "it works")
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-002", 2, "`tests/test_pipeline_smoke.py::test_run_all_writes_index`")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-002" in r.stdout and "adversarial" in r.stdout, r.stdout


def test_sdd_s3d_a_validation_gate_that_is_skipped(sdd_repo: Path) -> None:
    (sdd_repo / GHOST_PY).write_text("import pytest\n\n\n@pytest.mark.skip\ndef test_ghost():\n    assert False\n", encoding="utf-8")
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-002", 2, f"`{GHOST_PY}::test_ghost`")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-002" in r.stdout and "test_ghost" in r.stdout, r.stdout


def _requirements(repo: Path) -> str:
    return (repo / WORKBENCH).read_bytes().decode("utf-8")


def _row(repo: Path, rid: str) -> str:
    return next(ln for ln in _requirements(repo).split("\n") if ln.startswith(f"| {rid} "))


@pytest.mark.parametrize("plant,make", [
    ("S-5b2 a row split across two lines", lambda row: row.replace(" the same case", "\nthe same case", 1)),
    ("S-5c2 an indented row", lambda row: "  " + row),
    ("S-5d2 a row without a gate cell", lambda row: "|".join(row.split("|")[:3]) + "|"),
    ("S-5e2 a lower-case ID", lambda row: row.replace("EX-002", "ex-002", 1)),
    ("S-5g2 a bullet outside the table", lambda row: "- EX-002: THE pipeline SHALL write identical artifacts."),
])
def test_sdd_a_requirement_row_that_vanishes_with_its_validation_row(sdd_repo: Path, plant: str, make) -> None:
    row = _row(sdd_repo, "EX-002")
    edit(sdd_repo, WORKBENCH, row, make(row))
    drop_row(sdd_repo, WORKBENCH_VALIDATION, "EX-002")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and ("EX-002" in r.stdout or "ex-002" in r.stdout or "malformed" in r.stdout), r.stdout


def test_sdd_s6a_a_live_feature_relabelled_planned(sdd_repo: Path) -> None:
    text = _requirements(sdd_repo).replace("\n", "\nStatus: planned\n", 1)
    (sdd_repo / WORKBENCH).write_bytes(text.encode("utf-8"))
    (sdd_repo / WORKBENCH_VALIDATION).unlink()
    gate(sdd_repo, "`tests/test_nothing.py`")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and ".status-allow" in r.stdout and "workbench" in r.stdout, r.stdout


def test_sdd_s6d_a_live_feature_relabelled_superseded(sdd_repo: Path) -> None:
    text = _requirements(sdd_repo).replace("\n", "\nStatus: superseded\n", 1)
    (sdd_repo / WORKBENCH).write_bytes(text.encode("utf-8"))
    (sdd_repo / WORKBENCH_VALIDATION).unlink()
    r = sdd(sdd_repo)
    assert r.returncode == 1 and ".status-allow" in r.stdout and "workbench" in r.stdout, r.stdout


def test_sdd_s6e_a_feature_folder_without_requirements(sdd_repo: Path) -> None:
    folder = sdd_repo / FEATURES / "newfeat"
    folder.mkdir()
    (folder / "spec.md").write_text("a spec with no requirements\n", encoding="utf-8")
    (folder / "validation.md").write_text("nothing\n", encoding="utf-8")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "newfeat" in r.stdout and "requirements.md" in r.stdout, r.stdout


def test_sdd_s7e_headings_only_inside_a_code_fence(sdd_repo: Path) -> None:
    text = sdd_text(sdd_repo)
    a, _ = section(text, "Problem and non-goals")
    b, _ = section(text, "Research basis")
    names = ("Problem and non-goals", "Executive brief", "Sizing and contracts", "Technology and versions", "Lanes",
             "Method ladder", "Cases", "Oracles", "Deploy driver", "Risks and kill criteria", "ADR fit")
    fence = "```\n" + "".join(f"## {n}\n" for n in names) + "```\n\n"
    # the real sections other than the research basis and the resources are removed, their headings kept only in a fence
    keep = ("Research basis", "Resources")
    body = "".join(text[slice(*section(text, k))] for k in keep)
    (sdd_repo / SDD).write_bytes((text[:a] + fence + body).encode("utf-8"))
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "Lanes" in r.stdout and "no section" in r.stdout, r.stdout


def test_sdd_s7a_one_heading_for_ten_sections_and_empty_bodies(sdd_repo: Path) -> None:
    text = sdd_text(sdd_repo)
    research = text[slice(*section(text, "Research basis"))]
    resources = text[slice(*section(text, "Resources"))]
    names = ("Problem and non-goals", "Sizing and contracts", "Technology and versions", "Lanes", "Method ladder", "Cases",
             "Oracles", "Deploy driver", "Risks and kill criteria", "ADR fit")
    (sdd_repo / SDD).write_bytes((f"# SDD\n\n{resources}\n## {', '.join(names)}\n\nnothing\n\n{research}").encode("utf-8"))
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "Lanes" in r.stdout, r.stdout


def test_sdd_a_section_with_no_body_and_one_out_of_order(sdd_repo: Path) -> None:
    text = sdd_text(sdd_repo)
    a, b = section(text, "Lanes")
    (sdd_repo / SDD).write_bytes((text[:a] + "## Lanes\n\n" + text[b:]).encode("utf-8"))
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "Lanes" in r.stdout and "empty" in r.stdout, r.stdout


def _research(repo: Path, body: str) -> None:
    text = sdd_text(repo)
    a, b = section(text, "Research basis")
    (repo / SDD).write_bytes((text[:a] + "## Research basis\n\n" + body + "\n" + text[b:]).encode("utf-8"))


def test_sdd_sr1_placeholder_urls_and_unverified_inside_a_sentence(sdd_repo: Path) -> None:
    _research(sdd_repo, "- http://a.example\n- http://b.example\n- http://c.example\nNothing here is UNVERIFIED-free.\n")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "research basis" in r.stdout.lower(), r.stdout


def test_sdd_sr2_one_work_cited_three_ways(sdd_repo: Path) -> None:
    doi = "10.1098/rspa.1927.0118"
    _research(sdd_repo, f"- {doi}\n- https://doi.org/{doi}\n- http://doi.org/{doi}\n\nUNVERIFIED: none\n")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "cites 1 source" in r.stdout, r.stdout


def test_sdd_sr_unverified_must_start_a_line(sdd_repo: Path) -> None:
    text = sdd_text(sdd_repo)
    assert "\nUNVERIFIED:" in text
    (sdd_repo / SDD).write_bytes(text.replace("\nUNVERIFIED:", "\nStill, nothing is UNVERIFIED:", 1).encode("utf-8"))
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "UNVERIFIED" in r.stdout, r.stdout


def test_sdd_sres_placeholder_cells_and_one_row_for_four_stages(sdd_repo: Path) -> None:
    text = sdd_text(sdd_repo)
    a, b = section(text, "Resources")
    table = ("## Resources\n\n| stage | memory | disk | time | where it runs |\n|---|---|---|---|---|\n"
             "| bake, tests, build, deploy | - | ? | TODO | unknown |\n\n")
    (sdd_repo / SDD).write_bytes((text[:a] + table + text[b:]).encode("utf-8"))
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "Resources" in r.stdout, r.stdout


TRACE = "docs/contracts/schemas/trace.schema.json"
CATALOG = "docs/contracts/catalog.md"
LOCK = "docs/contracts/versions.lock.json"


@pytest.fixture
def versions_repo(tmp_path: Path) -> tuple[Path, str]:
    repo = make_tree(tmp_path / "repo", *VERSIONS_INPUTS)
    return repo, git_commit(repo)


def _schema(repo: Path) -> dict:
    return json.loads((repo / TRACE).read_text(encoding="utf-8"))


def _write_schema(repo: Path, doc: dict) -> None:
    (repo / TRACE).write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8", newline="\n")


def _bump(repo: Path, new: str, kind: str) -> None:
    edit(repo, CATALOG, "| trace | 1.0.0 |", f"| trace | {new} |")
    anchor = "| surrogate-model | 1.0.0 | 2026-10-11 |"  # the History row after trace's own: the new row goes between
    edit(repo, CATALOG, anchor, f"| trace | {new} | 2026-10-12 | planted | {kind} |\n{anchor}")
    guard(repo, "check_contract_versions.py", "--update")  # writes the lock, then reports: exit 1 when the History kind is wrong


def test_versions_the_base_is_the_branchs_own_unmodified_state(versions_repo) -> None:
    repo, base = versions_repo
    r = guard(repo, "check_contract_versions.py", "--base", base, ok_marker="check_contract_versions: OK")
    assert r.returncode == 0, r.stdout


def test_versions_c4_the_lock_edited_by_hand_to_match_a_schema_change(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["required"] = [k for k in doc["required"] if k != "R"]
    _write_schema(repo, doc)
    lock = json.loads((repo / LOCK).read_text(encoding="utf-8"))
    import hashlib
    lock["trace"]["sha256"] = hashlib.sha256((repo / TRACE).read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    (repo / LOCK).write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    assert guard(repo, "check_contract_versions.py").returncode == 0  # offline, the lock alone is trusted (the known limit)
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and "trace" in r.stdout and "base" in r.stdout, r.stdout


def test_versions_c3_a_removed_property_bumped_as_minor(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    assert "R" in doc["properties"]
    del doc["properties"]["R"]
    doc["required"] = [k for k in doc["required"] if k != "R"]
    _write_schema(repo, doc)
    _bump(repo, "1.1.0", "minor")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and "trace" in r.stdout and "major" in r.stdout, r.stdout


def test_versions_c3b_a_narrowed_type_bumped_as_patch(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["properties"]["case_id"]["maxLength"] = 4
    _write_schema(repo, doc)
    _bump(repo, "1.0.1", "patch")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and "trace" in r.stdout and "major" in r.stdout, r.stdout


def test_versions_c3c_the_same_narrowing_as_a_major_bump_passes(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["properties"]["case_id"]["maxLength"] = 4
    _write_schema(repo, doc)
    _bump(repo, "2.0.0", "major")
    r = guard(repo, "check_contract_versions.py", "--base", base, ok_marker="check_contract_versions: OK")
    assert r.returncode == 0, r.stdout


def test_versions_a_history_kind_that_is_not_the_semver_step(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["properties"]["planted"] = {"type": "number"}
    _write_schema(repo, doc)
    _bump(repo, "1.1.0", "patch")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and "kind" in r.stdout and "minor" in r.stdout, r.stdout


def test_versions_c6_a_contract_that_escapes_the_lock_by_dropping_its_schema_cell(versions_repo) -> None:
    repo, base = versions_repo
    edit(repo, CATALOG, "| docs/contracts/schemas/trace.schema.json |", "| - |")
    lock = json.loads((repo / LOCK).read_text(encoding="utf-8"))
    del lock["trace"]
    (repo / LOCK).write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and "trace" in r.stdout and "major" in r.stdout, r.stdout


def test_versions_a_base_that_cannot_be_resolved_never_passes_silently(versions_repo) -> None:
    repo, _ = versions_repo
    r = guard(repo, "check_contract_versions.py", "--base", "origin/nowhere")
    assert r.returncode == 1 and "fetch-depth: 0" in r.stdout, r.stdout


def test_versions_crlf_copy_is_hashed_and_a_real_byte_still_fails(tmp_path: Path) -> None:
    repo = make_tree(tmp_path / "repo", *VERSIONS_INPUTS)
    for schema in (repo / "docs/contracts/schemas").glob("*.json"):
        schema.write_bytes(schema.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))
    assert guard(repo, "check_contract_versions.py", ok_marker="check_contract_versions: OK").returncode == 0
    path = repo / TRACE
    raw = path.read_bytes()
    assert b"Time, days." in raw and b"\r\n" in raw
    path.write_bytes(raw.replace(b"Time, days.", b"Time, in days.", 1))
    r = guard(repo, "check_contract_versions.py")
    assert r.returncode == 1 and "without a version bump" in r.stdout, r.stdout
    assert re.search(r"trace", r.stdout)


CONDITIONAL_GATE = "`tests/adversarial/test_requirements_refuted.py::test_a_build_without_the_routes_or_the_theme_script_fails`"
RUNNING_GATE = "`tests/adversarial/test_guard_holes.py::test_the_slim_tree_passes_the_guard_it_stands_for`"


def test_sdd_rereview_s3d_a_validation_gate_that_skips_in_ci_for_lack_of_node(sdd_repo: Path) -> None:
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-001", 2, CONDITIONAL_GATE)
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-001" in r.stdout and "skips" in r.stdout, r.stdout


def test_sdd_rereview_s3d_the_same_row_with_a_second_gate_that_runs_passes(sdd_repo: Path) -> None:
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-001", 2, f"{CONDITIONAL_GATE} and {RUNNING_GATE}")
    r = sdd(sdd_repo)
    assert r.returncode == 0, r.stdout


@pytest.mark.parametrize("name,text", [
    ("adversarialish works", "it('adversarialish works', () => { expect(1).toBe(1) })\n"),
    ("adversarial works", "it('adversarial works', () => { expect(1).toBe(1) })\n"),
])
def test_sdd_rereview_m9c_a_ts_name_that_only_starts_with_the_word(sdd_repo: Path, name: str, text: str) -> None:
    (sdd_repo / GHOST_TS).write_text(text, encoding="utf-8")
    set_cell(sdd_repo, WORKBENCH_VALIDATION, "EX-001", 2, f"`{GHOST_TS}::{name}`")
    r = sdd(sdd_repo)
    assert r.returncode == 1 and "EX-001" in r.stdout and "not adversarial" in r.stdout, r.stdout
