"""Constrained WLS, robust estimation and topology-aware state coherence.

Positive diagonal uncertainty makes the WLS objective strictly convex. Redundant
conservation rows are handled by SVD; an inconsistent right-hand side is refused.
No covariance matrix is silently inverted.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import minimize


def _inputs(y, sigma, A, b):
    y = np.asarray(y, dtype=float)
    sigma = np.asarray(sigma, dtype=float)
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    if (
        y.ndim != 1
        or sigma.shape != y.shape
        or A.ndim != 2
        or A.shape[1] != len(y)
        or b.shape != (A.shape[0],)
    ):
        raise ValueError("state dimensions do not agree")
    if not all(np.isfinite(x).all() for x in (y, sigma, A, b)) or np.any(sigma <= 0):
        raise ValueError("non-finite state or nonpositive uncertainty")
    if np.linalg.norm(A @ np.linalg.lstsq(A, b, rcond=None)[0] - b) > 1e-8:
        raise ValueError("inconsistent conservation equations")
    return y, sigma, A, b


def weighted_reconcile(y, sigma, A, b):
    y, sigma, A, b = _inputs(y, sigma, A, b)
    R = sigma * sigma
    gram = (A * R) @ A.T
    multiplier = np.linalg.lstsq(gram, A @ y - b, rcond=1e-12)[0]
    x = y - R * (A.T @ multiplier)
    residual = A @ x - b
    if np.linalg.norm(residual, np.inf) > 1e-7:
        raise ValueError("ill-conditioned state reconciliation")
    return {
        "state": x,
        "score": np.abs((y - x) / sigma),
        "balance_residual": residual,
        "rank": int(np.linalg.matrix_rank(A)),
    }


def huber(z, delta=1.5):
    z = np.asarray(z)
    az = np.abs(z)
    return np.where(az <= delta, 0.5 * z * z, delta * (az - 0.5 * delta))


def robust_reconcile(y, sigma, A, b, delta=1.5, max_iter=25):
    y, sigma, A, b = _inputs(y, sigma, A, b)
    x = weighted_reconcile(y, sigma, A, b)["state"]
    for iteration in range(max_iter):
        r = np.abs((x - y) / sigma)
        weights = np.minimum(1.0, delta / np.maximum(r, 1e-12))
        nxt = weighted_reconcile(y, sigma / np.sqrt(weights), A, b)["state"]
        if np.max(np.abs(nxt - x)) < 1e-8:
            x = nxt
            break
        x = nxt
    return {
        "state": x,
        "score": np.abs((y - x) / sigma),
        "balance_residual": A @ x - b,
        "iterations": iteration + 1,
        "objective": float(np.sum(huber((y - x) / sigma, delta))),
    }


def independent_robust_oracle(y, sigma, A, b, delta=1.5):
    y, sigma, A, b = _inputs(y, sigma, A, b)
    result = minimize(
        lambda x: float(np.sum(huber((x - y) / sigma, delta))),
        weighted_reconcile(y, sigma, A, b)["state"],
        method="SLSQP",
        constraints={"type": "eq", "fun": lambda x: A @ x - b},
        options={"ftol": 1e-11, "maxiter": 300},
    )
    if not result.success:
        raise ValueError(result.message)
    return result.x


def tasc(y, sigma, A, b, *, valid=None, engine=None, engine_sigma=None, engine_valid=None, delta=1.5):
    """Robust equality-constrained fusion with admissible engine pseudo-observations.

    Missing observations have zero influence and are returned as invalid. An
    invalid observation is never made healthy by a plausible engine prediction.
    The estimate is reported separately from the original observation.
    """
    y = np.asarray(y, float)
    sigma = np.asarray(sigma, float)
    n = len(y)
    valid = np.ones(n, bool) if valid is None else np.asarray(valid, bool)
    engine = np.asarray(y if engine is None else engine, float)
    engine_sigma = np.asarray(sigma * 5 if engine_sigma is None else engine_sigma, float)
    engine_valid = np.zeros(n, bool) if engine_valid is None else np.asarray(engine_valid, bool)
    if any(v.shape != (n,) for v in (sigma, valid, engine, engine_sigma, engine_valid)):
        raise ValueError("invalid fusion mask dimensions")
    if np.any(valid & (~np.isfinite(y) | ~np.isfinite(sigma) | (sigma <= 0))) or np.any(
        engine_valid & (~np.isfinite(engine) | ~np.isfinite(engine_sigma) | (engine_sigma <= 0))
    ):
        raise ValueError("invalid admitted fusion row")
    if np.any(~(valid | engine_valid)):
        return {
            "state": None,
            "score": np.where(valid, 0.0, np.nan),
            "state_status": "unobservable",
            "invalid": np.where(~valid)[0].tolist(),
            "evidence": [],
        }
    ym = np.where(valid, y, 0)
    em = np.where(engine_valid, engine, 0)
    x = np.where(valid, y, engine).copy()
    for iteration in range(30):
        wr = np.where(
            valid, np.minimum(1, delta / np.maximum(np.abs((x - ym) / sigma), 1e-12)) / (sigma * sigma), 0
        )
        we = np.where(
            engine_valid,
            np.minimum(1, delta / np.maximum(np.abs((x - em) / engine_sigma), 1e-12))
            / (engine_sigma * engine_sigma),
            0,
        )
        precision = wr + we
        target = (wr * ym + we * em) / precision
        nxt = weighted_reconcile(target, 1 / np.sqrt(precision), A, b)["state"]
        if np.max(np.abs(nxt - x)) < 1e-8:
            x = nxt
            break
        x = nxt
    scores = np.where(valid, np.abs(y - x) / sigma, np.nan)
    factors = []
    for i, row in enumerate(np.asarray(A)):
        cols = np.flatnonzero(row)
        observed = bool(np.all(valid[cols]))
        value = float(row @ y - b[i]) if observed else None
        scale = float(np.sqrt(np.sum((row * sigma) ** 2)))
        factors.append(
            {
                "factor": i,
                "channels": cols.tolist(),
                "innovation": value,
                "normalized": abs(value) / scale if observed and scale > 0 else None,
                "observed": observed,
            }
        )
    return {
        "state": x,
        "score": scores,
        "state_status": "estimated",
        "invalid": np.where(~valid)[0].tolist(),
        "evidence": factors,
        "iterations": iteration + 1,
        "balance_residual": np.asarray(A) @ x - b,
    }
