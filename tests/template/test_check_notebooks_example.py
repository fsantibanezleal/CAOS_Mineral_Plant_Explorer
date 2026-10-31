"""The example notebooks (the SIR set under notebooks/): what their text must hold, and the residue guard listing them. They need the
template's example, so they live here and instantiate.py removes them with the example; a product states the same rules for its own
notebooks in its own tests. The static check on synthetic trees stays in tests/test_check_notebooks.py."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from test_check_notebooks import BAR, CHECK, bar_doc, bar_of, review_root

ROOT = Path(__file__).resolve().parents[2]


def test_the_committed_set_covers_both_languages_and_a_level_three() -> None:
    trees = {lang: sorted(p.relative_to(ROOT / "notebooks" / lang).as_posix() for p in (ROOT / "notebooks" / lang).rglob("*.ipynb")) for lang in ("en", "es")}
    assert trees["en"] == trees["es"] and len(trees["en"]) >= 5
    levels = {json.loads((ROOT / "notebooks" / "en" / rel).read_text(encoding="utf-8"))["metadata"]["caos"]["level"] for rel in trees["en"]}
    assert levels == {1, 2, 3}


def test_the_example_notebooks_import_the_engine_and_never_redefine_it() -> None:
    engine = CHECK.engine_names(ROOT)
    assert "simulate" in engine
    for path in (ROOT / "notebooks").rglob("*.ipynb"):
        doc = json.loads(path.read_text(encoding="utf-8"))
        code = "\n".join(CHECK.text_of(c["source"]) for c in doc["cells"] if c["cell_type"] == "code")
        assert re.search(r"from pipeline\.model\.sir import (derivatives, )?simulate(?![A-Za-z_])", code), path.name
        assert not (CHECK.defined_names(code) & engine), path.name


def test_the_residue_guard_lists_the_example_notebooks(tmp_path: Path) -> None:
    """An instantiated product (no sentinel) sees the example notebooks as residue to replace, like the rest of the example."""
    product = tmp_path / "product"
    shutil.copytree(ROOT / "notebooks", product / "notebooks")
    for n in range(12):
        (product / "src").mkdir(exist_ok=True)
        (product / "src" / f"m{n}.py").write_text("x = 1\n", encoding="utf-8")
    shutil.copytree(ROOT / "scripts", product / "scripts", ignore=shutil.ignore_patterns("__pycache__", "node_modules"))
    subprocess.run(["git", "init", "-q"], cwd=product, check=True)
    r = subprocess.run([sys.executable, str(product / "scripts" / "check_template_residue.py"), str(product)], capture_output=True, text=True, cwd=product)
    assert r.returncode == 1 and "notebooks/en/01-getting-started/01-the-problem-and-the-data.ipynb" in r.stdout, r.stdout


def cells_of(lang: str, rel: str) -> list[dict]:
    return json.loads((ROOT / "notebooks" / lang / rel).read_text(encoding="utf-8"))["cells"]


@pytest.mark.parametrize("lang", ["en", "es"])
def test_the_convergence_cell_names_the_case_it_runs(lang: str) -> None:
    """F1: the figure is titled EX02_epidemic, so the cell binds that case itself instead of reusing the last loop variable."""
    cells = cells_of(lang, "01-getting-started/02-the-method-step-by-step.ipynb")
    cell = next(c for c in cells if c["cell_type"] == "code" and "steps = [1.0, 0.5" in CHECK.text_of(c["source"]))
    code = CHECK.text_of(cell["source"])
    body = [ln for ln in code.splitlines() if ln.strip() and not ln.lstrip().startswith("#")]
    assert body[0] == 'p = params_of("EX02_epidemic")', body[0]
    printed = "".join(CHECK.text_of(o.get("text", "")) for o in cell["outputs"])
    assert "0.933717" in printed and "0.300894" not in printed, printed  # EX02's first attack rate, not EX04's


def test_the_final_size_solver_is_imported_by_the_notebooks_and_defined_in_none() -> None:
    """F14: a method is imported, never defined in a notebook; the solver lives in data-pipeline/pipeline/oracles.py."""
    assert "final_size" in CHECK.engine_names(ROOT)
    users = 0
    for path in (ROOT / "notebooks").rglob("*.ipynb"):
        code = "\n".join(CHECK.text_of(c["source"]) for c in json.loads(path.read_text(encoding="utf-8"))["cells"] if c["cell_type"] == "code")
        assert "final_size" not in CHECK.defined_names(code), path.name
        if "final_size(" in code:
            users += 1
            assert "from pipeline.oracles import final_size" in code, path.name
    assert users == 4


def test_the_spanish_notebooks_use_one_decimal_separator() -> None:
    """F13: the Spanish prose writes its decimals with a comma, every number of the notebooks' prose (math included)."""
    import re
    for path in sorted((ROOT / "notebooks" / "es").rglob("*.ipynb")):
        for c in json.loads(path.read_text(encoding="utf-8"))["cells"]:
            if c["cell_type"] == "markdown" and not CHECK.text_of(c["source"]).startswith("## Referencias"):
                prose = re.sub(r"`[^`]*`|https?://\S+|10\.\d{4,9}/\S+|\b\d+\.\d+\.\d+\b", "", CHECK.text_of(c["source"]))
                assert not re.search(r"\d\.\d", prose), (path.name, prose[:200])


def test_the_level_three_example_runs_the_reference_implementation() -> None:
    """NB-068: the level 3 notebooks run scipy's solve_ivp under Comparison, scipy is an exact pin, and the SDD lists it."""
    assert "scipy==1.18.1" in CHECK.read_pins(ROOT)
    for lang, section in (("en", "Comparison"), ("es", "Comparación")):
        doc = json.loads((ROOT / "notebooks" / lang / "01-getting-started" / "03-a-higher-order-solver.ipynb").read_text(encoding="utf-8"))
        assert doc["metadata"]["caos"]["level"] == 3 and "scipy==1.18.1" in doc["metadata"]["caos"]["packages"]
        reading = CHECK.Reading(doc, lang, ROOT, CHECK.load_bar())
        inside = [i for i in reading.method_cells if reading.section[i] == "Comparison"]
        code = "\n".join(CHECK.text_of(doc["cells"][i]["source"]) for i in inside)
        assert "solve_ivp(" in code and 'method="RK45"' in code, (lang, section)
        # the equations live in the engine: the notebook imports derivatives and defines no right-hand side of its own
        all_code = "\n".join(CHECK.text_of(c["source"]) for c in doc["cells"] if c["cell_type"] == "code")
        assert "derivatives" in all_code and "solve_ivp(derivatives" in all_code, lang
        assert "derivatives" in CHECK.engine_names(ROOT) and not (CHECK.defined_names(all_code) & {"sir_rhs", "derivatives"}), lang
    assert "scipy" in (ROOT / "docs" / "design" / "SDD.md").read_text(encoding="utf-8")


def test_adversarial_m6_sentences_copied_from_the_templates_example_are_found_in_a_product(tmp_path: Path) -> None:
    root = review_root(tmp_path)
    prose = [s for s in sorted(CHECK.long_sentences("\n".join(CHECK.text_of(c["source"]) for c in json.loads(
        (ROOT / "notebooks/en/01-getting-started/02-the-method-step-by-step.ipynb").read_text(encoding="utf-8"))["cells"]
        if c["cell_type"] == "markdown"), 50)) if CHECK.fingerprint(s) in set(BAR["example_fingerprints"].split())][:6]
    assert len(prose) == 6
    doc = bar_doc("en", 2)
    doc["cells"][1]["source"] += "\n\n" + "\n\n".join(prose)
    assert any("copied from the template's example notebooks" in f for f in bar_of(root, doc))
    (root / ".template-source").write_text("", encoding="utf-8")  # the template itself keeps its own example
    assert not any("copied from the template" in f for f in bar_of(root, doc))


def test_m6_the_fingerprints_follow_the_example_notebooks() -> None:
    """Edit an example notebook and this fails until ``python scripts/check_notebooks.py --write-fingerprints`` is run."""
    assert BAR["example_fingerprints"].split() == CHECK.example_fingerprints(ROOT, BAR)
