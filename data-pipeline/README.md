# Connected plant pipeline

The maintained code lives under `pipeline/`. Its named stages are source ingestion, preprocessing, training, inference, evaluation, export and validation. They share one authored equipment graph rather than separate process calculators. The default bake trains a real causal multichannel predictor; CI reads compact artifacts and never trains it.

`run.py sources` executes four exact released packages and verifies ten public JSON artifacts at pinned commits. The source lock defines license, hash, schema and numeric paths. Source failures are explicit: there is no generated substitute for missing external evidence.

`run.py all --benchmark` creates twelve 160-sample scenarios, calibrates on disjoint normal seeds, compares eight methods over 768 held-out scenarios, computes paired seed-block intervals, and exports 32 compact JSON files. `--models-root` and raw `--cache-root` must resolve outside this repository. The model manifest identifies the actual external checkpoint by SHA-256.

`infer --no-train` regenerates graph, downstream references and traces from the existing checkpoint. `evaluate --benchmark` recomputes measured comparisons. `export` updates index/readiness and validates hashes and dimensions. `validate` checks existing payloads. No stage invents a model if its checkpoint is missing.

Numerical interpretation is deliberately bounded: sixteen solids/water channels, eleven steady-state factors, known causal delays and a fixed dry-solids prior anchored to one OreFlow reference. The fourteen visual engine records are not all fused into this experiment. Source truth is used for evaluation only. Invalid sources are masked before history preparation; missing display values remain missing.

See [experiment](../docs/problem-types/02_state-coherence-experiment.md), [downstream assumptions](../docs/problem-types/01_downstream-process-boundaries.md), [contracts](../docs/contracts/catalog.md) and [reproduction](../docs/guides/01_precompute-pipeline.md).
