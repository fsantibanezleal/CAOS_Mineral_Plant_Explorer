"""Paired, pointwise benchmark of thresholds, reconciliation, forecast and TASC."""

from __future__ import annotations

import time

import numpy as np

from ..model.learning import forecast_scores
from ..model.scenarios import CHANNELS, FAMILIES, align, conservation_matrix, engine_prior, generate

METHODS = [
    "threshold",
    "wls",
    "robust-aligned",
    "forecast",
    "tasc",
    "tasc-no-timing",
    "tasc-no-engine",
    "tasc-no-topology",
]


def batch_projection(y, sigma, A, *, prior=None, prior_sigma=None, robust=False, max_iter=30):
    y = np.asarray(y, float)
    sigma = np.broadcast_to(sigma, y.shape)
    if not np.isfinite(y).all():
        raise ValueError("projection requires explicit finite preparation")
    x = y.copy()
    precision0 = 1 / (sigma * sigma)
    for iteration in range(max_iter if robust else 1):
        w = precision0 * (np.minimum(1, 1.5 / np.maximum(np.abs((x - y) / sigma), 1e-12)) if robust else 1)
        target = w * y
        if prior is not None:
            ps = np.broadcast_to(prior_sigma, y.shape)
            wp = np.where(np.isfinite(prior), 1 / (ps * ps), 0)
            if robust:
                wp *= np.minimum(1, 1.5 / np.maximum(np.abs((x - np.nan_to_num(prior)) / ps), 1e-12))
            target += wp * np.nan_to_num(prior)
            w += wp
        mean = target / w
        variance = 1 / w
        if len(A):
            gram = np.einsum("ij,tj,kj->tik", A, variance, A)
            rhs = mean @ A.T
            multipliers = np.linalg.solve(gram, rhs[..., None])[..., 0]
            nxt = mean - variance * (multipliers @ A)
        else:
            nxt = mean
        if np.max(np.abs(nxt - x)) < 1e-7:
            x = nxt
            break
        x = nxt
    return np.abs(y - x) / sigma, x, iteration + 1


def finite_history(values):
    """Carry the last numeric value only for model input, never observed-state display."""
    x = np.asarray(values, float).copy()
    nominal = np.array([c[5] for c in CHANNELS])
    previous = nominal.copy()
    for i in range(len(x)):
        good = np.isfinite(x[i])
        previous = np.where(good, x[i], previous)
        x[i] = previous
    return x


def raw_scores(scenario, bundle):
    y = finite_history(scenario.observed)
    base = np.array([c[5] for c in CHANNELS])
    sigma = np.maximum(0.01 * base, 0.1)
    A = conservation_matrix()
    aligned = align(y)
    valid = align(scenario.valid)
    labels = align(scenario.fault)
    start = 14
    ya = aligned[start:]
    va = valid[start:]
    labels = labels[start:]
    prior, covered = engine_prior(aligned)
    prior = prior[start:]
    prior[~covered[start:]] = np.nan
    ps = np.maximum(0.04 * base, 0.4)
    values = {}
    states = {}
    values["threshold"] = np.abs(y[start:] - base) / (0.2 * base)
    values["wls"], states["wls"], _ = batch_projection(y[start:], sigma, A)
    values["robust-aligned"], states["robust-aligned"], _ = batch_projection(ya, sigma, A, robust=True)
    values["tasc"], states["tasc"], _ = batch_projection(
        ya, sigma, A, prior=prior, prior_sigma=ps, robust=True
    )
    p2, c2 = engine_prior(y)
    p2[~c2] = np.nan
    values["tasc-no-timing"], _, _ = batch_projection(
        y[start:], sigma, A, prior=p2[start:], prior_sigma=ps, robust=True
    )
    values["tasc-no-engine"] = values["robust-aligned"].copy()
    values["tasc-no-topology"], _, _ = batch_projection(
        ya, sigma, A[:0], prior=prior, prior_sigma=ps, robust=True
    )
    values["forecast"] = forecast_scores(bundle, y)[start:]
    result = {}
    for method, score in values.items():
        is_aligned = method in ["robust-aligned", "tasc", "tasc-no-engine", "tasc-no-topology"]
        truth = labels if is_aligned else scenario.fault[start:]
        accepted = va if is_aligned else scenario.valid[start:]
        if method not in ["threshold", "forecast"]:
            score[~accepted.all(axis=1)] = np.nan
            if method in states:
                states[method][~accepted.all(axis=1)] = np.nan
        result[method] = {
            "scores": score,
            "truth": truth,
            "valid": accepted,
            "estimate": states.get(method),
            "values": ya if is_aligned else y[start:],
        }
    return result


def calibrate(bundle, seeds=range(300, 308)):
    scores = {m: [] for m in METHODS}
    for seed in seeds:
        for m, r in raw_scores(generate(seed=seed), bundle).items():
            scores[m].append(r["scores"])
    thresholds = {}
    for method, rows in scores.items():
        if method in ["threshold", "forecast"]:
            thresholds[method] = np.ones(16)
        else:
            thresholds[method] = np.maximum(
                np.nanquantile(np.concatenate(rows), 0.995, axis=0, method="higher"), 0.1
            )
    return thresholds


def confusion(pred, truth):
    pred = np.asarray(pred, bool)
    truth = np.asarray(truth, bool)
    tp = int(np.sum(pred & truth))
    fp = int(np.sum(pred & ~truth))
    fn = int(np.sum(~pred & truth))
    tn = int(np.sum(~pred & ~truth))
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "precision": tp / (tp + fp) if tp + fp else None,
        "recall": tp / (tp + fn) if tp + fn else None,
        "false_positive_rate": fp / (fp + tn) if fp + tn else None,
    }


def evaluate_one(scenario, bundle, thresholds):
    start = time.perf_counter()
    outputs = raw_scores(scenario, bundle)
    rows = []
    for method, r in outputs.items():
        alarms = r["scores"] > thresholds[method]
        # Invalid data is evaluated separately from numerical process detection.
        comparable = r["valid"] & np.isfinite(r["scores"])
        numeric = confusion(alarms[comparable], r["truth"][comparable])
        quality = confusion(~r["valid"], r["truth"] & ~r["valid"])
        event_truth = (r["truth"] & comparable).any(axis=1)
        event_alarm = (alarms & comparable).any(axis=1)
        event = confusion(event_alarm, event_truth)
        fault_idx = np.flatnonzero(event_truth)
        alarm_idx = np.flatnonzero(event_alarm)
        delay = None
        if len(fault_idx):
            found = alarm_idx[alarm_idx >= fault_idx[0]]
            if len(found):
                delay = int(found[0] - fault_idx[0])
        rows.append(
            {
                "method": method,
                "family": scenario.family,
                "seed": scenario.seed,
                "severity": scenario.severity,
                "numeric": numeric,
                "source_quality": quality,
                "event": event,
                "detection_delay_s": delay,
                "scored_points": int(np.isfinite(r["scores"]).sum()),
                "unscorable_points": int((~np.isfinite(r["scores"])).sum()),
                "timing_alignment_s": 14
                if method in ["robust-aligned", "tasc", "tasc-no-engine", "tasc-no-topology"]
                else 0,
            }
        )
    return rows, outputs, (time.perf_counter() - start) * 1000


def benchmark(bundle, thresholds, seeds=range(1000, 1016), severities=(0.5, 1, 2, 4)):
    if (
        (set(seeds) & set(bundle["train_seeds"]))
        or (set(seeds) & set(bundle["calibration_seeds"]))
        or set(seeds) & set(range(300, 308))
    ):
        raise ValueError("test seed leaked into train or calibration")
    rows = []
    started = time.perf_counter()
    for family, _, _, _ in FAMILIES:
        for severity in severities:
            for seed in seeds:
                result, _, _ = evaluate_one(generate(family, seed, severity), bundle, thresholds)
                rows.extend(result)
        print(
            f"benchmark {family}: {len(rows)} method/case cells, elapsed {time.perf_counter() - started:.1f}s",
            flush=True,
        )
    aggregate = []
    for method in METHODS:
        subset = [r for r in rows if r["method"] == method]
        counts = {k: sum(r["numeric"][k] for r in subset) for k in ["tp", "fp", "fn", "tn"]}
        tp, fp, fn, tn = (counts[k] for k in ["tp", "fp", "fn", "tn"])
        aggregate.append(
            {
                "method": method,
                **counts,
                "precision": tp / (tp + fp) if tp + fp else None,
                "recall": tp / (tp + fn) if tp + fn else None,
                "false_positive_rate": fp / (fp + tn) if fp + tn else None,
                "cases": len(subset),
                "scored_points": sum(r["scored_points"] for r in subset),
                "unscorable_points": sum(r["unscorable_points"] for r in subset),
            }
        )
    return {
        "schema": "orebridge.benchmark/v1",
        "provenance": "authored synthetic reference plant; no field performance claim",
        "protocol": {
            "test_seeds": list(seeds),
            "severity": list(severities),
            "train_seeds": bundle["train_seeds"],
            "forecast_calibration_seeds": bundle["calibration_seeds"],
            "state_calibration_seeds": list(range(300, 308)),
            "point_adjustment": False,
            "channels": 16,
            "steps": 160,
            "numerical_quality_separation": True,
            "threshold_quantile": 0.995,
        },
        "aggregate": aggregate,
        "rows": rows,
        "elapsed_s": time.perf_counter() - started,
    }
