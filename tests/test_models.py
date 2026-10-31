import numpy as np
import pytest
from pipeline.model.reconciliation import independent_robust_oracle, robust_reconcile, weighted_reconcile


def test_wls_matches_independent_constrained_solution():
    y = np.array([10.0, 6.0, 5.0])
    s = np.array([1.0, 2.0, 1.0])
    A = np.array([[1.0, -1.0, -1.0]])
    r = weighted_reconcile(y, s, A, [0.0])
    exact = y - (s * s * A[0]) * (A @ y)[0] / np.sum((s * A[0]) ** 2)
    assert np.allclose(r["state"], exact) and np.linalg.norm(r["balance_residual"]) < 1e-9


def test_robust_matches_independent_huber_objective():
    A = np.array([[1.0, -1.0, -1.0, 0.0], [0.0, 0.0, 1.0, -1.0]])
    y = np.array([30.0, 10.0, 10.0, 10.0])
    sigma = np.array([1.0, 1.0, 2.0, 1.0])
    result = robust_reconcile(y, sigma, A, [0.0, 0.0])
    oracle = independent_robust_oracle(y, sigma, A, [0.0, 0.0])
    from pipeline.model.reconciliation import huber

    assert abs(result["objective"] - np.sum(huber((oracle - y) / sigma))) < 1e-5
    assert np.max(np.abs(A @ result["state"])) < 1e-8


def test_redundant_valid_constraint_is_supported():
    assert np.allclose(
        weighted_reconcile([10, 5, 6], [1, 1, 1], [[1, -1, -1], [2, -2, -2]], [0, 0])["balance_residual"], 0
    )


def test_adversarial_impossible_constraints_are_rejected():
    with pytest.raises(ValueError):
        weighted_reconcile([1], [1], [[1], [1]], [0, 1])
    with pytest.raises(ValueError):
        weighted_reconcile([1], [0], [[1]], [0])
