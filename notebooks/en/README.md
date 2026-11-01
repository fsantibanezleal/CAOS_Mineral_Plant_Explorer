# Learning connected plant state inference

Work through this single topic in order. Every notebook executes the implemented methods on actual OreBridge synthetic
inputs. The sequence moves from one conservation equation to the limitations of an entire inference experiment.
The [Spanish tree](../es/README.md) has matching paths and computations with its own Spanish prose, comments and figures.

| Topic | Level | Notebook | What the worked lesson teaches |
|---|---|---|---|
| 01 Plant state | 1 · Fundamentals | [Reconcile a flotation parcel](01-plant-state/01-reconcile-a-flotation-parcel.ipynb) | Distribute a measured closure correction with WLS and test sensitivity to feed-meter confidence. |
| 01 Plant state | 2 · Method in practice | [Time, storage and robustness](01-plant-state/02-time-storage-and-robustness.ipynb) | Separate a healthy transport transient and modeled solids accumulation from an injected feed bias, then compare WLS and Huber. |
| 01 Plant state | 3 · Comparison with published methods | [Causal prediction and robust estimation](01-plant-state/03-causal-prediction-and-robust-estimation.ipynb) | Fit histogram gradient boosting, inspect causal lags and disjoint calibration, and compare it with Huber on identical observations. |
| 01 Plant state | 4 · Proposed methods | [TASC evidence and refusal](01-plant-state/04-tasc-evidence-and-refusal.ipynb) | Run fusion and quality boundaries, expose ambiguous localization, evaluate timing/engine/topology ablations, and recompute paired uncertainty without concealing negative results. |

The fitting example uses scikit-learn's actual maintained estimator. GDN is cited as sensor-relationship prior work and is
not represented as an implemented comparator. The complete matrix is a committed synthetic benchmark; lesson 04 executes
fresh selected scenarios and recomputes analysis from all of its counts. No lesson claims field accuracy or operator benefit.

For setup and execution, start at [the bilingual entry](../README.md). Source definitions and scope live in
`docs/design/SDD.md` and `docs/problem-types/02_state-coherence-experiment.md`.
