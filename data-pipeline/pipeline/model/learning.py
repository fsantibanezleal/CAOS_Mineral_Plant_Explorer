"""Real normal-state training with causal lags and disjoint calibration seeds."""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor

from .scenarios import generate

LAGS = 4


def lagged(values, lags=LAGS):
    x = np.asarray(values, float)
    if x.ndim != 2 or len(x) <= lags:
        raise ValueError("insufficient causal history")
    return np.concatenate([x[lags - k : len(x) - k] for k in range(1, lags + 1)], axis=1), x[lags:]


def fit_normal(train_seeds=range(100, 108), calibration_seeds=range(200, 204)):
    train_seeds = list(train_seeds)
    calibration_seeds = list(calibration_seeds)
    if set(train_seeds) & set(calibration_seeds):
        raise ValueError("training/calibration seed leakage")
    pairs = [lagged(generate(seed=s, steps=200).observed) for s in train_seeds]
    X = np.concatenate([x for x, y in pairs])
    Y = np.concatenate([y for x, y in pairs])
    scale = np.std(Y, axis=0)
    scale = np.maximum(scale, 1e-9)
    model = MultiOutputRegressor(
        HistGradientBoostingRegressor(
            max_iter=70, max_leaf_nodes=12, l2_regularization=1, max_bins=64, random_state=41
        )
    )
    model.fit(X / np.tile(scale, LAGS), Y / scale)
    residual = []
    for seed in calibration_seeds:
        x, y = lagged(generate(seed=seed, steps=200).observed)
        residual.append(np.abs(y - model.predict(x / np.tile(scale, LAGS)) * scale))
    errors = np.concatenate(residual)
    q = np.quantile(errors, 0.995, axis=0, method="higher")
    q = np.maximum(q, 1e-8)
    return {
        "model": model,
        "scale": scale,
        "threshold": q,
        "train_seeds": train_seeds,
        "calibration_seeds": calibration_seeds,
        "lags": LAGS,
        "normal_training_rows": len(Y),
        "calibration_rows": len(errors),
        "normal_mae": np.mean(errors, axis=0),
    }


def forecast_scores(bundle, values):
    values = np.asarray(values, float)
    if not np.isfinite(values).all():
        raise ValueError("learned model requires explicitly prepared finite lag input")
    x, y = lagged(values, bundle["lags"])
    pred = bundle["model"].predict(x / np.tile(bundle["scale"], bundle["lags"])) * bundle["scale"]
    out = np.full(values.shape, np.nan)
    out[bundle["lags"] :] = np.abs(y - pred) / bundle["threshold"]
    return out
