Portable OreBridge scientific verification

Use the product's precompute environment (Python, NumPy, SciPy and scikit-learn).
After installing the script under research/verification, run from the checkout
root, for example:

  python research/verification/verify_science.py --repo . --output ../orebridge-verification.json

--repo is optional when the script resides below the checkout root. --output
is required, resolves through filesystem links, and must be outside that root.
The script does not train, load model checkpoints, download sources or write
within the repository. It writes no absolute local paths into its JSON output.

The JSON records the script and relevant source/data hashes, environment
versions, fixed scenario seed 1000, independent-oracle RNG seed 20261031,
explicit tolerances, all 48 comparison rows, and recomputed benchmark counts.
The Huber objective and derivative are implemented independently here. Equality
constraints are removed by a null-space parameterization before BFGS; no
production oracle or objective helper is called. The WLS reference uses a joint
KKT system rather than the production projection formula.

Acceptance uses objective agreement, equality feasibility and projected
stationarity. Optimizer success flags are separately preserved, since a solver
termination flag is not itself an independent mathematical check. In the fresh
staging run, 43 of 48 BFGS flags were successful; all 48 comparisons met the
declared objective/feasibility/stationarity tolerances. The largest absolute
objective gap was 2.639666263348772e-12 and the largest projected gradient was
1.496749160029287e-08. The WLS KKT check and all 6,144 aggregate, coverage and
latency consistency checks passed. Use the actual JSON for the complete values.

packaging-checks.json records additional successful checks: root inference,
required external output, refusal without an inside-repository write, current
matrix acceptance, and rejection of intentionally corrupted coverage, missed
event latency, aggregate counts, boolean ratios and duplicate protocol axes.

These are bounded numerical/software checks of an authored synthetic reference
experiment. They do not reproduce every benchmark inference, validate a real
plant, independently discover synthetic quality faults, or support superiority
or global novelty claims. Review the script, execute it in the destination
checkout with an external output, then cite only the resulting actual output.
