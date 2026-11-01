"""Paired seed-block uncertainty; no independent-point resampling or test tuning."""

import argparse
import json
from pathlib import Path

import numpy as np


def ratios(counts):
    tp, fp, fn, tn = np.moveaxis(counts, -1, 0)
    return np.stack(
        [
            np.divide(tp, tp + fp, out=np.zeros_like(tp, dtype=float), where=(tp + fp) > 0),
            np.divide(tp, tp + fn, out=np.zeros_like(tp, dtype=float), where=(tp + fn) > 0),
            np.divide(fp, fp + tn, out=np.zeros_like(tp, dtype=float), where=(fp + tn) > 0),
        ],
        axis=-1,
    )


def analyze(document, replicates=5000):
    rows = document["rows"]
    seeds = document["protocol"]["test_seeds"]
    methods = [r["method"] for r in document["aggregate"]]
    counts = np.array(
        [
            [
                [
                    sum(r["numeric"][k] for r in rows if r["method"] == m and r["seed"] == s)
                    for k in ["tp", "fp", "fn", "tn"]
                ]
                for s in seeds
            ]
            for m in methods
        ]
    )
    draws = np.random.default_rng(414).integers(0, len(seeds), (replicates, len(seeds)))
    boot = ratios(counts[:, draws].sum(axis=2))
    point = ratios(counts.sum(axis=1))
    intervals = []
    for a, b in [("tasc", "robust-aligned"), ("tasc", "forecast"), ("tasc", "tasc-no-topology")]:
        i, j = methods.index(a), methods.index(b)
        for k, metric in enumerate(["precision", "recall", "false_positive_rate"]):
            ci = np.quantile(boot[i, :, k] - boot[j, :, k], [0.025, 0.975])
            intervals.append(
                {
                    "method": a,
                    "reference": b,
                    "metric": metric,
                    "difference": float(point[i, k] - point[j, k]),
                    "ci95": ci.tolist(),
                }
            )
    family = []
    for f in sorted({r["family"] for r in rows}):
        for m in methods:
            subset = [r for r in rows if r["family"] == f and r["method"] == m]
            c = np.array([sum(r["numeric"][k] for r in subset) for k in ["tp", "fp", "fn", "tn"]])
            values = ratios(c).tolist()
            for i, denominator in enumerate([c[0] + c[1], c[0] + c[2], c[1] + c[3]]):
                if denominator == 0:
                    values[i] = None
            family.append(
                {
                    "family": f,
                    "method": m,
                    "counts": c.tolist(),
                    "ratios": values,
                    "scored": sum(r["scored_points"] for r in subset),
                    "unscorable": sum(r["unscorable_points"] for r in subset),
                }
            )
    matched = []
    excluded = {"frozen", "unit", "mapping", "missing", "ordering"}
    for method in methods:
        subset = [r for r in rows if r["method"] == method and r["family"] not in excluded]
        counts = {k: sum(r["numeric"][k] for r in subset) for k in ["tp", "fp", "fn", "tn"]}
        values = ratios(np.array(list(counts.values()))).tolist()
        matched.append(
            {
                "method": method,
                **counts,
                "precision": values[0],
                "recall": values[1],
                "false_positive_rate": values[2],
                "cases": len(subset),
            }
        )
    return {
        "schema": "orebridge.benchmark-analysis/v1",
        "protocol": {
            "unit": "held-out seed block, all family/severity/channel dependence retained",
            "replicates": replicates,
            "seed": 414,
            "interval": "paired percentile 95%; descriptive synthetic experiment, not field inference",
            "zero_denominator": "reported zero only for internal resampling; interpret family nulls from benchmark source",
        },
        "paired_differences": intervals,
        "by_family": family,
        "matched_source_valid": matched,
        "conclusion": "Small improvement over aligned robust projection; lower recall than the predictor; topology ablation is better. No superiority claim supported.",
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("benchmark", type=Path)
    p.add_argument("--out", type=Path, required=True)
    a = p.parse_args()
    result = analyze(json.loads(a.benchmark.read_text(encoding="utf-8")))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    for row in result["paired_differences"]:
        print(row)
