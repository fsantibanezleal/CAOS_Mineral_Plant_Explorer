# Scientific articles

Both articles are by Felipe Santibáñez-Leal, ORCID 0000-0002-0150-3246. They are public, not peer reviewed, and licensed CC BY 4.0. Each Zenodo record contains its one scientific PDF. Source, compact data and executable lessons remain in this software repository.

| Article | Version DOI | Concept DOI | Source |
|---|---|---|---|
| Connected plant visualization with timestamped observations and versioned process-engine evidence | [0.01.000](https://doi.org/10.5281/zenodo.23851365) | [Latest](https://doi.org/10.5281/zenodo.23851364) | [Report](technical-report/main.tex) |
| Transport-aligned robust reconciliation can degrade discrepancy localization: a controlled plant-network study | [1.0](https://doi.org/10.5281/zenodo.23851369) | [Latest](https://doi.org/10.5281/zenodo.23851368) | [Preprint](transport-coherence/main.tex) |

The report describes the connected geometry, source boundary, actual engine consumers and bounded physical/numerical models. The preprint studies a negative localization result under a fixed synthetic process. Neither establishes operating-plant efficacy.

Rebuild figures with `python manuscripts/shared/build_figures.py` in the pinned numerical environment, then run `pdflatex -interaction=nonstopmode -halt-on-error main.tex` twice in each article directory. Figures and tables read the actual exported artifacts. Build PDFs and auxiliary files are local outputs.

The separate [software release](https://github.com/fsantibanezleal/CAOS_OreBridge/releases/tag/v0.01.000) supplies the trusted fitted checkpoint, its state-model metadata and SHA-256 list. Serialized models require the declared environment and trusted provenance. The [independent verifier](../research/verification/README.txt) does not load checkpoints or retrain.
