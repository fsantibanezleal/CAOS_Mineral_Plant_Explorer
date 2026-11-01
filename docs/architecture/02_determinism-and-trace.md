# Determinism and evidence time

A trace contains observed, valid, truth and fault arrays, calibrated scores, a separate TASC estimate and exact per-method/channel evidence_lag_s. All arrays have 160 rows and 16 channels. The first 14 numerical rows are unavailable. Manifests record exact bytes and SHA-256; elapsed performance measurements stay out of deterministic trace content.

For an aligned method, channel j at availability t describes raw evidence at t-(14-delay_j). The UI resolves that earlier raw value and validity before assigning its score/color. The trend comparison uses aligned observation, truth and estimate on availability time. Unaligned methods retain zero evidence lag. A snapshot is causally available at t even when its channels describe earlier parcels.

The generator seeds a load process and sensor noise independently of inference. Training uses 100-107, forecast calibration 200-203, state calibration 300-307 and test 1000-1015. Noise scale is fixed 1 in the full matrix; four severities vary fault magnitude. Engine and delay families update current latent process truth when the physical relationship changes. No clean truth enters model features or the fixed reference prior.
