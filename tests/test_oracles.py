import numpy as np
import pytest
from pipeline.model.hydromet import electrowinning
from pipeline.model.reconciliation import weighted_reconcile
from pipeline.oracles import balance_projection_kkt, faraday_copper


@pytest.mark.parametrize("sigma", [[1, 1, 1], [1, 2, 3], [100, 0.1, 1]])
def test_projection_agrees_with_independent_kkt(sigma):
    y = [10, 6, 5]
    A = [[1, -1, -1]]
    a = weighted_reconcile(y, sigma, A, [0])["state"]
    b = balance_projection_kkt(y, sigma, A, [0])
    assert np.allclose(a, b, atol=1e-8)


def test_faraday_mass_matches_independent_unit_conversion():
    assert electrowinning(100000, 0.9, 2, 1000)["cathode_kg_h"] == pytest.approx(
        faraday_copper(100000, 1, 0.9)
    )
