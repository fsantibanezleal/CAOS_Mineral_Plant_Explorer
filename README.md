# OreBridge

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/CAOS_OreBridge/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/CAOS_OreBridge/actions) · [MIT](LICENSE) · [Public app](https://orebridge.fasl-work.com)

One connected mineral-processing plant: 3D equipment, directed diagrams, timestamped observations and traceable CAOS engine evidence. Selection, source quality and evidence time remain synchronized across views. The initial scene is paused synthetic replay.

*Una planta conectada: equipos 3D, diagramas dirigidos, observaciones con tiempo y evidencia trazable de motores CAOS. Selección, calidad y tiempos permanecen sincronizados. La escena inicial reproduce datos sintéticos y comienza en pausa.*

The authored copper complex contains 36 assets and 47 streams. Sixteen benchmark channels describe a bounded solids/water network; equipment without a channel remains reference context. The engine layer consumes four actual released Python packages and ten immutable public CAOS artifacts. Original cases retain their identity, units, hashes and limitations.

## Areas

| Area | Folder | Status | What it holds |
|---|---|---|---|
| Web | [frontend/](frontend/) | active | Connected Three.js scene, process diagram, trends, engine map, method comparison and five bilingual reference routes. |
| API | [app/](app/) | active | Optional authenticated read-only OPC UA gateway and local artifact API; the static public site hosts no gateway. |
| Core pipelines | [data-pipeline/](data-pipeline/) | active | Source execution, causal scenarios, fitted predictor, comparison and typed replay exports. |
| Packages | [minehaulsim](https://pypi.org/project/minehaulsim/), [bedblend](https://pypi.org/project/bedblend/), [milldem](https://pypi.org/project/milldem/), [oreblocks](https://pypi.org/project/oreblocks/) | active | Consumes [minehaulsim 0.12.1](https://pypi.org/project/minehaulsim/0.12.1/), [bedblend 0.7.3](https://pypi.org/project/bedblend/0.7.3/), [milldem 0.3.1](https://pypi.org/project/milldem/0.3.1/) and [oreblocks 0.6.6](https://pypi.org/project/oreblocks/0.6.6/). No OreBridge PyPI package is claimed. |
| Notebooks | [notebooks/](notebooks/) | active | Four executed bilingual lesson pairs, eight EN/ES files and four progressive levels, importing the actual implementations. |
| Data | [data/](data/) | active | Compact authored synthetic replay, measured comparisons and exact upstream evidence with license classes. |
| Contracts | [docs/contracts/](docs/contracts/) | active | Thirteen versioned boundaries, JSON schemas, OpenAPI, examples and an independent fixture provider. |
| Documentation | [docs/](docs/) | active | Design, primary research, methods, assumptions, case matrix and applied guides. |
| Tests and gates | [tests/](tests/), [scripts/](scripts/) | active | Numerical oracles, source/contract checks, adversarial interactions, full browser matrix and notebook execution. |
| Deploy | [deploy/](deploy/) | active | Single public Pages target and served-commit verification; site commissioning is separate. |

## Run and reproduce

Create the pinned environments with `scripts/setup.ps1` (Windows) or `scripts/setup.sh`. Keep numerical environments, raw source cache, joblib checkpoint and temporary output outside the repository; a local junction may expose an environment at `.venv-pipeline` or `.venv-notebooks`.

Set `OREBRIDGE_MODELS_ROOT` to an external model directory and `OREBRIDGE_CACHE_ROOT` to an external source cache. Bound `OMP_NUM_THREADS`, `OPENBLAS_NUM_THREADS` and `MKL_NUM_THREADS` to `1` before starting Python. On Windows set `PYTHONUTF8=1`.

```bash
python data-pipeline/run.py sources --cache-root "$OREBRIDGE_CACHE_ROOT"
python data-pipeline/run.py all --benchmark --models-root "$OREBRIDGE_MODELS_ROOT"
python -m pytest
python scripts/run_notebooks.py
python scripts/run_notebooks.py --check --tmp "$CAOS_TEMP_ROOT"
cd frontend
npm ci
npm run build
npm test
npm run gate
```

`all` genuinely trains and evaluates. `infer --no-train` requires the existing trusted checkpoint; it never substitutes a pretend trained model. Source ingestion runs actual package APIs and verifies public artifact bytes. See [reproduction](docs/guides/01_precompute-pipeline.md), [site source](docs/guides/04_run-the-api.md), [geometry/data](docs/guides/02_bring-your-own-data.md) and [lessons](notebooks/README.md).

## Evidence and limits

The full experiment has 768 held-out scenarios and 6144 method/scenario cells, with fixed noise scale one. TASC recall is 0.3419063; the causal predictor reaches 0.8399375 and the no-topology ablation 0.5190938. The negative result is retained with coverage, false alerts and paired seed-block intervals. Its fixed ratio prior does not dynamically fuse all fourteen visual sources or estimate inventory derivatives.

No site historian, survey, instrument credentials or operator acceptance has been supplied. The graph is authored, engine references are separate cases, and process models are bounded teaching references. Connecting a source requires an explicit graph/tag/unit map and source/server freshness policy. Neither a coherent state nor a colored equipment model establishes a fault cause or facility safety.

Code and authored repository artifacts use MIT. Manuscripts identify their own CC BY 4.0 terms. Upstream rights remain attached to each exact source record.

Read the [technical report](https://doi.org/10.5281/zenodo.23851365) and [controlled-study preprint](https://doi.org/10.5281/zenodo.23851369). Their [sources](manuscripts/README.md) are reproducible; the [software release](https://github.com/fsantibanezleal/CAOS_OreBridge/releases/tag/v0.01.000) carries the fitted checkpoint separately.
