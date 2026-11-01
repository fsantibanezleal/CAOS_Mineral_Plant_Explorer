# Implemented method families and the questions they answer

The product has six discrepancy-detector formulations and four distinct downstream physical calculations. Ablations and external-source adapters do not inflate this count. The physical methods answer different questions with different outputs; they are not ten competing fault detectors and are not pooled into a fictitious common ranking. This inventory is a scoped implementation record, not certification of every product-depth criterion or field validation.

| Family | Input and result | Execution and verification |
|---|---|---|
| Engineering thresholds | Original-unit channel observations to normalized nominal deviations | Same6144-cell reference matrix; hand-worked scale and boundary checks |
| Weighted constrained reconciliation | Original-unit observations and diagonal scales to feasible state | Independent KKT projection and deficient/inconsistent-constraint tests |
| Huber reconciliation | Same feasible-state question with bounded innovation influence |48independent null-space objectives, projected stationarity and equality checks |
| Histogram causal prediction | Four past16-channel vectors to next-state residuals | Actually fitted16tree regressors; disjoint normal fit/calibration; original768testslots |
| Ridge causal prediction | Same causal features to16linear next-state predictions | Separate fitted coefficient checkpoint, independent augmented solve, unit-range/admission tests and768additional paired rows |
| Transport-aware coherence | Aligned observations and fixed uncertain solids ratios to constrained innovations | Same original protocol and prior/timing/topology ablations; negative result retained |
| Finite-volume hindered settling | Column flows/fractions and time to outlet/profile/storage | Conservative flux, exact integrated accounting,640-to2000cell refinement and capacity refusal |
| Shrinking-core/CSTR extraction | Particle time relation and residence distribution to acid-limited dissolved Cu | Reaction-limit closed form, quadrature/refinement and acid/copper closure |
| Ideal crosscurrent extraction | Aqueous feed, fresh organic and distribution ratio to transferred Cu | Independent stagewise/closed-form conservation; no countercurrent simulation claim |
| Faraday electrowinning | Current/efficiency/voltage/available solution Cu to cathode and power | Charge accounting, solution cap, zero-current and original-unit Python/TypeScript parity |

The [model registry](../../models/registry.json) names the two fitted families, exact manifests and evaluation files. [Controlled inference](../problem-types/02_state-coherence-experiment.md) and [downstream assumptions](../problem-types/01_downstream-process-boundaries.md) state their separate validity limits. Site instruments, calibrated geometry and operator acceptance remain unavailable.
