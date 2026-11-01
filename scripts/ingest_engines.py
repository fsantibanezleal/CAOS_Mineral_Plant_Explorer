"""Fetch real immutable CAOS outputs and execute the released package adapters."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "data-pipeline"))
from pipeline.io.engines import execute_packages, fetch_artifacts


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cache-root", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--offline", action="store_true")
    p.add_argument("--seed", type=int, default=7)
    a = p.parse_args()
    root = Path(__file__).resolve().parents[1]
    lock = json.loads((root / "data/sources/engines.lock.json").read_text(encoding="utf-8"))
    rows = fetch_artifacts(lock, a.cache_root, offline=a.offline)
    print(f"Verified {len(rows)} immutable public CAOS output artifacts.", flush=True)
    rows += execute_packages(a.seed)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(
        json.dumps(
            {"schema": "orebridge.engine-evidence/v1", "records": rows, "unavailable": lock["unavailable"]},
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Executed four released package engines; {len(rows)} evidence records -> {a.out}", flush=True)


if __name__ == "__main__":
    main()
