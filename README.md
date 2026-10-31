# CAOS product template

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/CAOS_PRODUCT_TEMPLATE/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/CAOS_PRODUCT_TEMPLATE/actions)
[![License](https://img.shields.io/github/license/fsantibanezleal/CAOS_PRODUCT_TEMPLATE)](LICENSE)
[![Version](https://img.shields.io/github/v/tag/fsantibanezleal/CAOS_PRODUCT_TEMPLATE?label=version&sort=semver)](https://github.com/fsantibanezleal/CAOS_PRODUCT_TEMPLATE/tags)

The repository every CAOS product starts from (ADR-0057). It is a working product on the first day: an offline
pipeline that bakes cases and checks them, committed artifacts that a web workbench replays, a live engine that
re-runs a case in the browser, five documentation pages, and the guards and the measured gate that keep all of it
honest. The domain is a placeholder (the SIR epidemic model) so that every part has something real to carry.

A product is made from it with one command, and from then on the guards list what of the example remains until it
is replaced.

## Areas

The repository by area. Each row names its folder, says whether the area is active or dormant, and points to where the
area is documented. `scripts/check_readme_areas.py` fails a README without this section, an area without its row and a
link to a folder that does not exist.

| Area | Folder | Status | What it holds |
|---|---|---|---|
| Web | [`frontend/`](frontend/) | active | The workbench (with Focus mode for every case) and five documentation routes on the shared shell (`@fasl-work/caos-app-shell`), an executive view with flip cards, a card carousel and an animated illustration, and the live engine, a TypeScript port of the Python one (`frontend/src/engine/`). Build and test: `cd frontend && npm ci && npm run build && npm test`; the measured gate is `npm run gate` (`caos-shell-gate` with `--require-focus`: every route, tab and case, five sizes, both themes, both languages). Held by `frontend/src/engine/sir.parity.test.ts`, `scripts/check_web_baseline.py` and `scripts/check_svg_animation.py`. |
| API | [`app/`](app/) | dormant: this solution does not require it at the moment | The API ships dormant (GET only, 503 with a declared state when a document is absent) and is run only by its contract tests (`tests/contracts/test_api.py`). Activation: [guide 04](docs/guides/04_run-the-api.md). |
| Core pipelines | [`data-pipeline/`](data-pipeline/) | active | The pipeline: named stages, seeded, each case checked against its expected ranges; the SIR engine in `data-pipeline/pipeline/model/sir.py`. Bake: `./scripts/precompute.sh` (a release operation, never CI). Tests run in a sandbox that fails if a test writes a committed artifact. See [data-pipeline/README.md](data-pipeline/README.md). |
| Packages | (PyPI) [numpy 2.4.6](https://pypi.org/project/numpy/2.4.6/), [source](https://github.com/numpy/numpy) | active: the example publishes no package and consumes numpy | The engine is numpy only, so the template installs with no native build; a product publishes the packages of its methods as separate PyPI projects and lists each here with its version and its PyPI and repository links (no internal packages). |
| Notebooks | [`notebooks/`](notebooks/) | active | The didactic layer: notebooks in English and Spanish, by topic and from simple to complex, on the example's own data (`notebooks/en/`, `notebooks/es/`). Run: `./scripts/setup.sh --notebooks`, then `python scripts/run_notebooks.py`; held by `scripts/check_notebooks.py` and `scripts/run_notebooks.py --check`. Guide: [guide 08](docs/guides/08_notebooks.md). |
| Data | [`data/`](data/) | active | The committed derived artifacts (index, manifests and traces, bilingual, versioned, contract 2) and the readiness document (`data/derived/readiness.json`: what is real in this build, shown on every view). The data is synthetic (the model's own cases), so no third-party dataset licence applies. Held by `scripts/check_artifacts.py`, `scripts/check_readiness.py` and `frontend/src/lib/contract.test.ts` (both directions, types generated from the schemas). |
| Contracts | [`docs/contracts/`](docs/contracts/) | active | The contract catalog: every boundary and the model slot, one schema file each, a provider and a swap test (ADR-0080); contract 1, ingestion (bad values rejected with a reason, unusual ones flagged: `data-pipeline/pipeline/io/contract.py`). Held by `scripts/check_contracts.py`, `scripts/check_skeleton.py` and `tests/contracts/`. |
| Documentation | [`docs/`](docs/) | active | The design, every requirement with the gate that fails it ([`docs/design/SDD.md`](docs/design/SDD.md), `scripts/check_sdd.py`), the [guides](docs/guides.md), the case pages and the framework cards. |
| Tests and gates | [`tests/`](tests/), [`scripts/`](scripts/) | active | The pipeline, contract, guard and adversarial tests (`python -m pytest`) and the checks CI runs (`scripts/check_*.py`, each also run locally). One version, one deploy place, no example left behind: `scripts/check_version_coherence.py`, `scripts/check_deploy_place.py`, `scripts/check_template_residue.py`. See [scripts/README.md](scripts/README.md). |
| Deploy | [`deploy/`](deploy/) | active: one deploy place, named in `deploy/TARGET` | Where the product is deployed and how, never credentials (GitHub Pages by default, see [deploy/pages.md](deploy/pages.md)). |

## Run it

```bash
./scripts/setup.sh                       # .venv-pipeline with the pinned pipeline requirements (setup.ps1 on Windows)
./scripts/precompute.sh                  # the canonical bake into data/derived (a release operation, never CI)
.venv-pipeline/bin/python -m pytest      # the pipeline tests, sandboxed (.venv-pipeline/Scripts/python.exe on Windows)
./scripts/setup.sh --notebooks           # .venv-notebooks from notebooks/requirements.txt (setup.ps1 -Notebooks on Windows)
python scripts/run_notebooks.py --check --tmp <temp root>  # every notebook runs top to bottom in copies under the temp root (or CAOS_TEMP_ROOT); a local release gate, never CI
cd frontend
npm ci
npm run build                            # copies the declared artifacts, type-checks, bundles, materialises the routes
npm test                                 # contract both ways, engine parity, the artifact layer
npm run preview                          # serves dist/ the way GitHub Pages does
npm run gate                             # the measured gate on the build
```

## Make a product from it

Create the product repository from this template on GitHub, clone it, and run:

```bash
python scripts/instantiate.py --slug <slug> --name "<Name>" --repo <Repository> \
  --deploy pages --domain <slug>.fasl-work.com --visibility public \
  --tagline-en "<one line>" --tagline-es "<una línea>"
```

It writes the product's identity, licence, version and deploy place, removes the template's sentinel and blueprint
files, bakes, tests and builds once, and prints what of the example remains. The full procedure, and what the
product replaces next, is [docs/guides/00_instantiate.md](docs/guides/00_instantiate.md).

## The rules it carries

- Write the SDD before the code; every requirement names its gate (ADR-0075).
- The research is binding: every engine the research selected is pinned, documented in `docs/frameworks/` and run
  by the pipeline.
- Canonical science is offline. CI runs cheap checks; the bake and the pipeline tests run on a workstation; a deploy
  publishes the committed artifacts and never recomputes them (ADR-0069, ADR-0074).
- The web is built on the shared shell and measured before it ships; the base carries the rules, so a product does
  not re-implement them (ADR-0078). Three rules of use come with shell 0.14.0, each in
  [guide 06](docs/guides/06_executive-brief.md): the executive view's small cards flip (a title on the face, the content
  on the back, 8 words and 40 at most in English), a group of five or more becomes a carousel, and an illustration that
  explains a change, a flow or a sequence is animated, with a `prefers-reduced-motion` block that shows its final frame.
  The App opens Focus mode for every case, and the gate runs with `--require-focus`, so a product built from the
  template cannot ship an App without it.
- English in the repository; every reader-facing string in English and Spanish (ADR-0011, ADR-0066).

Licensed under the MIT License (see [LICENSE](LICENSE)).
