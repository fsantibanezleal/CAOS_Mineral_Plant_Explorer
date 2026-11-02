# OreBridge

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/OreBridge/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/OreBridge/actions) · [MIT](LICENSE) · [Public app](https://orebridge.fasl-work.com)

One mine-to-plant workspace with a global overview and dedicated views for each process area. Switch independently among 2D site plans, process schematics and 3D spatial views. Selecting an area on the global overview opens its detailed process schematic; an explicit area-overview route remains available for its assets, boundary flows, water contributions and linked CAOS evidence. The initial data is paused synthetic replay.

*Una operación minera y planta de procesos con vista general y vistas dedicadas por área. Cambie entre planos 2D, esquemas de proceso y vistas espaciales 3D. Al abrir un área verá sus equipos, flujos de límite, aportes de agua y evidencia CAOS relacionada. Los datos iniciales son una reproducción sintética en pausa.*

The authored copper complex contains 36 assets and 47 streams. Sixteen benchmark channels describe a bounded solids/water network; equipment without a channel remains reference context. The engine layer consumes four actual released Python packages and ten immutable public CAOS artifacts. Original cases retain their identity, units, hashes and limitations.

## Process areas

Extraction, crushing and stockpiling, grinding/classification, flotation, leaching/SX-EW, thickening/filtration, tailings, utilities and water balance are separately navigable. Water-bearing slurry and solution streams are included through the `water_m3_h` contribution field; balance closure is not reported without complete site boundaries.

## Areas

| Area | Folder | Status | What it holds |
|---|---|---|---|
| Web | [frontend/](frontend/) | active | Global and area-level overview, 2D site plans, area process schematics, focused 3D scene, trends and linked engine evidence. |
| API | [app/](app/) | active | Optional authenticated read-only OPC UA gateway and local artifact API; the static public site hosts no gateway. |
| Core pipelines | [data-pipeline/](data-pipeline/) | active | Source execution, causal scenarios, fitted predictor, comparison and typed replay exports. |
| Packages | [minehaulsim](https://pypi.org/project/minehaulsim/), [bedblend](https://pypi.org/project/bedblend/), [milldem](https://pypi.org/project/milldem/), [oreblocks](https://pypi.org/project/oreblocks/) | active | Consumes [minehaulsim 0.12.1](https://pypi.org/project/minehaulsim/0.12.1/), [bedblend 0.7.3](https://pypi.org/project/bedblend/0.7.3/), [milldem 0.3.1](https://pypi.org/project/milldem/0.3.1/) and [oreblocks 0.6.6](https://pypi.org/project/oreblocks/0.6.6/). No OreBridge PyPI package is claimed. |
| Notebooks | [notebooks/](notebooks/) | active | Four executed bilingual lesson pairs, eight EN/ES files and four progressive levels, importing the actual implementations. |
| Data | [data/](data/) | active | Compact authored synthetic replay, measured comparisons and exact upstream evidence with license classes. |
| Contracts | [docs/contracts/](docs/contracts/) | active | Fifteen versioned boundaries, JSON schemas, OpenAPI, examples and an independent fixture provider. |
| Documentation | [docs/](docs/) | active | Design, primary research, methods, assumptions, case matrix and applied guides. |
| Tests and gates | [tests/](tests/), [scripts/](scripts/) | active | Numerical oracles, source/contract checks, adversarial interactions, full browser matrix and notebook execution. |
| Deploy | [deploy/](deploy/) | active | Single public Pages target and served-commit verification; site commissioning is separate. |

## Run and reproduce

Create the pinned environments with `scripts/setup.ps1` (Windows) or `scripts/setup.sh`. Keep numerical environments, raw source cache, joblib checkpoint and temporary output outside the repository; a local junction may expose an environment at `.venv-pipeline` or `.venv-notebooks`.

The existing `OREBRIDGE_MODELS_ROOT` and `OREBRIDGE_CACHE_ROOT` variables remain compatible while the public product and repository use the new name. Bound `OMP_NUM_THREADS`, `OPENBLAS_NUM_THREADS` and `MKL_NUM_THREADS` to `1` before starting Python. On Windows set `PYTHONUTF8=1`.

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

Read the [technical report](https://doi.org/10.5281/zenodo.23851639) and [controlled-study preprint](https://doi.org/10.5281/zenodo.23851369). Their [sources](manuscripts/README.md) are reproducible; software releases carry the fitted checkpoint separately.

Two causal model families are actually fitted: histogram gradient boosting and Ridge. Their [registry](models/registry.json) names separate checkpoints and exact evaluations. The additional paired comparison contains 768 new Ridge evaluations and 768 reused HGB rows on the original known test slots. Ridge improves recall while increasing false alerts and reducing precision; this is a post-publication extension, without a claim of prospective or field validation.
