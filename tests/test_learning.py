import numpy as np
import pytest
from pipeline.model.learning import fit_normal, lagged
from pipeline.model.scenarios import align, conservation_matrix, engine_prior, generate


def test_lag_features_never_include_current_or_future_target():
    a = np.arange(100).reshape(20, 5)
    x, y = lagged(a, 4)
    assert np.array_equal(x[0, :5], a[3]) and np.array_equal(y[0], a[4])
    assert x.max() < a[-1].max()


def test_adversarial_split_seed_leakage_rejected():
    with pytest.raises(ValueError):
        fit_normal([100], [100])


def test_clean_transport_aligned_balances_are_exact():
    s = generate(seed=8, noise=0)
    assert np.max(np.abs(align(s.truth)[14:] @ conservation_matrix().T)) < 1e-8
    raw = s.observed.copy()
    p, _ = engine_prior(align(raw))
    raw[:, 0] *= 2
    changed, _ = engine_prior(align(raw))
    assert np.allclose(changed[14:, :12], p[14:, :12] * 2)


def test_delay_misspecification_is_negative_control():
    s = generate("delay", seed=1001)
    assert not s.fault.any()
    assert s.observed.shape == (160, 16)
