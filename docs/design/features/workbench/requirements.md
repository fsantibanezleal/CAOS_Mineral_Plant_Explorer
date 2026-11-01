# Connected plant requirements

| ID | statement | gate |
|---|---|---|
| EX-101 | The pipeline SHALL reject malformed source records with a reason. | `tests/test_contract.py::test_adversarial_bad_rows_rejected_not_coerced` |
| EX-102 | Seeded process scenarios SHALL reproduce the same numerical observations. | `tests/test_pipeline_smoke.py::test_adversarial_same_seed_bakes_identical_bytes_and_a_changed_byte_of_equal_size_is_seen` |
| EX-103 | The numerical core SHALL reject infeasible conservation constraints. | `tests/test_models.py::test_adversarial_impossible_constraints_are_rejected` |
