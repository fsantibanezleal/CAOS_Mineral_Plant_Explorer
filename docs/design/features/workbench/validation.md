# Adversarial validation

| requirement | adversarial check | gate |
|---|---|---|
| EX-101 | NaN, missing family, invalid identity and boolean seeds are planted. | `tests/test_contract.py::test_adversarial_bad_rows_rejected_not_coerced` |
| EX-102 | A changed observation must differ from the same-seed reference. | `tests/test_pipeline_smoke.py::test_adversarial_same_seed_bakes_identical_bytes_and_a_changed_byte_of_equal_size_is_seen` |
| EX-103 | Contradictory equalities and zero uncertainty are planted. | `tests/test_models.py::test_adversarial_impossible_constraints_are_rejected` |
