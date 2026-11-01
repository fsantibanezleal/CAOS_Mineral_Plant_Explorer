#!/usr/bin/env python3
"""Bounded independent numerical checks for the OreBridge reference experiment.

Use --repo for an explicit checkout, or place this script anywhere below its
root. --output must name a JSON file outside that checkout. This script does
not train, download sources, load checkpoints, or write within the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import itertools
import json
import math
import os
import platform
import sys
from pathlib import Path

sys.dont_write_bytecode = True
for _name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[_name] = "1"

import numpy as np
from scipy.linalg import null_space
from scipy.optimize import minimize

SCENARIO_SEED = 1000
ORACLE_RNG_SEED = 20261031
FAMILIES = ("healthy", "bias", "drift", "imbalance", "engine", "water")
AVAILABILITY_STEPS = (70, 80, 105, 125)
SEVERITY, NOISE, STEPS, DELTA = 4.0, 1.0, 160, 1.5
TOLERANCES = {
    "wls_state_atol": 1e-10,
    "balance_atol": 1e-8,
    "objective_atol": 1e-7,
    "objective_rtol": 1e-9,
    "oracle_gradient_atol": 1e-6,
    "oracle_requested_gtol": 1e-9,
    "serialized_ratio_atol": 5.1e-8,
}
SOURCE_FILES = (
    "data-pipeline/pipeline/model/reconciliation.py",
    "data-pipeline/pipeline/model/scenarios.py",
    "data-pipeline/pipeline/model/tags.py",
    "data-pipeline/pipeline/model/learning.py",
    "data-pipeline/pipeline/cases/definitions.py",
    "data-pipeline/pipeline/stages/plant_evaluate.py",
    "data/derived/benchmark.json",
)


def repository(value: Path | None) -> Path:
    candidates = [value.resolve()] if value else Path(__file__).resolve().parents
    for root in candidates:
        if all((root / name).is_file() for name in SOURCE_FILES):
            return root
    raise ValueError("Supply --repo pointing to a complete OreBridge checkout.")


def external_output(path: Path, root: Path) -> Path:
    path = path.resolve()
    if path == root or root in path.parents or path.is_dir():
        raise ValueError("--output must be a file outside the repository.")
    return path


def huber_total(residual: np.ndarray) -> float:
    """Independent Huber definition; no production oracle/objective is called."""
    magnitude = np.abs(residual)
    return float(
        np.where(
            magnitude <= DELTA, residual**2 / 2, DELTA * (magnitude - DELTA / 2)
        ).sum()
    )


def independent_oracle(y, sigma, A, prior, prior_sigma, rng):
    # Write x=y+sigma*z. SVD eliminates the equality constraints before BFGS;
    # this is independent of the production IRLS projection and its iterates.
    B = A * sigma
    z0 = np.linalg.lstsq(B, -A @ y, rcond=None)[0]
    Z = null_space(B)
    admitted = np.flatnonzero(np.isfinite(prior)) if prior is not None else []

    def objective(q):
        z = z0 + Z @ q
        value = huber_total(z)
        if len(admitted):
            value += huber_total(
                (y[admitted] + sigma[admitted] * z[admitted] - prior[admitted])
                / prior_sigma[admitted]
            )
        return value

    def gradient(q):
        z = z0 + Z @ q
        g = np.clip(z, -DELTA, DELTA)
        if len(admitted):
            r = (
                y[admitted] + sigma[admitted] * z[admitted] - prior[admitted]
            ) / prior_sigma[admitted]
            g[admitted] += (
                np.clip(r, -DELTA, DELTA) * sigma[admitted] / prior_sigma[admitted]
            )
        return Z.T @ g

    q0 = rng.normal(0.0, 1e-3, Z.shape[1])
    fit = minimize(
        objective,
        q0,
        jac=gradient,
        method="BFGS",
        options={"gtol": TOLERANCES["oracle_requested_gtol"], "maxiter": 1000},
    )
    x = y + sigma * (z0 + Z @ fit.x)
    return (
        x,
        objective(fit.x),
        float(np.linalg.norm(gradient(fit.x), np.inf)),
        bool(fit.success),
    )


def verify_wls(weighted_reconcile):
    y, sigma = np.array([10.0, 6.0, 5.0]), np.array([1.0, 2.0, 1.0])
    A = np.array([[1.0, -1.0, -1.0]])
    precision = np.diag(1 / sigma**2)
    kkt = np.block([[precision, A.T], [A, np.zeros((1, 1))]])
    exact = np.linalg.solve(kkt, np.r_[precision @ y, 0.0])[: len(y)]
    actual = weighted_reconcile(y, sigma, A, [0.0])["state"]
    error, balance = (
        float(np.max(np.abs(actual - exact))),
        float(np.max(np.abs(A @ actual))),
    )
    return {
        "passed": error <= TOLERANCES["wls_state_atol"]
        and balance <= TOLERANCES["balance_atol"],
        "comparisons": 1,
        "variables": 3,
        "constraints": 1,
        "max_state_error": error,
        "max_balance_residual": balance,
    }


def verify_huber(scenarios, batch_projection):
    base = np.array([c[5] for c in scenarios.CHANNELS])
    sigma, prior_sigma = np.maximum(0.01 * base, 0.1), np.maximum(0.04 * base, 0.4)
    A = scenarios.conservation_matrix()
    warmup = max(c[6] for c in scenarios.CHANNELS)
    rng, rows = np.random.default_rng(ORACLE_RNG_SEED), []
    for family in FAMILIES:
        scenario = scenarios.generate(
            family, seed=SCENARIO_SEED, severity=SEVERITY, steps=STEPS, noise=NOISE
        )
        aligned = scenarios.align(scenario.observed)
        prior, covered = scenarios.engine_prior(aligned)
        y, prior = aligned[warmup:], prior[warmup:]
        prior[~covered[warmup:]] = np.nan
        for with_prior in (False, True):
            _, state, iterations = batch_projection(
                y,
                sigma,
                A,
                robust=True,
                prior=prior if with_prior else None,
                prior_sigma=prior_sigma if with_prior else None,
            )
            for time in AVAILABILITY_STEPS:
                i = time - warmup
                p = prior[i] if with_prior else None
                exact, oracle_objective, gradient, optimizer_success = (
                    independent_oracle(y[i], sigma, A, p, prior_sigma, rng)
                )
                actual_objective = huber_total((state[i] - y[i]) / sigma)
                if p is not None:
                    admitted = np.isfinite(p)
                    actual_objective += huber_total(
                        (state[i][admitted] - p[admitted]) / prior_sigma[admitted]
                    )
                gap = actual_objective - oracle_objective
                balance = float(np.max(np.abs(A @ state[i])))
                oracle_balance = float(np.max(np.abs(A @ exact)))
                limit = TOLERANCES["objective_atol"] + TOLERANCES[
                    "objective_rtol"
                ] * max(1.0, abs(oracle_objective))
                finite = np.isfinite([gap, balance, oracle_balance, gradient]).all()
                rows.append(
                    {
                        "family": family,
                        "scenario_seed": SCENARIO_SEED,
                        "availability_step_s": time,
                        "with_prior": with_prior,
                        "passed": bool(
                            finite
                            and abs(gap) <= limit
                            and max(balance, oracle_balance)
                            <= TOLERANCES["balance_atol"]
                            and gradient <= TOLERANCES["oracle_gradient_atol"]
                        ),
                        "production_objective": actual_objective,
                        "oracle_objective": oracle_objective,
                        "objective_gap": gap,
                        "objective_tolerance": limit,
                        "production_balance_residual": balance,
                        "oracle_balance_residual": oracle_balance,
                        "oracle_projected_gradient_inf": gradient,
                        "oracle_optimizer_success": optimizer_success,
                        "production_iterations": iterations,
                        "state_gap_in_sigma_units": float(
                            np.max(np.abs(state[i] - exact) / sigma)
                        ),
                    }
                )
    return {
        "passed": all(r["passed"] for r in rows),
        "comparisons": len(rows),
        "channels": len(base),
        "factors": len(A),
        "factor_rank": int(np.linalg.matrix_rank(A)),
        "max_abs_objective_gap": max(abs(r["objective_gap"]) for r in rows),
        "max_balance_residual": max(
            max(r["production_balance_residual"], r["oracle_balance_residual"])
            for r in rows
        ),
        "max_oracle_projected_gradient_inf": max(
            r["oracle_projected_gradient_inf"] for r in rows
        ),
        "optimizer_success_count": sum(r["oracle_optimizer_success"] for r in rows),
        "rows": rows,
    }


def ratios(counts):
    tp, fp, fn, tn = (counts[k] for k in ("tp", "fp", "fn", "tn"))
    return {
        "precision": tp / (tp + fp) if tp + fp else None,
        "recall": tp / (tp + fn) if tp + fn else None,
        "false_positive_rate": fp / (fp + tn) if fp + tn else None,
    }


def verify_benchmark(document, families, methods, warmup):
    rows, protocol = document["rows"], document["protocol"]
    expected = set(
        itertools.product(
            families, protocol["severity"], protocol["test_seeds"], methods
        )
    )
    observed = [(r["family"], r["severity"], r["seed"], r["method"]) for r in rows]
    coverage_mismatch = latency_without_tp = latency_without_event_tp = (
        invalid_delay
    ) = 0
    counts_by_method = {m: {k: 0 for k in ("tp", "fp", "fn", "tn")} for m in methods}
    coverage_by_method = {m: [0, 0, 0] for m in methods}
    opportunities = (protocol["steps"] - warmup) * protocol["channels"]
    for row in rows:
        counts = row["numeric"]
        if any(
            type(counts[k]) is not int or counts[k] < 0
            for k in ("tp", "fp", "fn", "tn")
        ):
            raise ValueError("Confusion counts must be nonnegative integers.")
        scored, unscorable = row["scored_points"], row["unscorable_points"]
        coverage_mismatch += int(
            sum(counts[k] for k in ("tp", "fp", "fn", "tn")) != scored
            or scored + unscorable != opportunities
            or type(scored) is not int
            or type(unscorable) is not int
            or min(scored, unscorable) < 0
        )
        delay = row["detection_delay_s"]
        if delay is not None:
            invalid_delay += int(type(delay) is not int or delay < 0)
            latency_without_tp += int(counts["tp"] == 0)
            latency_without_event_tp += int(row["event"]["tp"] == 0)
        for key in counts_by_method[row["method"]]:
            counts_by_method[row["method"]][key] += counts[key]
        totals = coverage_by_method[row["method"]]
        totals[0] += scored
        totals[1] += unscorable
        totals[2] += 1
    aggregate_mismatch, recomputed = 0, []
    aggregate = document["aggregate"]
    for row in aggregate:
        method, counts = row["method"], counts_by_method[row["method"]]
        measured = ratios(counts)
        ratio_ok = all(
            row[k] is None
            if value is None
            else type(row[k]) in (int, float)
            and math.isfinite(row[k])
            and abs(row[k] - value) <= TOLERANCES["serialized_ratio_atol"]
            for k, value in measured.items()
        )
        count_ok = all(counts[k] == row[k] for k in counts)
        coverage_ok = coverage_by_method[method] == [
            row["scored_points"],
            row["unscorable_points"],
            row["cases"],
        ]
        aggregate_mismatch += int(not (ratio_ok and count_ok and coverage_ok))
        recomputed.append({"method": method, **counts, **measured})
    test = set(protocol["test_seeds"])
    disjoint = all(
        not test.intersection(protocol[k])
        for k in (
            "train_seeds",
            "forecast_calibration_seeds",
            "state_calibration_seeds",
        )
    )
    cartesian_ok = (
        len(observed) == len(expected)
        and len(set(observed)) == len(expected)
        and set(observed) == expected
    )
    aggregate_methods_ok = len(aggregate) == len(methods) and {
        r["method"] for r in aggregate
    } == set(methods)
    axes_unique = all(
        len(axis) == len(set(axis))
        for axis in (families, methods, protocol["severity"], protocol["test_seeds"])
    )
    passed = (
        cartesian_ok
        and aggregate_methods_ok
        and axes_unique
        and disjoint
        and not any(
            (
                aggregate_mismatch,
                coverage_mismatch,
                latency_without_tp,
                latency_without_event_tp,
                invalid_delay,
            )
        )
    )
    return {
        "passed": passed,
        "rows": len(rows),
        "expected_rows": len(expected),
        "unique_rows": len(set(observed)),
        "families": len(families),
        "severity_levels": len(protocol["severity"]),
        "test_seeds": protocol["test_seeds"],
        "methods": len(methods),
        "cartesian_matrix_complete": cartesian_ok,
        "protocol_axes_unique": axes_unique,
        "test_seeds_disjoint_from_training_and_calibration": disjoint,
        "aggregate_mismatch_methods": aggregate_mismatch,
        "coverage_mismatch_cells": coverage_mismatch,
        "finite_latency_without_numeric_true_positive_cells": latency_without_tp,
        "finite_latency_without_event_true_positive_cells": latency_without_event_tp,
        "invalid_latency_cells": invalid_delay,
        "scoring_opportunities_per_cell": opportunities,
        "aggregate_recomputed": recomputed,
    }


def main():
    parser = argparse.ArgumentParser(prog=Path(__file__).name, description=__doc__)
    parser.add_argument(
        "--repo",
        type=Path,
        help="Checkout root; otherwise inferred from script ancestors.",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Required JSON file outside the checkout.",
    )
    args = parser.parse_args()
    try:
        root = repository(args.repo)
        output = external_output(args.output, root)
    except ValueError as exc:
        parser.error(str(exc))
    summary = {
        "schema": "orebridge.scientific-verification/v1",
        "passed": False,
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "protocol": {
            "scenario_seed": SCENARIO_SEED,
            "oracle_rng_seed": ORACLE_RNG_SEED,
            "families": FAMILIES,
            "availability_steps_s": AVAILABILITY_STEPS,
            "severity": SEVERITY,
            "noise_scale": NOISE,
            "scenario_steps": STEPS,
            "huber_delta": DELTA,
            "oracle": "SVD null-space elimination and independent Huber objective/gradient, BFGS",
            "oracle_initial_nullspace_scale": 1e-3,
            "numerical_threads": 1,
        },
        "tolerances": TOLERANCES,
        "limitations": [
            "Bounded software/numerical verification of an authored synthetic reference experiment, not field validation or a superiority test.",
            "Benchmark checks reconcile published counts and coverage; they do not rerun training or all benchmark inferences.",
            "Source-quality masks emulate admission decisions and do not independently validate fault discovery.",
            "State-coordinate differences are descriptive; a Huber problem can have nonunique minimizers. Oracle acceptance checks objective, equality feasibility and projected stationarity, rather than optimizer status alone.",
        ],
    }
    stage = "imports"
    try:
        sys.path.insert(0, str(root / "data-pipeline"))
        from pipeline.model import reconciliation, scenarios
        from pipeline.stages import plant_evaluate

        summary["environment"] = {
            "python": platform.python_version(),
            **{
                name: importlib.metadata.version(name)
                for name in ("numpy", "scipy", "scikit-learn")
            },
        }
        summary["source_sha256"] = {
            name: hashlib.sha256((root / name).read_bytes()).hexdigest()
            for name in SOURCE_FILES
        }
        summary["product_version"] = (
            (root / "VERSION").read_text(encoding="utf-8").strip()
        )
        stage = "wls_kkt"
        summary[stage] = verify_wls(reconciliation.weighted_reconcile)
        stage = "huber_nullspace"
        summary[stage] = verify_huber(scenarios, plant_evaluate.batch_projection)
        stage = "benchmark_consistency"
        document = json.loads(
            (root / "data/derived/benchmark.json").read_text(encoding="utf-8")
        )
        summary[stage] = verify_benchmark(
            document,
            [r[0] for r in scenarios.FAMILIES],
            plant_evaluate.METHODS,
            max(c[6] for c in scenarios.CHANNELS),
        )
        summary["passed"] = all(
            summary[k]["passed"]
            for k in ("wls_kkt", "huber_nullspace", "benchmark_consistency")
        )
    except Exception as exc:
        # Do not persist exception text/tracebacks that can include local paths.
        summary["error"] = {"stage": stage, "type": type(exc).__name__}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(summary, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "passed": summary["passed"],
                "huber_comparisons": summary.get("huber_nullspace", {}).get(
                    "comparisons"
                ),
                "max_abs_objective_gap": summary.get("huber_nullspace", {}).get(
                    "max_abs_objective_gap"
                ),
                "benchmark_rows": summary.get("benchmark_consistency", {}).get("rows"),
                "output_written": True,
            }
        )
    )
    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
