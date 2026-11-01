# Trained causal model registry

[registry.json](registry.json) names two distinct fitted families and their actual manifests, checkpoints and evaluations. Native multioutput Ridge fits linear coefficients; HGB fits sixteen separate nonlinear tree regressors. Both use four earlier16-channel vectors and training-only scales, but no target coupling is inferred from sharing features.

The HGB checkpoint and original eight-method study are preserved. The additional paired artifact reuses768HGB rows and adds768Ridge evaluations on already known original test seeds; it is a post-publication extension. Each checkpoint's SHA-256, actual parameters, environment and disjoint fit/calibration groups accompany its public manifest. Missing manifest/evaluation files, unknown checkpoints and missing/duplicate comparison cells fail validation.

Checkpoints stay in the external model root and are distributed separately in the [software release](https://github.com/fsantibanezleal/CAOS_OreBridge/releases). Never load an untrusted pickle or joblib file. `train` fits both families; `train-ridge` explicitly fits only the additional family. `extend --no-train` preserves an existing published comparison while adding the paired model evidence and refreshing current release metadata.
