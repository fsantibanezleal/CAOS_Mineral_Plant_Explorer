# Requirements: the example workbench, end to end

EARS (Mavin et al., RE'09, doi:10.1109/RE.2009.9). Every requirement names the gate that fails when it is violated.

| ID | Requirement | Gate |
|---|---|---|
| EX-001 | WHEN the bake runs a case, THE pipeline SHALL fail if a result metric lies outside the range the case declares, naming the metric. | `tests/test_expect.py::test_a_value_outside_its_range_is_named` |
| EX-002 | THE pipeline SHALL write identical artifacts for the same case and seed. | `tests/test_pipeline_smoke.py::test_adversarial_same_seed_bakes_identical_bytes_and_a_changed_byte_of_equal_size_is_seen` |
| EX-003 | IF a test writes into the committed artifacts, THEN THE test session SHALL fail and name the files. | `tests/conftest.py` |
| EX-004 | WHEN an ingestion value is missing, non-numeric, NaN or out of range, THE pipeline SHALL reject the record with its reason. | `tests/test_contract.py::test_adversarial_bad_rows_rejected_not_coerced` |
| EX-005 | THE web SHALL read exactly the keys the pipeline writes, with their types, in every committed artifact. | `frontend/src/lib/contract.test.ts::the index conforms and names a baked default case` (and, per case, `manifest and trace conform`, over the bake and the provider tree) |
| EX-006 | THE live engine SHALL reproduce every baked trace to the trace rounding. | `tests/template/adversarial/test_requirements_example.py::test_adversarial_an_engine_that_drifts_from_the_python_engine_fails_the_parity_and_convergence_tests` (which first runs the parity test of `frontend/src/engine/sir.parity.test.ts` on the unchanged engine, one test per baked case) |
| EX-007 | THE live engine SHALL converge to the final size at first order in the step. | `frontend/src/engine/sir.parity.test.ts::the engine converges to the final size at first order, as the Methodology page states` |
| EX-008 | IF an artifact answers anything but JSON, THEN THE web SHALL raise an error naming the file. | `frontend/src/api/artifacts.test.ts::adversarial: refuses an HTML answer (the host fallback for a missing file)` |
| EX-009 | WHEN a reader opens any route directly, with or without a trailing slash, THE site SHALL answer 200 with that route. | `frontend/scripts/materialize-routes.mjs`, measured by `frontend/scripts/gate.mjs` (G4) |
| EX-010 | WHILE the App route is open at 1280x800 or larger, THE drawn views SHALL cover at least half of the viewport. | `frontend/scripts/gate.mjs` (G6) |
| EX-011 | WHEN any registered control changes, THE workbench SHALL change the selection key, and no view SHALL keep an earlier key. | `frontend/scripts/gate.mjs` (G9) |
| EX-012 | THE repository SHALL state its version in VERSION only. | `scripts/check_version_coherence.py` |
| EX-013 | IF the example remains in an instantiated product, THEN THE guards SHALL fail and list where. | `scripts/check_template_residue.py` |
| EX-014 | IF a test module outside `tests/template/` exercises a base guard or tool and holds a string the residue guard treats as example residue, THEN THE test suite SHALL fail and name the module. | `tests/test_guards.py::test_no_example_bound_test_of_a_base_guard_is_left_outside_tests_template` |
| EX-015 | WHEN `scripts/instantiate.py` makes a product, THE script SHALL remove `tests/template/`, the base guards' tests that need the example, and the feature rows whose gate is one of them, and say so, so that the product's SDD guard passes from its first run. | `tests/test_guards.py::test_adversarial_instantiate_removes_the_template_own_tests_and_says_so` |
