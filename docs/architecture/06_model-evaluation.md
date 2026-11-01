# Held-out evaluation

The full matrix has 12 families,16 test seeds and4 severities:768 paired scenarios, evaluated by 8 methods for 6144 cells. Each method uses a 146-by16 scoring horizon after 14 history samples. Noise scale is 1. Aligned methods use aligned fault truth; no point adjustment expands a detection to a whole event.

Numerical confusion counts include only accepted finite scores. Scored_points equals TP+FP+FN+TN, and scored plus unscorable equals the horizon. Quality rejection is evaluated separately from numerical detection. A missing event has null latency; a later false alert cannot create a successful detection. The known synthetic validity mask does not establish an independently learned quality detector.

The HGB predictor has recall 0.8399375, TASC 0.3419063 and no-topology 0.5190938. TASC's small improvement over aligned Huber 0.3362188 does not establish superiority. Projection can distribute an innovation among correlated sensors. The no-engine ablation reproduces aligned Huber by construction. Report coverage and common source-valid comparisons with false-alert rates.

Paired percentile intervals use 5000 resamples of complete test-seed blocks with random seed 414. Family, severity, channel and time dependence within a seed remain together. These intervals describe the authored synthetic experiment, not uncertainty about field performance. The full counts and every paired difference are committed in benchmark.json and benchmark-analysis.json.
