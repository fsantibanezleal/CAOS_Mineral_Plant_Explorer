# Configure the optional read-only source gateway

The public site is static replay. The implemented FastAPI application can also serve local compact artifacts and an authenticated OPC UA observation snapshot. Install requirements-api.txt in the local external environment and start `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. Exposing a gateway requires a separately configured authenticated HTTPS reverse proxy and explicit origin policy.

Set OREBRIDGE_OPC_ENDPOINT, OREBRIDGE_GATEWAY_TOKEN (at least 24 characters), OREBRIDGE_TAG_MAP (local JSON file) and OREBRIDGE_ORIGINS. For remote OPC, OREBRIDGE_OPC_SECURITY must name a supported policy, SignAndEncrypt, client certificate/private key and server certificate. Do not commit secrets or node maps. OREBRIDGE_ALLOW_LOCAL_TEST=1 admits unencrypted OPC only on loopback for explicit local testing.

A binding has this shape; choose actual authorized node identifiers locally:

```json
[{"tag_id":"ROM.feed","asset_id":"ROM","unit":"t/h","source_unit":"kg/s","node_id":"ns=2;s=site-feed","minimum":0,"freshness_basis":"server"}]
```

The tag/asset/canonical-unit tuple must match plant.json. A source-unit conversion must be dimensionally compatible and finite. Choose freshness_basis=source for periodically renewed source timestamps, or server when a trustworthy server confirms an unchanged value. Server freshness indicates data availability, not proof that a physical sensor cannot freeze. Both source and server timestamps are retained; naive/future/stale times and decreasing sequences are refused.

GET /api/observations requires Authorization: Bearer with the configured token and returns the graph revision plus quality-marked records. The reader performs one allow-listed batch read; a missing node stays bad without destroying other node status. No requested query parameter can expand the allow-list. No write, method, control or setpoint endpoint exists. Cross-origin calls use only explicit configured origins.

Open the workbench Source rail, enter gateway origin and token, then connect read-only. The token stays in browser memory; disconnect clears token and history. Poll errors and rejected snapshots cannot replace newer accepted state with stale healthy values. Tests include an actual local OPC server/client, authentication/origin refusal and separate browser transport interactions. No operating site connection is claimed by those local tests.
