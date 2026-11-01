"""Promote a validated candidate; remove only tracked former domain artifacts."""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))
from pipeline.stages.bake_plant import validate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("candidate", type=Path)
    args = parser.parse_args()
    candidate = args.candidate.resolve()
    target = (ROOT / "data/derived").resolve()
    if target != ROOT / "data/derived" or candidate == target or not candidate.is_dir():
        raise ValueError("invalid promotion roots")
    validate(candidate)
    old = subprocess.check_output(["git", "ls-files", "data/derived"], cwd=ROOT, text=True).splitlines()
    for rel in old:
        path = (ROOT / rel).resolve()
        if target not in path.parents:
            raise ValueError("artifact path escapes derived root")
        if path.is_file():
            path.unlink()
    shutil.copytree(candidate, target, dirs_exist_ok=True)
    for name in ["params-record", "observation"]:
        json.loads((ROOT / f"docs/contracts/examples/{name}.json").read_text(encoding="utf-8"))
    print(f"Promoted {len(list(candidate.rglob('*.json')))} validated JSON artifacts")


if __name__ == "__main__":
    main()
