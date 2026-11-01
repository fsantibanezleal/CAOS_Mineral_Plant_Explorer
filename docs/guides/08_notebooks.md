# Progressive EN/ES lessons

The eight notebooks under notebooks/en/01-plant-state and notebooks/es/01-plant-state answer four progressive questions: distribute a flotation closure correction; separate transport/storage from bias; compare causal HGB and Huber on identical observations; and test TASC under ambiguity, missingness and unfavorable ablations.

Every lesson imports the actual canonical methods. There are no notebook definitions replacing reconciliation, prediction, physical models or paired analysis. Each language has complete prose, code comments, chart axes and printed explanations. Results contain executed numeric answers, including undefined ratios, false alerts and refusal coverage. Known truth is reserved for controlled evaluation.

Use the pinned notebook environment, set numerical thread variables to 1 before kernels start and provide an external CAOS_TEMP_ROOT. Run `python scripts/run_notebooks.py` to write accepted outputs. Then run `python scripts/run_notebooks.py --check --tmp <external-temp>`: the official runner copies scientific inputs, starts fresh kernels, writes nothing in the repository and refuses stale output bytes. `python scripts/check_notebooks.py` checks structure, method use, sources, mirror and instructional depth.

Authorship, independent lesson review and canonical execution are separate. The review checks numerical answers, source claims, translated prose/comments/axes/output and every chart. A lesson that executes without error can still teach the wrong physical interpretation, as the storage-sign correction demonstrates. The full local notebook run is not delegated to CI.
