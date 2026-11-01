import numpy as np
from pipeline import registry
from pipeline.model.scenarios import conservation_matrix, generate


def test_adversarial_same_seed_bakes_identical_bytes_and_a_changed_byte_of_equal_size_is_seen():
    a = generate("bias", 1000, 1)
    b = generate("bias", 1000, 1)
    assert np.array_equal(a.observed, b.observed)
    changed = b.observed.copy()
    changed[80, 0] += 0.01
    assert not np.array_equal(a.observed, changed)


def test_a_different_seed_is_a_different_bake_record():
    assert not np.array_equal(generate(seed=1000).observed, generate(seed=1001).observed)


def test_registered_cases_cover_all_families():
    assert len(registry.list_cases()) == 12
    assert np.linalg.matrix_rank(conservation_matrix()) == 11
