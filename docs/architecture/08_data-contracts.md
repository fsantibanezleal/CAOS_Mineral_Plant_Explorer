# Typed plant boundaries

The catalog owns 13 contracts: parameters, index, case manifest, trace, plant graph, engine evidence, state-model metadata, observation, readiness, API, benchmark, downstream and paired analysis. The generator materializes JSON Schema, OpenAPI and examples. The version lock refuses schema drift under an unchanged semantic version.

The graph has stable equipment/stream IDs, metre geometry, dimensional stream units, separate water flow and a semantic tag catalog. An observation includes tag/asset identity, finite value or null, canonical unit, source/server/receipt times, explicit freshness basis, sequence and quality. Graph revisions prevent mixing a source with incompatible equipment mappings.

The trace distinguishes observations from estimates and carries causal evidence lags. Missingness is explicit null, never zero. Source engine records retain immutable commit or package version, license, original input configuration and actual numeric paths. Producer JSON validation and generated TypeScript consumers use an independent fixture tree to test provider replacement. A content hash verifies bytes, not scientific validity.
