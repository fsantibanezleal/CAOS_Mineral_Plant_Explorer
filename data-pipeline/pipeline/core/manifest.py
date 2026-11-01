"""Flat connected-plant artifact inventory."""

from .. import __version__

MANIFEST_SCHEMA = "orebridge.manifest/v1"
INDEX_SCHEMA = "orebridge.index/v1"


def build_index(entries, default_case):
    if default_case not in {e["case_id"] for e in entries}:
        raise ValueError("default case absent")
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "default_case": default_case,
        "cases": sorted(entries, key=lambda e: e["case_id"]),
        "files": [],
    }
