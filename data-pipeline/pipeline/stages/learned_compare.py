"""Additional paired learned-family comparison; preserve the published eight-method study."""

from __future__ import annotations

import hashlib
import importlib.metadata
from pathlib import Path
import time

import joblib
import numpy as np

from ..model.learning import fit_ridge, forecast_scores
from ..model.scenarios import FAMILIES, channel_specs, generate
from .plant_evaluate import confusion, finite_history


def train_ridge(models: Path):
    models.mkdir(parents=True, exist_ok=True)
    bundle = fit_ridge()
    joblib.dump(bundle, models / "ridge-model.joblib", compress=3)
    return bundle


def summary(bundle, checkpoint):
    return {
        **{k: v for k, v in bundle.items() if k != "model"},
        "schema": "orebridge.state-model/v1",
        "algorithm": "scikit-learn Ridge, causal multichannel lags",
        "estimator_config": {
            k: bundle["model"].get_params()[k] for k in ["alpha", "fit_intercept", "solver"]
        },
        "checkpoint": checkpoint.name,
        "checkpoint_sha256": hashlib.sha256(checkpoint.read_bytes()).hexdigest(),
        "environment": {
            p: importlib.metadata.version(p) for p in ["numpy", "scipy", "scikit-learn", "joblib"]
        },
    }


def evaluate_ridge(scenario, bundle):
    if np.any(scenario.valid & ~np.isfinite(scenario.observed)):
        raise ValueError("admission mask accepts a nonfinite observation")
    prepared = finite_history(np.where(scenario.valid, scenario.observed, np.nan))
    scores = forecast_scores(bundle, prepared)
    scores[:14] = np.nan
    accepted, truth, score = scenario.valid[14:], scenario.fault[14:], scores[14:]
    comparable = accepted & np.isfinite(score)
    alarms = score > 1
    event_truth = (truth & comparable).any(axis=1)
    found = np.flatnonzero((alarms & truth & comparable).any(axis=1))
    affected = np.flatnonzero(event_truth)
    return {
        "method": "ridge",
        "family": scenario.family,
        "seed": scenario.seed,
        "severity": scenario.severity,
        "numeric": confusion(alarms[comparable], truth[comparable]),
        "source_quality": confusion(~accepted, truth & ~accepted),
        "event": confusion((alarms & comparable).any(axis=1), event_truth),
        "detection_delay_s": int(found[0] - affected[0]) if len(found) and len(affected) else None,
        "scored_points": int(comparable.sum()),
        "unscorable_points": int((~comparable).sum()),
        "timing_alignment_s": 0,
    }, scores


def compare(reference, bundle):
    protocol = reference["protocol"]
    seeds, severities = protocol["test_seeds"], protocol["severity"]
    if (
        not seeds
        or not severities
        or len(set(seeds)) != len(seeds)
        or len(set(severities)) != len(severities)
        or protocol.get("steps") != 160
        or protocol.get("channels") != 16
        or protocol.get("noise_scale") != 1
    ):
        raise ValueError("unsupported or repeated comparison protocol axes")
    config = bundle["model"].get_params()
    if config["alpha"] != 1 or config["fit_intercept"] is not True or config["solver"] != "svd":
        raise ValueError("comparison requires the frozen Ridge configuration")
    if (
        bundle["train_seeds"] != protocol["train_seeds"]
        or bundle["calibration_seeds"] != protocol["forecast_calibration_seeds"]
    ):
        raise ValueError("paired fit/calibration groups differ")
    if set(seeds) & (set(bundle["train_seeds"]) | set(bundle["calibration_seeds"])):
        raise ValueError("test seed leaked into ridge fit or calibration")
    refs = [r for r in reference["rows"] if r["method"] == "forecast"]
    expected = {
        (family, seed, severity) for family, *_ in FAMILIES for severity in severities for seed in seeds
    }
    actual = {(r["family"], r["seed"], r["severity"]) for r in refs}
    if actual != expected or len(refs) != len(expected):
        raise ValueError("incomplete or duplicate paired reference cells")
    started = time.perf_counter()
    rows = list(refs)
    examples = []
    for ref in refs:
        scenario = generate(ref["family"], ref["seed"], ref["severity"])
        row, scores = evaluate_ridge(scenario, bundle)
        rows.append(row)
        if ref["seed"] == 1000 and ref["severity"] == 1:
            examples.append(
                {
                    "family": ref["family"],
                    "seed": 1000,
                    "severity": 1,
                    "time_s": np.arange(160),
                    "scores": scores,
                }
            )
    aggregate = []
    for method in ["forecast", "ridge"]:
        group = [r for r in rows if r["method"] == method]
        counts = {k: sum(r["numeric"][k] for r in group) for k in ["tp", "fp", "fn", "tn"]}
        tp, fp, fn, tn = (counts[k] for k in ["tp", "fp", "fn", "tn"])
        aggregate.append(
            {
                "method": method,
                **counts,
                "precision": tp / (tp + fp) if tp + fp else None,
                "recall": tp / (tp + fn) if tp + fn else None,
                "false_positive_rate": fp / (fp + tn) if fp + tn else None,
                "cases": len(group),
                "scored_points": sum(r["scored_points"] for r in group),
                "unscorable_points": sum(r["unscorable_points"] for r in group),
            }
        )
    # Seed blocks preserve dependence among families, severity slots, time and channels.
    block_counts = np.array(
        [
            [
                [
                    sum(r["numeric"][k] for r in rows if r["method"] == m and r["seed"] == s)
                    for k in ["tp", "fn"]
                ]
                for s in seeds
            ]
            for m in ["ridge", "forecast"]
        ]
    )
    rng = np.random.default_rng(414)
    samples = rng.integers(0, len(seeds), (5000, len(seeds)))
    boot = block_counts[:, samples].sum(axis=2)
    recalls = boot[:, :, 0] / np.maximum(boot.sum(axis=2), 1)
    differences = recalls[0] - recalls[1]
    return {
        "schema": "orebridge.learned-comparison/v1",
        "validation_design": "Post-publication extension on reused original test seeds; alpha1/intercept/SVD fixed before Ridge aggregate evaluation. 768 HGB rows reused; 768 new Ridge evaluations in the full protocol, not 1536 independent new trials.",
        "provenance": "authored synthetic; no field performance claim",
        "protocol": protocol,
        "aggregate": aggregate,
        "rows": rows,
        "examples": examples,
        "channels": channel_specs(),
        "elapsed_s": time.perf_counter() - started,
        "paired_recall": {
            "method": "ridge",
            "reference": "forecast",
            "seed_blocks": len(seeds),
            "resamples": 5000,
            "seed": 414,
            "difference": aggregate[1]["recall"] - aggregate[0]["recall"],
            "ci95": np.quantile(differences, [0.025, 0.975]),
        },
    }
