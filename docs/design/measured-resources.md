# Measured reference resources

Measured 2026-10-31 on the development workstation with Python 3.12.10, NumPy 2.2.6, SciPy 1.18.1, scikit-learn 1.9.1 and Node 24.14.1. Numerical thread variables were set to 1. These measurements describe the recorded build, not industrial operating latency or arbitrary larger sites.

| Quantity | Measured result | Scope |
|---|---|---|
| Public JSON artifacts | 32 files; 6,762,352 content bytes | Canonical data/derived, excluding duplicated fixture provider |
| Full held-out comparison | 80.313s; 6144 cells | Existing fitted checkpoint, 768 paired scenarios |
| Causal model | 1568 training rows, 784 forecast-calibration rows; 64 lag features | Four earlier 16-channel observations; actual HGB fit |
| Reference geometry | 36 assets, 47 streams; about 36,786 triangles in the initial view | Authored procedural scene; browser overlay reports actual current draw |
| Settling resolution | 640 default cells; 0.7562% endpoint discrepancy from 2000 | Default-input outlet fraction only; conservation residual separately checked |

The task's independent review re-executed all four released package configurations, verified all ten exact artifacts, checked 48 robust objectives against independent optimization and reconciled 6144 aggregate cells. The corrected snapshot check examined 245,760 channel values and their evidence-time indices.

Frontend build and complete browser/notebook results are recorded for their exact milestone separately. A compressed JavaScript size is a transfer measurement, not a frame-time guarantee. The scene renders on demand while paused and animates only during explicit replay. No large-plant scaling or site commissioning result is claimed.
