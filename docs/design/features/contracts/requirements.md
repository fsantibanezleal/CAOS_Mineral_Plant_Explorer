# Connected plant requirements

| ID | statement | gate |
|---|---|---|
| CT-101 | The producer and consumer SHALL reject malformed plant documents and verify immutable hashes. | `tests/contracts/test_plant_documents.py::test_adversarial_malformed_trace_and_extra_field_refused` |
| CT-102 | Missing scientific artifacts SHALL remain unavailable rather than appearing as healthy output. | `tests/contracts/test_readiness.py::test_adversarial_missing_trace_produces_partial_state` |
| CT-103 | The gateway SHALL reject unauthorized reads and expose no control writes. | `tests/test_gateway.py::test_adversarial_no_writes_or_traversal` |
