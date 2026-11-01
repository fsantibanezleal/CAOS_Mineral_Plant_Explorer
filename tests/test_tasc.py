import numpy as np
from pipeline.model.reconciliation import robust_reconcile, tasc


def test_tasc_preserves_constraints_and_engine_provenance():
    r = tasc(
        [20, 8, 9],
        [1, 1, 1],
        [[1, -1, -1]],
        [0],
        engine=[18, 9, 9],
        engine_sigma=[2, 2, 2],
        engine_valid=[True] * 3,
    )
    assert abs(r["balance_residual"][0]) < 1e-8
    assert r["evidence"][0]["channels"] == [0, 1, 2]
    assert r["evidence"][0]["innovation"] == 3


def test_adversarial_missing_channel_never_becomes_healthy():
    r = tasc([20, np.nan, 9], [1, 1, 1], [[1, -1, -1]], [0], valid=[True, False, True])
    assert r["state_status"] == "unobservable" and r["invalid"] == [1]
    assert np.isnan(r["score"]).all()


def test_engine_can_supply_estimate_but_not_observation():
    r = tasc(
        [20, np.nan, 9],
        [1, 1, 1],
        [[1, -1, -1]],
        [0],
        valid=[True, False, True],
        engine=[18, 9, 9],
        engine_sigma=[2, 2, 2],
        engine_valid=[True] * 3,
    )
    assert r["state"] is not None and r["invalid"] == [1] and np.isnan(r["score"][1])


def test_without_engine_tasc_reduces_to_robust_reconciliation():
    y = [20, 8, 9]
    A = [[1, -1, -1]]
    assert np.allclose(
        tasc(y, [1] * 3, A, [0])["state"], robust_reconcile(y, [1] * 3, A, [0])["state"], atol=1e-7
    )
