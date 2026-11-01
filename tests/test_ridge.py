"""Independent linear algebra, units and rejected-history checks for the second family."""

import numpy as np
import pytest
from pipeline.model.learning import fit_ridge, lagged, forecast_scores
from pipeline.model.scenarios import generate
from pipeline.stages.learned_compare import evaluate_ridge, compare


@pytest.fixture(scope="module")
def ridge():
    return fit_ridge()


def test_ridge_matches_independent_centered_normal_equations(ridge):
    pairs = [lagged(generate(seed=s, steps=200).observed) for s in ridge["train_seeds"]]
    x = np.concatenate([a for a, _ in pairs]) / np.tile(ridge["scale"], 4)
    y = np.concatenate([b for _, b in pairs]) / ridge["scale"]
    xc, yc = x - x.mean(axis=0), y - y.mean(axis=0)
    w = np.linalg.solve(xc.T @ xc + np.eye(x.shape[1]), xc.T @ yc)
    intercept = y.mean(axis=0) - x.mean(axis=0) @ w
    assert np.allclose(ridge["model"].coef_, w.T, atol=1e-9)
    assert np.allclose(ridge["model"].intercept_, intercept, atol=1e-9)
    assert ridge["normal_training_rows"] == 1568 and ridge["calibration_rows"] == 784


def test_ridge_predicts_each_channel_in_its_own_observable(ridge):
    scenario = generate(seed=1000)
    x, y = lagged(scenario.observed)
    prediction = ridge["model"].predict(x / np.tile(ridge["scale"], 4)) * ridge["scale"]
    span = np.ptp(y, axis=0)
    assert np.all(prediction >= y.min(axis=0) - span)
    assert np.all(prediction <= y.max(axis=0) + span)
    assert np.all(np.std(prediction, axis=0) > 0)
    assert np.isfinite(forecast_scores(ridge, scenario.observed)[4:]).all()


def test_ridge_masks_rejected_finite_values_before_lag_preparation(ridge):
    from copy import deepcopy

    a = generate("unit", seed=1000)
    b = deepcopy(a)
    b.observed[~b.valid] = 1e9
    row_a, scores_a = evaluate_ridge(a, ridge)
    row_b, scores_b = evaluate_ridge(b, ridge)
    assert row_a == row_b
    assert np.allclose(scores_a, scores_b, equal_nan=True)
    assert row_a["scored_points"] + row_a["unscorable_points"] == 146 * 16


@pytest.mark.parametrize(
    "train,cal,alpha",
    [
        ([100], [100], 1),
        ([], [200], 1),
        ([100, 100], [200], 1),
        ([100], [200], 0),
        ([100], [200], float("nan")),
    ],
)
def test_ridge_refuses_undefined_or_leaking_fit(train, cal, alpha):
    with pytest.raises(ValueError):
        fit_ridge(train, cal, alpha)


def test_pairing_refuses_incomplete_reference(ridge):
    import json
    from pathlib import Path

    protocol = json.loads(
        (Path(__file__).resolve().parents[1] / "data/derived/benchmark.json").read_text(encoding="utf-8")
    )["protocol"]
    with pytest.raises(ValueError, match="incomplete"):
        compare({"protocol": protocol, "rows": []}, ridge)


def test_adversarial_accepted_nonfinite_target_is_never_imputed_for_scoring(ridge):
    s = generate(seed=1000)
    s.observed[20, 0] = np.nan
    with pytest.raises(ValueError, match="nonfinite"):
        evaluate_ridge(s, ridge)


def test_adversarial_frozen_release_refuses_missing_second_model_manifest(tmp_path):
    import shutil
    from pathlib import Path
    from pipeline.stages.bake_plant import validate

    root = Path(__file__).resolve().parents[1]
    out = tmp_path / "derived"
    shutil.copytree(root / "data/derived", out)
    (out / "state-model-ridge.json").unlink()
    with pytest.raises(ValueError, match="absent"):
        validate(out)
