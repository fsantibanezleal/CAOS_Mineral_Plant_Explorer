"""Paired seed-block analysis of a completed immutable benchmark."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "data-pipeline"))
from pipeline.stages.analysis import analyze
from pipeline.stages.bake_plant import clean

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("benchmark", type=Path)
    p.add_argument("--out", type=Path, required=True)
    a = p.parse_args()
    result = clean(analyze(json.loads(a.benchmark.read_text(encoding="utf-8"))))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(result, indent=2, allow_nan=False), encoding="utf-8")
    print("Paired block analysis: 5000 resamples; negative topology result retained.")
