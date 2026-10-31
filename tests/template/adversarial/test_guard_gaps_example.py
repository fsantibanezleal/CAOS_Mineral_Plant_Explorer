"""Plants of the verbatim guards that read the example or the template's own guide (0.09.000): a committed example document that is not
valid JSON, and the guide's list of the files a product takes verbatim (the guide is deleted by instantiate.py). The other plants of
those gaps stay in tests/adversarial/test_guard_gaps_0_09_0.py."""

from __future__ import annotations

import json
import re
from pathlib import Path

from planting import ROOT, guard

DOCUMENTS, PRODUCER, CONSUMER = 5, 6, 7  # the columns of the params-record row, whose documents cell is "-"


def test_a_json_document_is_still_validated_against_its_schema(docs: Path) -> None:
    path = docs / "data/derived/EX01_subcritical/trace.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    doc["points"] = []
    path.write_text(json.dumps(doc), encoding="utf-8")
    r = guard(docs, "check_documents.py")
    assert r.returncode == 1 and "[trace]" in r.stdout, r.stdout


def test_a_json_file_with_a_json_suffix_that_is_not_json_still_fails(docs: Path) -> None:
    (docs / "data/derived/EX01_subcritical/trace.json").write_text("not json at all", encoding="utf-8")
    r = guard(docs, "check_documents.py")
    assert r.returncode == 1 and "not readable as JSON" in r.stdout, r.stdout


GUIDE = ROOT / "docs" / "guides" / "00_instantiate.md"


# the personal name as a word; the GitHub handle `fsantibanezleal` in a source URL is a repository address, not the name
OWNER = re.compile(r"\b(?:Felipe|Santib[aá][nñ]ez)\b", re.I)


def verbatim_files() -> list[str]:
    """The files the guide lists under 'Files a product takes verbatim'."""
    text = GUIDE.read_text(encoding="utf-8")
    start = re.search(r"^#+ Files a product takes verbatim\s*$", text, re.M)
    assert start, "docs/guides/00_instantiate.md has no section 'Files a product takes verbatim'"
    rest = text[start.end():]
    stop = re.search(r"^#+ ", rest, re.M)
    section = rest[: stop.start()] if stop else rest
    return sorted(set(re.findall(r"`((?:frontend/)?scripts/[\w./-]+)`", section)))


def test_the_guide_lists_the_files_a_product_takes_verbatim() -> None:
    files = verbatim_files()
    for name in ("check_sdd.py", "check_content_standards.py", "check_documents.py", "check_base_integrity.py", "check_tech_matrix.py"):
        assert f"scripts/{name}" in files, files
    assert "frontend/scripts/gate.mjs" in files, files
    assert all((ROOT / f).is_file() for f in files), [f for f in files if not (ROOT / f).is_file()]


def test_no_file_a_product_takes_verbatim_names_the_owner() -> None:
    named = {f: [m.group(0) for m in OWNER.finditer((ROOT / f).read_text(encoding="utf-8"))] for f in verbatim_files()}
    assert not any(named.values()), {f: v for f, v in named.items() if v}


def test_adversarial_the_owner_check_sees_a_name_in_a_comment(tmp_path: Path) -> None:
    probe = tmp_path / "probe.py"
    probe.write_text("# the rule (Felipe, 2026-10-13)\n", encoding="utf-8")
    assert OWNER.search(probe.read_text(encoding="utf-8"))
