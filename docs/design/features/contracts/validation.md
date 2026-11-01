# Adversarial validation

| requirement | adversarial check | gate |
|---|---|---|
| CT-101 | Malformed numeric trace and undeclared properties are planted and refused. | `tests/contracts/test_plant_documents.py::test_adversarial_malformed_trace_and_extra_field_refused` |
| CT-102 | A real trace is removed from a sandbox tree and partial state is required. | `tests/contracts/test_readiness.py::test_adversarial_missing_trace_produces_partial_state` |
| CT-103 | POST and traversal requests are attempted against the real API. | `tests/test_gateway.py::test_adversarial_no_writes_or_traversal` |
