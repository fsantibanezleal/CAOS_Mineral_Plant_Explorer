# Adversarial validation

| requirement | adversarial check | gate |
|---|---|---|
| GW-101 | Plant an invalid token and a node outside the allow-list; verify the token is rejected and extra nodes are never read. | `tests/test_gateway.py::test_adversarial_token_and_allowlist` |
| GW-102 | Supply a remote unencrypted endpoint; verify configuration refusal. | `tests/test_gateway.py::test_adversarial_remote_security` |
| GW-103 | Serve an old source timestamp from a real local OPC UA server; verify null/bad output. | `tests/test_gateway.py::test_adversarial_real_opc_stale` |
| GW-104 | Try POST and a traversal artifact path; verify rejection. | `tests/test_gateway.py::test_adversarial_no_writes_or_traversal` |

