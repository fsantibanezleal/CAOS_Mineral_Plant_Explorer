# Software design document: OreBridge

Status: revised product design, 2026-11-01. The global-plus-area visual architecture and acceptance criteria are specified in [plant-workbench-sdd.md](plant-workbench-sdd.md) and [plant-workbench-tdd.md](plant-workbench-tdd.md). The previous single-global-diagram behavior does not satisfy this design. The visual and reference review is recorded in [visual-reference-review.md](visual-reference-review.md).

## Problem and non-goals

Provide one connected mine-to-plant workspace with a global overview and distinct, detailed area views in 2D process schematic and 3D. Shared asset/stream identity connects geometry, diagrams, live/replay observations, trends and CAOS engine evidence. The global view must lead to each area's own process composition; selecting an area must not leave the same full-plant diagram on screen.

The public reference plant is an authored copper sulfide/oxide complex with physically distinct concentrator and leach routes, shared ore arrival and water services. It is not an as-built representation of any mine. No actual site data has been supplied. The gateway is read-only; no write, setpoint, PLC method, dispatch or control route is implemented. Displayed tailings observations never establish geotechnical safety. Synthetic replay, CAOS engine artifacts and actual site observations remain separately identified.

## Executive brief

Data file: content/executive.json

The brief frames current energy and water pressures for plant operations, engineering, instrumentation/reliability and water/tailings roles. Cochilco's electricity and water projections are sector context, never claimed savings. Three original, themed bilingual SVGs explain fragmented context, shared asset identity and linked selection. Written before dimensioning and model code.

## Research basis

| decision | what the research found | source |
|---|---|---|
| Do not claim 3D/data binding is a new invention | Azure 3D Scenes and AWS TwinMaker already map scene geometry to twin entities, live data, graph relationships and overlays | https://learn.microsoft.com/en-us/azure/digital-twins/how-to-use-3d-scenes-studio ; https://docs.aws.amazon.com/iot-twinmaker/latest/guide/tm-knowledge-graph-scene.html |
| Preserve instrument semantics | OPC UA Mining General 1.01 supplies mining type definitions, while DataValues carry status, source and server timestamps | https://reference.opcfoundation.org/specs/OPC-40560/full ; https://reference.opcfoundation.org/specs/OPC-10000-4/7.11 |
| Separate site observation and public replay | OPC UA security requires certificate trust and authorization; data access does not imply safe remote exposure | https://reference.opcfoundation.org/specs/OPC-10000-2/full |
| Share process identity without claiming DEXPI conformance | DEXPI 2.0.1 models plant/process engineering exchange; our bounded asset graph is not a full DEXPI implementation | https://dexpi.org/specifications/ |
| Use standard geometry node identity | glTF 2.0 has hierarchical nodes and extras; geometry and instrument mappings remain separate checked contracts | https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html |
| Weighted reconciliation baseline | Linear constrained WLS projects inconsistent measured flows onto conservation constraints; rank/observability limit fault identifiability | https://doi.org/10.1016/j.mineng.2018.04.023 |
| Robust residual estimator | Huber loss reduces large-residual influence; it does not establish causal fault identity | https://doi.org/10.1214/aoms/1177703732 |
| Implemented learned predictor | Histogram gradient boosting is a real trained multivariate causal-lag comparison, not an implementation of GDN | https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingRegressor.html |
| Learned multichannel forecasting comparison | GDN learns sensor relationships and scores deviations; graph-based anomaly localization already has prior art | https://arxiv.org/abs/2106.06947 |
| Do not hide missing values as healthy | Graph spatiotemporal anomaly detection explicitly studies missing values; data-quality flags are separate from process anomalies | https://arxiv.org/abs/2401.05800 |
| Real source engines | minehaulsim, bedblend, milldem and oreblocks are released PyPI packages; app-specific outputs are ingested from exact public source SHAs | https://pypi.org/project/minehaulsim/ ; https://pypi.org/project/bedblend/ ; https://pypi.org/project/milldem/ ; https://pypi.org/project/oreblocks/ |
| Current problem context | Cochilco projects 20.2 percent electricity growth 2025-2034 and 67.6 percent seawater supply share in 2034 | https://www.cochilco.cl/web/informe-proyeccion-del-consumo-de-energia-electrica-en-la-mineria-del-cobre-periodo-2025-2034-2/ ; https://www.cochilco.cl/web/https-www-cochilco-cl-web-download-1014-2026-15581-informe-proyeccion-de-la-demanda-de-agua-en-la-mineria-del-cobre-en-chile-periodo-2025-2034-pdf/ |

| Additional trained linear causal family | Native multioutput Ridge with L2 coefficients and an unpenalized intercept; actual scaled fit and separate original-unit residual calibration | https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html |

UNVERIFIED: field performance, site geometry/credentials and global priority/superiority of the proposed method. Published vendor features establish prior art, not independent performance. No site-specific predictive claim is made.

## Sizing and contracts

One coherent plant has at least 35 equipment assets, 40 material/water streams and 16 benchmark observation channels across extraction, stockpiling, crushing, grinding/classification, flotation, thickening/filtering, leaching/SX/EW, utilities and tailings. A procedural engineering scene is authored at real relative dimensions; imported glTF assets bind by an explicit node-to-asset map. The current scene has 36 distinct assets; an unmeasured large-plant scalability claim is not made.

Twelve case scenarios, four severity levels at fixed noise scale 1 and sixteen held-out seeds give 768 paired test scenarios. Training/calibration uses disjoint seeds and normal periods. Every model is evaluated on the same observations, fault truth and event timestamps; metrics are pointwise with no point-adjusted score. Families include healthy load transition, bias, drift, frozen/stale tag, unit mismatch, tag swap, missing data, out-of-order delivery, topology break, engine disagreement, water imbalance and downstream delay.

Raw caches/models/screenshots stay outside the repository via environment roots. Compact derived public artifacts carry SHA-256, source commit, license and synthetic/real class. Every boundary is a catalog row with a schema, producer/consumer checks and missing-data behavior. The new boundaries are plant asset graph, observation, engine capability/evidence, visual snapshot and state-model bundle.

## Technology and versions

The verified runtime is Python 3.12.10 and Node v24.14.1. Template 0.14.001 and shell 0.20.0 are verified. All direct dependencies below are resolved from the installed environment and lock.

| component | package | version | use | alternative considered |
|---|---|---|---|---|
| Python | asyncua | 2.1.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | bedblend | 0.7.3 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | fastapi | 0.162.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | httpx | 0.28.1 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | ipykernel | 7.4.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | joblib | 1.6.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | jsonschema | 4.26.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | matplotlib | 3.11.2 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | milldem | 0.3.1 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | minehaulsim | 0.12.1 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | nbclient | 0.11.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | nbformat | 5.11.1 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | numpy | 2.2.6 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | openapi-spec-validator | 0.9.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | oreblocks | 0.6.6 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | pytest | 9.2.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | ruff | 0.15.18 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | scikit-learn | 1.9.1 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | scipy | 1.18.1 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| Python | uvicorn | 0.54.0 | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |
| shell | @fasl-work/caos-app-shell | 0.20.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | katex | 0.19.1 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | lucide-react | 1.52.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | react | 19.3.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | react-dom | 19.3.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | react-router | 8.4.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | three | 0.187.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | uplot | 1.6.32 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | zustand | 5.0.15 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | @types/node | 24.19.1 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | @types/react | 19.3.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | @types/react-dom | 19.3.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | @types/three | 0.187.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | @vitejs/plugin-react | 6.1.1 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | ajv | 8.20.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | ajv-formats | 3.0.1 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | openapi-typescript | 7.13.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | playwright | 1.63.0 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | typescript | 5.9.3 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | vite | 8.3.5 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | vitest | 5.0.3 | Visual client or build validation | Custom framework, rejected to preserve shared shell |
| Browser | minimatch | 11.0.1 | Visual client or build validation | Custom framework, rejected to preserve shared shell |

## Resources

| stage | memory | disk | time | where it runs |
|---|---|---|---|---|
| bake | 2 GiB budget, CPU threads bounded to one | 1 MiB checkpoint and less than 20 MiB compact replay; external cache | Full matrix measured 146.8 s; training budget 5 min | External Python environment on workstation |
| tests | 2 GiB budget per worker | Temporary fixtures outside repository | Core and gateway measured under 30 s; full suite budget 15 min | Workstation and cheap CI |
| build | 2 GiB Node budget | Static output budget 20 MiB | Vite measured 2.4 s after type checking | Workstation and GitHub Actions |
| deploy | Static host, no model process | GitHub Pages artifact budget 100 MiB | Deployment budget 10 min | GitHub Pages |

## Contracts

1. Plant graph: stable equipment and directed stream IDs, stage, equipment type, coordinates/dimensions, diagram coordinates, units, semantic tag bindings and provenance. Reject duplicate/dangling IDs, non-finite geometry and wrong units.
2. Observation: tag/asset/quantity, finite value or explicit absent state, canonical unit, UTC source/receipt times, monotone source sequence and quality code. Reject future time beyond tolerance; stale and out-of-order values cannot replace newer healthy state.
3. Engine evidence: engine source/release/SHA, artifact SHA-256 or package version, input configuration, actual output paths, units, validity and execution/replay lane. Import refuses changed source hash and missing numeric path. No private engine modules are imported.
4. Twin snapshot: graph revision, selected time, aligned observations, engine evidence, quality states, model results and reasons. The same snapshot drives the 3D view, process diagram, asset table and trends.
5. State bundle: training seeds, normalization, baseline/learned parameters, calibration threshold, source hash and environment. The held-out case never tunes these fields.

## Lanes

Offline: download exact public source artifacts, execute real released engine packages, build the authored plant, prepare disjoint normal/fault scenarios, fit/calibrate, infer, compare, export and validate. Full benchmark/training stays outside CI. Public replay: immutable, versioned, compact snapshots and model evidence. Browser live: selection, timeline, thresholds and bounded topology checks, with Python parity fixtures. Site observation: an operator-configured read-only local gateway serves the same typed snapshot contract; actual site access is separate from public release evidence. No live-site connection is claimed.

## Method ladder

| id | tier | method | acceptance criterion | gate |
|---|---|---|---|---|
| M-1 | classical | Independent engineering thresholds and freshness/units validation | Exact channel-specific alarms and invalid-input refusal under hand-worked boundary cases | `tests/test_observations.py` |
| M-2 | classical | Linear constrained weighted least-squares reconciliation | Exact solution agrees with independent constrained solve, conservation residual below 1e-9 and no singular solve on deficient graphs | `tests/test_models.py` |
| M-3 | sota | Huber robust reconciliation using SciPy optimization | Independent objective checks, finite convergence and correct degeneracy on zero residual, with held-out detection results | `tests/test_models.py` |
| M-4 | sota | Calibrated multichannel normal-state prediction | Real trained normal-state model, held-out forecast errors and calibration threshold; next-step inputs never use future observations | `tests/test_learning.py` |
| M-5 | classical | Trained causal ridge autoregression with SVD and an unpenalized intercept | Independent augmented/normal-equation agreement, physical output units, refused leaking/invalid history and paired held-out counts with its own checkpoint | `tests/test_ridge.py` |
| BS-1 | beyond | Topology-Aware State Coherence | A temporal validity mask and robust fusion of compatible fixed OreFlow-reference ratio pseudo-observations with conservation factors; declared source/graph metadata, same-matrix evaluation and topology/engine/freshness ablations | `tests/test_tasc.py` |

## Cases

The twelve scenario families above apply to the same connected reference plant. They are not different isolated calculators. Variants change only a declared fault magnitude, source-noise level or load. Zero fault is an explicit negative control. The accounting graph distinguishes water and dry solids. Circulating-load ratios are authored reference quantities. No dynamic inventory state is inferred; the sixteen-channel benchmark uses steady-state factors only after declared causal alignment. The leach route and concentrator share ore arrival via explicit routing and do not imply all ores are chemically interchangeable.

## Oracles

The recovery-relation perturbation is balanced at simultaneous raw time. Unequal alignment can introduce transient factor residuals at its boundaries, so that family does not isolate prior compatibility. Event latency starts at first comparable aligned-label availability and excludes alignment wait from raw fault onset.

Stable asset ID and graph adjacency come from the authored graph manifest. Exact closed balances and independent constrained optimization check reconciliation. Known injected faults establish detection truth; delay events are scored after declared transport time, not treated as simultaneous contradictory values. Engine output is compared with its source artifact or actual package result, never with a hand-invented expected win. Neither TASC nor a language model is an oracle. Metrics retain missed faults and false alerts.

## Beyond the state of the art

BS-1 proposes Topology-Aware State Coherence (TASC). Hypothesis: explicitly aligning source quality, process transport time and engine validity before robust constrained state projection reduces false localization under asynchronous observations while retaining detection of process imbalance. The method is not simply a benchmark: it changes state inference by treating compatible fixed-reference relations as uncertain pseudo-observations, excluding stale/misunit data, aligning source time to each process factor, and solving a robust constrained fusion problem. Its batch score is a calibrated standardized measurement adjustment. Exported trace metadata identifies channels, method evidence times and source reference cases; it does not export per-alarm causal diagnosis paths. The reusable single-frame function can report algebraic factor membership, which is not proof of physical root cause.

For state x, accepted observations y, observation map H, engine prior m and process constraints A x=b, minimize the sum of Huber losses on normalized measurement innovations and compatible engine-prior innovations subject to valid conservation constraints. Freshness/units/identity gates define the admissible rows; compatibility and model variance weight the fixed reference relative to observations, without a universal guarantee that its influence is appropriate. The benchmark has eleven fixed homogeneous steady-state factors. Dynamic inventory estimation is not implemented; a site with accumulation needs additional state equations before those balances apply. With no admissible engine prior it reduces to robust observation reconciliation. With identity topology it reduces to independent residuals.

Novelty is a proposed combination with a precise algorithm; global priority and improvement over industrial twin platforms are unverified. Existing robust reconciliation, graph diagnosis and model fusion are cited. Compare thresholds, WLS, robust reconciliation and the learned baseline under identical held-out cases. Ablate timing alignment, engine priors and graph factors. Publish neutral/negative results. Public reader-facing names never call the method by its internal tier.

## Deploy driver

Public GitHub Pages at orebridge.fasl-work.com is the candidate for static Three.js code and compact replay artifacts. A local gateway is a site deployment tool, not a second public hosted copy. Measure compressed JS, total scene/artifact payload, triangle count, workstation memory, frame times and p95 observation projection latency. If static delivery cannot meet them, choose a supported service target based on measurement before release. Domain and deployment remain unclaimed until verified.

## Risks and kill criteria

Incorrect asset mapping: reject duplicate bindings and expose source node IDs. Misleading live labeling: synthetic/replay remains explicit in every view and export. Missing observations: explicit invalid/stale state, never zero or retained healthy color. Ill-conditioned state estimation: SVD rank/condition check and refusal, not silent inversion. Unsupported engine input: enforce capability envelopes and preserve upstream caveats. Scene overload: measured stress profile and bounded label/LOD budgets. OT boundary: read-only tags, no method/write calls, local secrets and explicit origins. No site-specific/live performance claim without an authorized measured connection.

## ADR fit

| ADR | Rule | Carried by |
|---|---|---|
| ADR-0057 | Instantiate frozen product substrate | Current template 0.14.001, named offline stages and two data contracts |
| ADR-0058 | Five bilingual themed architecture diagrams | `frontend/src/architecture/` |
| ADR-0069 | Complete scientific method verticals | Offline stages, checkpoint manifests, same-matrix benchmark and notebooks |
| ADR-0070 | Plant explorer Focus and return state | `SurfacePage` Focus keeps the selected plant view, area, and replay state while exposing its controls in the Focus rail |
| ADR-0071 | Viewport, reachable controls and stage dimensions | Shared shell and full browser gate |
| ADR-0074 | CI never trains | Cheap artifact/contract/model smoke only |
| ADR-0075 | Design and named verification gates before code | This SDD and feature requirements |
| ADR-0078 | Fix base issues in base | Exact shared-shell pin, no frame CSS overrides |
| ADR-0080 | Dimensioned typed contracts with missing behavior | Contract catalog, examples and two-sided tests |

## Commands

| purpose | command | expected result |
|---|---|---|
| bake | `python data-pipeline/run.py all` | Versioned, hashed complete reference plant and benchmark artifacts |
| tests | `python -m pytest` | Contracts, source adapters, algebraic oracles and adversarial cases pass |
| build | `cd frontend && npm run build` | Generated contract types, TypeScript and static routes pass |
| deploy | GitHub Actions deploy-pages on the reviewed main release | Exact commit and artifact hashes reachable at the sole public host |

## Pre-implementation design review

Reviewed 2026-10-31 against actual CAOS sources and current twin-platform documentation. Finding D1: ordinary 3D/live binding already exists; no novelty claim for that feature. D2: app engines are not libraries; consume versioned exported artifacts, public APIs or real released packages, never private-module imports. D3: a mill power model is not a flotation model and does not predict an actual plant; retain each source's support and calibration limits. D4: dynamic process storage invalidates naive steady-state balances; include inventory derivatives or refuse that factor. D5: synthetic plant examples cannot validate live operating efficacy. D6: asynchronous data must be checked before model residuals, with out-of-order arrival tested independently. Each finding is incorporated in the contracts, method definition and kill criteria. The subsequent independent numerical/source review and corrected-candidate recheck are recorded below; final release checks remain separate.

## Notebook method entrypoints

The didactic notebooks invoke these canonical implementations directly. They do not define replacement methods.

- `pipeline.model.scenarios.generate`
- `pipeline.model.scenarios.align`
- `pipeline.model.scenarios.conservation_matrix`
- `pipeline.model.scenarios.engine_prior`
- `pipeline.model.learning.lagged`
- `pipeline.model.learning.forecast_scores`
- `pipeline.model.thickener.simulate_thickener`
- `pipeline.stages.plant_evaluate.batch_projection`
- `pipeline.stages.plant_evaluate.calibrate`
- `pipeline.stages.plant_evaluate.raw_scores`
- `pipeline.stages.plant_evaluate.confusion`
- `pipeline.stages.analysis.analyze`

## Corrected independent review

An independent read-only review reproduced all four released package digests and all ten pinned artifact hashes/metrics, checked 48 robust objectives against an independent optimizer and reconciled every aggregate count. Its corrected-candidate recheck resolved eleven identity, timing, boundary, causality, geometry and numerical-resolution findings. Claim scope is bounded here: fixed noise scale one, fixed dry-solids ratio prior, eleven steady-state factors, explicit evidence times and no dynamic-inventory or automatic causal-diagnosis claim. Full local release checks, exact-commit CI and served-artifact verification remain separate evidence.

## Additional learned family, release extension

The first implementation and published eight-method study used one trained HGB family. The depth review identified the requirement for a second actual trained family. Release0.01.001 adds regularized linear causal prediction, preserving the original6144-cell study, paired analysis and12trace bytes. The additional comparison has768reused HGB rows and768new Ridge evaluations on the same original protocol slots. It is a post-publication extension using already known test seeds, not prospectively untouched selection. Alpha1, native multioutput SVD and an unpenalized intercept were fixed before viewing Ridge aggregate results. Each target is independent conditional on shared features; no correlated-output covariance is fitted.

Primary source: [scikit-learn Ridge](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html), verified2026-11-01. Ridge minimizes an unaveraged squared error plus alpha times coefficient squared norm. Target standard deviations from training scale all four lag vectors and targets; this does not itself subtract the mean. Predictions and calibration residuals return to each channel's original units. Training100..107, normal calibration200..203, first14 common evaluation rows withheld, higher99.5th normal residual quantile.

Model boundary: separate real checkpoints and manifests for HGB and Ridge, a typed learned-comparison artifact with exact protocol joins, all counts/coverage and seed-block uncertainty. A malformed mask admitting nonfinite target data is refused. Missing source values are filled only inside input history; numerical targets remain unavailable. Ridge may gain recall at a higher false-alert rate and lower precision; no uniform superiority or field efficacy follows. `tests/test_ridge.py`, two-sided contract tests and independent review verify this extension.
