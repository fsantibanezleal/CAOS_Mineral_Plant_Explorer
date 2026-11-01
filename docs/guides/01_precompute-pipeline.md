# Reproduce the connected plant evidence

Install the exact requirements into an external environment. Set OMP_NUM_THREADS, OPENBLAS_NUM_THREADS and MKL_NUM_THREADS to 1 before Python starts; set PYTHONUTF8=1 on Windows. Provide external OREBRIDGE_CACHE_ROOT, OREBRIDGE_MODELS_ROOT and CAOS_TEMP_ROOT. Raw downloads, checkpoints and temporary outputs must not live in the repository.

Run `python data-pipeline/run.py sources --cache-root <external-cache>` to execute the four real packages and verify the ten exact public artifacts. The result remains tied to its original source case. Then run `python data-pipeline/run.py all --benchmark --models-root <external-model-root>` for the actual fit, calibration, twelve replay cases and full 768-scenario comparison. Preserve the checkpoint and its SHA-256 manifest together.

For a bounded regeneration, use `infer --no-train --models-root <external-model-root> --output <external-candidate>`. This produces graph, downstream references and case traces from the existing trusted checkpoint. `evaluate --benchmark` recomputes the full matrix; `export` finalizes index/readiness. Validate the candidate before copying its compact outputs into the release tree. The command never creates a fake trained result if the checkpoint is absent.

Keep train 100-107, forecast-calibration 200-203, state-calibration 300-307 and test 1000-1015 disjoint. Changing a model, source or result requires regenerating affected evidence, a declared schema version change where appropriate, executed lessons and updated manuscripts. CI validates committed artifacts; full training is local work.

## Additional fitted causal family

`train` fits HGB and native multioutput Ridge; each has its own checkpoint. For an existing trusted HGB root, `train-ridge --models-root <external models>` explicitly fits only Ridge. `extend --no-train --output <external candidate> --models-root <external models>` requires an existing published benchmark in the candidate, preserves its original eight-method bytes, and adds a paired HGB/Ridge comparison. It regenerates release manifests and validates all required model metadata. The extension uses already-known original test slots; it is not prospectively untouched test selection.
