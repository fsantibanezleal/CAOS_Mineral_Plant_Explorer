# Contract catalog

All boundaries name typed data, two-sided verification and explicit unavailable behavior. The public site replays synthetic reference evidence; the site-local gateway is independently configured and authenticated.

## Contracts

| id | version | owner | schema file | example | documents | producer test | consumer test | missing-data behavior | provider | model io | swap test | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| params-record | 2.0.0 | data-pipeline/pipeline/io/contract.py | docs/contracts/schemas/params-record.schema.json | docs/contracts/examples/params-record.json | docs/contracts/examples/params-record.json | tests/contracts/test_plant_documents.py | tests/contracts/test_plant_documents.py | missing: no scenario is executed; malformed inputs are rejected with reasons | fixture:docs/contracts/examples/params-record.json | - | tests/contracts/test_plant_documents.py | real |
| case-index | 3.0.0 | data-pipeline/pipeline/stages/bake_plant.py | docs/contracts/schemas/case-index.schema.json | data/derived/manifests/index.json | data/derived/manifests/index.json | tests/contracts/test_plant_documents.py | frontend/src/lib/contract.test.ts | missing: the site build fails and no fake cases appear | fixture:docs/contracts/fixtures/data/derived/manifests/index.json | - | tests/contracts/test_plant_documents.py | real |
| case-manifest | 5.0.0 | data-pipeline/pipeline/stages/bake_plant.py | docs/contracts/schemas/case-manifest.schema.json | data/derived/manifests/PL-01.json | data/derived/manifests/*.json, !data/derived/manifests/index.json | tests/contracts/test_plant_documents.py | frontend/src/lib/contract.test.ts | missing: selected case refuses with unavailable state | fixture:docs/contracts/fixtures/data/derived/manifests/PL-01.json | - | tests/contracts/test_plant_documents.py | real |
| trace | 3.0.0 | data-pipeline/pipeline/stages/bake_plant.py | docs/contracts/schemas/trace.schema.json | data/derived/PL-01/trace.json | data/derived/PL-*/trace.json | tests/contracts/test_plant_documents.py | frontend/src/lib/contract.test.ts | missing: no empty numeric trace is substituted | fixture:docs/contracts/fixtures/data/derived/PL-01/trace.json | - | tests/contracts/test_plant_documents.py | real |
| plant-graph | 2.0.0 | data-pipeline/pipeline/model/plant.py | docs/contracts/schemas/plant-graph.schema.json | data/derived/plant.json | data/derived/plant.json | tests/test_plant.py | frontend/src/lib/contract.test.ts | missing: 3D and diagram cannot be bound, show unavailable | fixture:docs/contracts/fixtures/data/derived/plant.json | - | tests/test_plant.py | real |
| engine-evidence | 1.0.0 | data-pipeline/pipeline/io/engines.py | docs/contracts/schemas/engine-evidence.schema.json | data/derived/engine-evidence.json | data/derived/engine-evidence.json | tests/test_engine_adapters.py | frontend/src/lib/contract.test.ts | missing: affected engine panel declares unavailable; no mock engine result | fixture:docs/contracts/fixtures/data/derived/engine-evidence.json | - | tests/test_engine_adapters.py | real |
| state-model | 1.0.0 | data-pipeline/pipeline/model/learning.py | docs/contracts/schemas/state-model.schema.json | data/derived/state-model.json | data/derived/state-model.json | tests/test_learning.py | frontend/src/lib/contract.test.ts | missing: no model prediction; exact threshold and raw evidence remain separate | baseline:data-pipeline/pipeline/model/baseline.py | in: four past multichannel observations; out: next-step state and calibrated residual; domain: authored normal reference plant | tests/test_learning.py | real |
| observation | 2.0.0 | app/gateway.py | docs/contracts/schemas/observation.schema.json | docs/contracts/examples/observation.json | docs/contracts/examples/observation.json | tests/test_gateway.py | frontend/src/lib/contract.test.ts | missing: no live source connected; replay remains explicitly replay | fixture:docs/contracts/examples/observation.json | - | tests/test_gateway.py | real |
| readiness | 2.0.0 | data-pipeline/pipeline/core/readiness.py | docs/contracts/schemas/readiness.schema.json | data/derived/readiness.json | data/derived/readiness.json | tests/contracts/test_plant_documents.py | frontend/src/readiness/readiness.test.ts | missing: fail static copy, unknown runtime state stays unknown | fixture:docs/contracts/fixtures/data/derived/readiness.json | - | tests/contracts/test_plant_documents.py | real |
| api | 3.0.0 | app/ | docs/contracts/api.openapi.json | docs/contracts/examples/api-unavailable.json | docs/contracts/examples/api-unavailable.json#UnavailableBody | tests/test_gateway.py | frontend/src/lib/api.contract.test.ts | missing: gateway returns 503 without a configured source; unauthorized readers receive 401 | fixture:docs/contracts/fixtures/data/derived | - | tests/test_gateway.py | real |
| benchmark | 2.0.0 | data-pipeline/pipeline/stages/ | docs/contracts/schemas/benchmark.schema.json | data/derived/benchmark.json | data/derived/benchmark.json | tests/contracts/test_plant_documents.py | frontend/src/lib/contract.test.ts | missing: related numerical evidence is unavailable | fixture:docs/contracts/fixtures/data/derived/benchmark.json | - | tests/contracts/test_plant_documents.py | real |
| downstream | 1.0.0 | data-pipeline/pipeline/stages/ | docs/contracts/schemas/downstream.schema.json | data/derived/downstream.json | data/derived/downstream.json | tests/contracts/test_plant_documents.py | frontend/src/lib/contract.test.ts | missing: related numerical evidence is unavailable | fixture:docs/contracts/fixtures/data/derived/downstream.json | - | tests/contracts/test_plant_documents.py | real |
| benchmark-analysis | 1.0.0 | data-pipeline/pipeline/stages/ | docs/contracts/schemas/benchmark-analysis.schema.json | data/derived/benchmark-analysis.json | data/derived/benchmark-analysis.json | tests/contracts/test_plant_documents.py | frontend/src/lib/contract.test.ts | missing: related numerical evidence is unavailable | fixture:docs/contracts/fixtures/data/derived/benchmark-analysis.json | - | tests/contracts/test_plant_documents.py | real |

## Missing-data states

Use the base vocabulary available, partial, stale, provider, training and missing. Invalid measurements never become zero or a healthy model estimate. The static site has no live plant connector; actual gateway status is inspected at runtime.

## History

| contract | version | date | change | kind |
|---|---|---|---|---|
| params-record | 1.0.0 | 2026-10-30 | inherited template boundary | initial |
| params-record | 2.0.0 | 2026-10-31 | replace domain schema with connected plant contract | major |
| case-index | 2.0.0 | 2026-10-30 | inherited template boundary | initial |
| case-index | 3.0.0 | 2026-10-31 | replace domain schema with connected plant contract | major |
| case-manifest | 4.0.0 | 2026-10-30 | inherited template boundary | initial |
| case-manifest | 5.0.0 | 2026-10-31 | replace domain schema with connected plant contract | major |
| trace | 1.0.0 | 2026-10-30 | inherited template boundary | initial |
| trace | 3.0.0 | 2026-10-31 | replace domain schema with connected plant contract | major |
| plant-graph | 1.0.0 | 2026-10-31 | first plant boundary | initial |
| plant-graph | 2.0.0 | 2026-10-31 | semantic bindings and explicit timestamp policy | major |
| engine-evidence | 1.0.0 | 2026-10-31 | first plant boundary | initial |
| state-model | 1.0.0 | 2026-10-31 | first plant boundary | initial |
| observation | 1.0.0 | 2026-10-31 | first plant boundary | initial |
| observation | 2.0.0 | 2026-10-31 | semantic bindings and explicit timestamp policy | major |
| readiness | 1.0.0 | 2026-10-30 | inherited template boundary | initial |
| readiness | 2.0.0 | 2026-10-31 | replace domain schema with connected plant contract | major |
| api | 1.0.0 | 2026-10-30 | inherited template boundary | initial |
| api | 3.0.0 | 2026-10-31 | replace domain schema with connected plant contract | major |
| benchmark | 1.0.0 | 2026-10-31 | first plant boundary | initial |
| benchmark | 2.0.0 | 2026-10-31 | semantic bindings and explicit timestamp policy | major |
| downstream | 1.0.0 | 2026-10-31 | first plant boundary | initial |
| benchmark-analysis | 1.0.0 | 2026-10-31 | first plant boundary | initial |
| surrogate-model | 1.0.0 | 2026-10-30 | inherited template slot | initial |
| surrogate-model | 2.0.0 | 2026-10-31 | removed and replaced by state-model contract | major |
