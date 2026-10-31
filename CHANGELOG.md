# Changelog

All notable changes to this template. Versions are X.XX.XXX; VERSION is the single source; every release is tagged.

## [0.14.001], 2026-10-31

### Fixed

- `check_deploy_place.py` reads the single `target:` field of a product's structured deployment record and validates a composed static-site plus bounded-service VPS deployment. The original `pages` and `vps` sentinels remain supported. The guard now requires both a systemd unit and an nginx site file for VPS deployments and rejects mixed Pages/VPS files.
- Added adversarial coverage for plain targets, the Neuraxis-style composite target, malformed declarations, missing VPS components and mixed deployment files.

## [0.14.000], 2026-10-30

### Added

- **The tier names never reach a reader** (CAOS_MANAGE `conventions/method-tiers-and-manuscripts.md` section 0; Felipe, 2026-10-30: "that terms can never reach the manuscripts or the app titles or sections"). "Classical", "state of the art", "beyond the state of the art", SOTA, the claim ids `BS-<n>` and their Spanish forms sort the methods in the SDD, the plans and the gates; a reader sees each method by its name. The new `scripts/check_internal_names.py` (wired into CI) fails a product that uses them in a notebook (its file or folder name, its `caos.title`, its markdown outside References, the comments and text strings of its code, its text outputs), a notebook index, a manuscript source (its file or folder name, `.tex`, `.md`, `.txt` outside the bibliography, `.svg` text, `.py` figure strings), a `product.json` manuscript title, the README or an app string (`content/**/*.json` values, `frontend/src` strings and JSX text); in a title or a heading the bare words "classical", "clásico" and "tier" fail too. A cited title in References or the bibliography, a lowercase key string, a fenced block, app code comments and tests, the SDD and `docs/`, and a line marked `internal-name-ok` pass (MT-010, MT-011).

### Changed

- **The notebook anatomy**: the sections of levels 3 and 4 are `Comparison` (`Comparación`) and `Evidence` (`Evidencia`), formerly "State of the art" and "Beyond the state of the art"; the levels read "comparison with published methods" and "proposed methods" in the indexes, the guides and the requirements (NB-059, NB-060). The SDD keeps its internal section `## Beyond the state of the art`.
- The example: the level 3 notebooks name SciPy's RK45 and the published solvers instead of the tier, the indexes carry the new level names and a `Proposed methods` section, the Methodology page names the Kermack-McKendrick model and the analytic baseline; guide 08 and guide 09 (the Methodology page presents each method by its name, a new section on the internal names); the example fingerprints of `scripts/notebook_bar.json` are rewritten from the edited notebooks.

### For products

- A product that adopts 0.14.000 fails `scripts/check_notebooks.py` until its level 3 and 4 notebooks rename the sections `State of the art` and `Beyond the state of the art` (`Estado del arte`, `Más allá del estado del arte`) to `Comparison` and `Evidence` (`Comparación`, `Evidencia`), and fails `scripts/check_internal_names.py` until its notebooks (their file names too, renamed in both trees and in the index), indexes, manuscripts, manuscript titles, README and app strings name each method instead of its tier. Take `scripts/check_internal_names.py` verbatim and add its CI step. A use whose words mean something else (a quantum product's "classical simulation") carries `internal-name-ok` on its line.

## [0.13.001], 2026-10-28

### Fixed

- The planted-defect tests of the model-file rule declare their file under `models/planted/`: planted as `models/*.onnx`, the glob also matched a product's own released model, two catalog rows claimed it and `test_a_declared_onnx_file_passes_when_its_row_names_a_test` failed in CEFOP_DinHot (BD-3).

- **The notebook runner copies `models/`** (base defect BD-2, found by CEFOP_DinHot's notebook unit U12c): `scripts/run_notebooks.py` copied only `data`, `data-pipeline`, `docs`, `content` and `notebooks` into its work tree, so a level 3 notebook that loads a product's released model (`models/<slot>.onnx`, a catalog `documents` file) failed under `--check` while it ran in place. The work tree now holds `models/` when the repository has one; an absent folder is skipped as before (NB-091).

## [0.13.000], 2026-10-28

### Added

- **The three method tiers, none optional** (CAOS_MANAGE `conventions/method-tiers-and-manuscripts.md`, Felipe 2026-10-28): every product implements the classical methods, the state of the art and its own proposals beyond it. The SDD's `## Method ladder` is now a table `| id | tier | method | acceptance criterion | gate |` whose tier is `classical`, `sota` or `beyond`, and `scripts/check_sdd.py` fails a product (a tree without `.template-source`) that has no method in a tier, no section `## Beyond the state of the art`, says `None claimed.` there, lists no `BS-<n>`, has a claim without its `beyond` row or a `beyond` row without its claim. A ladder without the tier column (or in prose) fails with the column to add and the rule file, for the template too. The template keeps `None claimed.` and a ladder of two tiers as its teaching example.
- `scripts/check_notebooks.py` holds the tiers in the notebooks: every `sota` method of the ladder is named in `caos.methods` by a level 3 notebook in each language, a level 3 notebook names at least one, a name that is no `sota` row or a `methods` on another level is a finding, and the two languages carry the same list. The field is new and optional below level 3; the existing `BS-` coverage by level 4 notebooks stays. The example's level 3 notebook names `M-2` (RK45 and DOP853).
- **The manuscripts on Zenodo, none optional**: `product.json` declares `manuscripts`, a list of `{kind, concept_doi, title, version, covers}` (`kind` is `technical-report` or `manuscript`, `concept_doi` is `10.5281/zenodo.<N>`, `covers` the `BS-<n>` claims). The new `scripts/check_manuscripts.py` (wired into CI) fails a product with no technical report, a malformed entry, a repeated concept DOI, a claim the SDD does not list or a report version ahead of `VERSION`; `--release` requires the report at the release's version and `--zenodo` reads the records online (opt-in, never CI). `instantiate.py` writes `"manuscripts": []`. The template declares none.
- Guide 09 (`docs/guides/09_method-tiers.md`), the feature `docs/design/features/method-tiers/` (MT-001 to MT-009, each with its adversarial validation) and the release step in guide 00: a release that changes a method, a data source or a result publishes the new version of the technical report on Zenodo first or with it.

### Changed

- The SDD's method ladder and beyond sections of the example are rewritten to the tiers (M-1 classical, M-2 sota); `tests/test_spec_guards.py` builds its product SDD with a ladder of three tiers and a claim; the adversarial fixtures copy `.template-source` with the SDD inputs.

### For products

- A product that adopts 0.13.000 fails `scripts/check_sdd.py` until its ladder has the `tier` column, a method in each tier and at least one `BS-<n>` with its `beyond` row; fails `scripts/check_notebooks.py` until its level 3 notebooks name their `sota` methods in `caos.methods`; and fails `scripts/check_manuscripts.py` until `product.json` declares its technical report on Zenodo. Take `scripts/check_manuscripts.py` verbatim, add the CI step of `.github/workflows/ci.yml`, and write the report before the release.

## [0.12.000], 2026-10-27

### Added

- **The measured floors of the notebook bar** (NB-048 to NB-068; CAOS_MANAGE `conventions/product-notebooks.md` section 1). `scripts/check_notebooks.py` fails a notebook below the floors, statically, on the committed cells and outputs, each finding naming the notebook, the measure, the value and the floor: method cells (calls into the product's method packages, its pipeline modules or, at level 3, a pinned reference implementation; never numpy, pandas, plotting, the standard library or a helper the notebook defines), figures, 40 words of prose after each figure, explanatory prose words, setup cells, reproduction checks, long sentences shared with another notebook of the tree, generic filler sentences, two statements on a line, lines over 120 characters, cells over 30 lines of logic, the question in the first cell, an answer in Results that quotes a number from an output, a method cell and a figure under State of the art at level 3, and a figure or table under Beyond the state of the art at level 4. The thresholds, the tooling modules and the filler sentences are in the new `scripts/notebook_bar.json`.
- **The gate review's fixes** (NB-069 to NB-078): import names are static (`product.json` `import_names`, the map of `notebook_bar.json`), never read from the environment; a reader, a loader, a version print, a dunder chain and the pipeline's `io`, `schema` and `config` calls are no method cells, while an object built from a method class and its calls are; the answer must agree with an output number outside Setup at the precision it is written (percent, thousands separators, decimal comma, exponent), never a version, a date or a year; prose without HTML comments, indented code, tables or repeated sentences; read-and-print cells are input/output cells; more forms of reproduction check and fewer false positives; no two notebooks share a question; a level 3 notebook needs 2 method cells of the product's own; the template's example sentences are fingerprinted so a copy is found in a product; `data-pipeline/src/` counts as pipeline; figures are counted once by content and include JPEG and plotly; a compound statement with its body on its line is a finding.
- **The re-review's fixes** (NB-079 to NB-084): `product.json` declares `method_entrypoints` (dotted names) and a method cell is a call of one of them or of a method of an object built from one (a chained constructor, a factory result, a table of objects), so a lookup, a loader or a registry call earns nothing; a product that declares none fails with one finding (`instantiate.py` writes an empty list, which is the same finding); the template declares `simulate`, `derivatives`, `final_size` and `peak_frac`. Optional `artifact_loaders` name the loaders of committed results; residuals against measured data are no reproduction check. Sentences of five words or more count once in the prose words and their repeats are a finding; an unconsumed generator, a head of read data, a `tqdm` and an input check no longer miscount; the answer matches by magnitude. The level 3 environment test no longer needs `.venv-notebooks`.
- **The second re-review's fixes** (NB-085 to NB-087): every repeated sentence counts once in the prose words whatever its length and a sentence that occurs more than twice is a finding; an object whose methods count is built only from a declared class, never from the return value of a function, and the methods of lists, dicts and strings never count; an alias made by assignment is followed, a re-export of a declared name is resolved from the package's `__init__.py` or from `reexports` of `notebook_bar.json`, a comprehension over an empty literal does not run, and a rebound name loses its alias.
- **The third re-review's fixes** (NB-088 to NB-090): headings and labels or sentences of fewer than four words may be repeated (they still count once in the prose words); `product.json` may declare `method_factories` (functions whose return value is a method object); a method of an attribute of an object (`m.curve.mean(...)`) is no method call.
- `scripts/check_notebooks.py` separates `form_findings` (layout, mirror, anatomy, metadata, clean) from `bar_findings`; `findings_of` runs both.
- A pinned reference implementation: `scipy==1.18.1` in `notebooks/requirements.txt` and in the SDD technology table, with the Dormand and Prince and the SciPy sources in the SDD research basis, for the level 3 example.

### Changed

- `data-pipeline/pipeline/model/sir.py` exposes the SIR equations as the public function `derivatives(t, y, beta, gamma, n)`, which `simulate` takes its Forward Euler steps from (every baked artifact is bit-identical); the level 3 notebook hands it to `solve_ivp` instead of defining the equations itself.
- **The example notebooks are rewritten to the bar**, in both languages: five worked lessons, each on one question of the SIR example, that run the engine, the oracle and the baseline step by step and read their figures in prose, instead of reading baked results and checking the engine against itself. Topic `01-getting-started` is one epidemic day by day, how wrong the engine's Forward Euler step is, and how SciPy's RK45 compares with it (level 3, replacing the next-generation-matrix notebook, which moved out of the set); topic `02-threshold-and-final-size` is when an outbreak takes off and how large it gets. The Spanish tree says "notebook", never "cuaderno".
- The SDD technology table gains the scipy row and the research basis gains two sources.

### For products

- A product that adopts 0.12.000 fails `scripts/check_notebooks.py` until each of its notebooks meets the bar (a worked lesson on one question that runs the method and reads its figures); see the convention, section 1, and guide 08. A product that copied the example notebooks is also flagged by `scripts/check_template_residue.py`, which finds them by content.

## [0.11.005], 2026-10-27

### Fixed

- BD-4, found adopting 0.11.004 on CAOS_ChancaDEM: the static guard of BD-3 named a product's own test as example-bound
  because it matched the bare topic `01-getting-started` and the folder `features/workbench`, names a product reuses for its
  own first topic and its own workbench feature. It now matches the example's notebook paths and no generic folder; its
  adversarial twin gains a product control that names both and is not flagged.
- BD-4: the test of `scripts/check_artifacts.py` moves from `tests/test_guards.py`, which a product takes as it is, to its own
  module `tests/test_check_artifacts.py`. The artifact guard is the example's, shaped by its manifest contract; a product adapts
  it and replaces that test with its own, as it does the example's other tests.

## [0.11.004], 2026-10-27

### Fixed

- BD-3: the base guards' tests that plant into or read the template's example (its notebooks, requirement rows, catalog rows, case ids, executive view, the instantiate guide) move to `tests/template/` (`adversarial/`, `contracts/` and the example notebooks' text checks), which `scripts/instantiate.py` removes and prints; a product no longer inherits tests that fail once it replaces the example. The guards a product takes verbatim stay tested in the template. 102 failures on CAOS_ChancaDEM's full run (2026-10-27) were of this kind or knock-on of one product row.
- BD-3: `tests/test_guards.py` gains a static guard (`test_no_example_bound_test_of_a_base_guard_is_left_outside_tests_template`, requirement EX-014) and its adversarial twin: a test module outside `tests/template/` that exercises a base guard and holds example residue (the residue guard's own patterns, plus the example's requirement ids, notebook topics, feature folder, guide and catalog row) fails and is named. Requirement EX-015 and its validation row assert that instantiate removes `tests/template/`.
- BD-3: the shared helpers exist once: fixtures in `tests/adversarial/adversarial_fixtures.py` (both conftest files import them), the node_modules link helpers and the SDD helpers in `tests/adversarial/planting.py` (the `needs_web` and `TEMPLATE_ONLY` marks stay in each module, where the SDD guard reads them), `edit` and the readiness guard runner in `tests/contracts/contract_schemas.py`. The synthetic notebook and research fixtures of `tests/test_check_notebooks.py` and `tests/test_spec_guards.py` cite neutral authors instead of the example's references.
- BD-3: validation gates that name a moved planted-defect test carry the `test_adversarial_` prefix (the SDD guard recognizes an adversarial test by that name or by the `tests/adversarial/` path). The template's CI runs the moved plants beside the others (`python -m pytest tests/adversarial tests/template/adversarial -q`, the one extra form the CI-budget guard allows); `scripts/instantiate.py` drops that path from the product's workflow with the folder, so a product's CI names no missing path. Guide `docs/guides/00_instantiate.md` states the split.
- BD-3: `scripts/instantiate.py` also drops, from every feature folder, the requirement and validation rows whose gate is a test under `tests/template/` (and a feature left with no requirement), so a fresh product's SDD guard passes from the first run; the product writes the rows of its own features.

## [0.11.003], 2026-10-26

### Fixed

- Two tests that need the template's own tree failed in every instantiated product: the instantiate test of the README areas guard (`instantiate.py` refuses a tree without `.template-source`) and the residue test that removes the sentinel from its copy. Both carry `TEMPLATE_ONLY` now (BD-1, found on CAOS_ChancaDEM's re-instantiation). A guard test names any test that runs `instantiate.py` or removes the sentinel without the marker, and EX-013 gains an adversarial gate that plants example residue in a throwaway tree, so it runs in every repository.

## [0.11.002], 2026-10-24

### Fixed

- Keep `check_content_standards.py` findings readable when its output is captured through a Windows ANSI-code-page pipe; diagnostics are emitted as UTF-8 and a planted emoji verifies the failure location survives.

## [0.11.001], 2026-10-24

### Changed

- Adopt the latest published shared shell, `@fasl-work/caos-app-shell` 0.19.1, exactly. The example's plots now satisfy its chart interaction contract with named, keyboard-operable views, accessible summaries and data tables; the shell gate measures chart navigation, zoom, reset and data access. The product keeps using the shell's layout and chart styles instead of copying their behavior into template CSS. The shell also fixes narrow-screen flowing plot content, equation overflow cues and localized chart dates.
- Lazy-load the App and documentation routes, then split React and KaTeX into shared runtime chunks; the main JS entry falls from 916 KB to 205 KB and every emitted chunk stays below 500 KB.
- Pin Vite 8.3.5, which includes fixes for the Windows command-execution advisories in 8.3.2; the dependency audit now reports no high-severity issue.

## [0.11.000], 2026-10-21

### Added

- **The notebook runner's temp root** (NB-041, NB-042). `scripts/run_notebooks.py --check` writes its copies to a fresh folder under
  the temp root the caller names, `--tmp DIR` or the environment variable `CAOS_TEMP_ROOT`, and removes it after the run. Without a temp
  root it stops with exit 2; it no longer falls back to the system temp folder, and it leaves no bytecode cache in the repository.
- **The re-implementation guard covers the product's method packages** (NB-043 to NB-046). The optional `product.json` key
  `method_packages` (a list of PyPI distribution names, `[]` in the template) declares them. `scripts/check_notebooks.py` reads the public
  top-level functions and classes of each installed package with `ast`, never by importing it, and fails a notebook cell that defines
  one of them, naming the notebook, the cell, the name and the package. A package without an exact `name==version` line in
  `notebooks/requirements.txt` is a finding; a package not installed where the static check runs is an info line (CI stays light), and
  `scripts/run_notebooks.py` fails before any notebook executes. An exact pin may now carry extras (`name[extra]==version`).
- **The PyPI pin check** (NB-047). `python scripts/check_notebooks.py --pypi` (opt-in, never in CI, ADR-0074) reads
  `https://pypi.org/pypi/<name>/<version>/json` for the pin of each method package and fails on anything but HTTP 200, so a Setup cell never
  tells a reader to install a version that is not published.

## [0.10.000], 2026-10-20

### Added

- **Product notebooks** (feature rows NB-001 to NB-027). `notebooks/` holds an English and a Spanish tree at identical paths
  (`notebooks/<language>/<topic>/<notebook>.ipynb`), by topic and by level: 1 fundamentals, 2 the method in practice, 3 the state
  of the art, 4 beyond it. `notebooks/requirements.txt` carries exact pins. The example set teaches the SIR model on its own data:
  five notebooks per language, levels 1 to 3, executed and committed. Their final-size solver is the pipeline oracle
  `data-pipeline/pipeline/oracles.py`, imported by the notebooks, never copied into them.
- **The notebook check** `scripts/check_notebooks.py` (static, in CI) holds:
  - the layout, the mirror, the numbering, the levels and the SDD `BS-` claims;
  - the anatomy, the metadata, the cleanliness and the size limits;
  - the pins and the sources listed in the SDD;
  - no copy of the engine, and the CI wiring.

  A notebook never runs pip and holds no machine path (any drive form, `/opt/`, `/tmp/`, `/root/`, `/var/`, `/srv/`) and no
  traceback. A notebook that imports packages prints their versions (`importlib.metadata`). A package not yet on PyPI is
  installed from its release tag (`name @ git+https://github.com/<owner>/<repo>.git@<tag>`), and the README's Packages row may link
  that tag.
- **The notebook runner** `scripts/run_notebooks.py` (a local release gate, never CI, ADR-0074):
  - it executes each notebook in a fresh kernel in `.venv-notebooks`;
  - it strips volatile metadata and coalesces the output streams, so a second run writes the same bytes;
  - `--check` runs copies and writes nothing, failing on an error or on committed outputs that differ from a fresh run;
  - `--only` runs one notebook.

  `scripts/setup.sh --notebooks` and `scripts/setup.ps1 -Notebooks` build the notebook environment.
- **The README by areas** (feature rows RP-001 to RP-007). The `## Areas` section replaces "What is in it" and states the
  repository by areas (web, API, core pipelines, packages, notebooks, data, contracts, docs, tests, deploy).
  `scripts/check_readme_areas.py` (in CI) holds it, and `scripts/instantiate.py` writes the same section for a product.
- The SDD gains the section `## Beyond the state of the art` ("None claimed." in the example) and the technology rows of the
  notebook pins (matplotlib 3.11.2, nbclient 0.11.0, nbformat 5.11.1, ipykernel 7.4.0). Guide `docs/guides/08_notebooks.md`
  describes the layer.

### Changed

- `scripts/check_content_standards.py` scans the notebooks, `scripts/check_template_residue.py` scans `.ipynb` (so a product
  lists the example notebooks as residue), and `scripts/check_tech_matrix.py` reads `notebooks/requirements.txt`.

### Migration

A product instantiated from an earlier release:

1. takes `scripts/check_notebooks.py`, `scripts/run_notebooks.py`, `scripts/check_readme_areas.py`,
   `scripts/check_content_standards.py`, `scripts/check_template_residue.py` and `scripts/check_tech_matrix.py` verbatim, with the
   setup scripts' notebook option and the two CI steps of `ci.yml`;
2. writes its own `notebooks/en/` and `notebooks/es/` by topic and level on its own data and packages (guide 08), with
   `notebooks/requirements.txt`, the SDD's `## Beyond the state of the art` section and the notebook pins in its technology table;
3. replaces the README's "What is in it" with `## Areas`;
4. runs `python scripts/check_notebooks.py`, `python scripts/check_readme_areas.py` and `python scripts/run_notebooks.py --check`,
   and fixes what they report.

## [0.09.000], 2026-10-20

### Added

- **The App's kind** (requirement WB-015). `product.json` gains `app` (`"workbench"`, the default, or `"surface"`), `focus` (default
  `true`) and `focus_reason`. A surface is an App that is not one case's: a hub, an explorer or a console (`SurfacePage`).
  `frontend/scripts/gate.mjs` tells the shell gate with `--workbench ''` and keeps `--require-focus`, so a surface App must have a
  view that opens in Focus mode (`TabDef.focus`, shell 0.16.0). A product without these fields is a workbench with Focus, exactly as in
  0.08.002.
- **The one waiver.** A surface App without any simulation (a hub that only links studies, which ADR-0070 does not bind) sets
  `"focus": false` and a `focus_reason` of at least eight words, and writes the same reason on the SDD's ADR-0070 row as
  `not applicable: <reason>`. `scripts/check_sdd.py` and the gate runner both read the two places; a waiver on a workbench, without a
  reason or a row, or with a different reason, an unknown `app`, and a `not applicable` row with no waiver fail, and the runner
  refuses to run the shell gate naming the field. No extra argument of a run removes `--require-focus` when it applies.
- While Focus is required the runner refuses the arguments that would make the Focus check measure nothing: `--workbench`, `--app-route` on a workbench, and a `--routes` list without the App route.
- When `deploy/TARGET` is `vps`, the runner passes the shell gate's `--spa-fallback`, so the build is served as nginx serves it
  (`try_files $uri $uri/ /index.html`, no `404.html`); `pages` keeps the Pages behaviour.
- Requirements WB-015 (the App's kind) and WB-016 to WB-019 (the guard fixes below) with adversarial rows
  (`tests/adversarial/test_app_kind.py`, `tests/adversarial/test_guard_gaps_0_09_0.py`, `frontend/src/gate-script.test.ts`). Guide 00
  says how to choose the App's kind, shows the surface with a focusable view and a rail, lists the files a product takes verbatim and
  documents the technology-table alias and the non-JSON documents.

### Changed

- Shell 0.16.0 (pinned exactly, lock file included): `SurfacePage` gets a Focus mode and the gate's G18 measures it on a surface App.
  The template's example stays a workbench and its gate run is unchanged.
- WB-014 now reads for both kinds of App: Focus mode for every case of a workbench or every view with a stage of a surface, unless a
  surface without simulation records its reason; the ADR-0070 row of the SDD says so.
- `scripts/check_content_standards.py` also reads a tracked file with no suffix (`LICENSE`, `VERSION`, `deploy/TARGET`, a dotfile)
  that decodes as UTF-8; it had skipped them, and an em-dash in the comment of `scripts/.template_residue_allow` and in three
  comments of `.gitignore` had passed. Both are fixed (WB-016).
- `scripts/check_documents.py` refuses a `documents` glob outside the repository (`..`, absolute) when run alone, and `scripts/check_content_standards.py` reads `git ls-files -z` so a non-ASCII path is scanned.
- `scripts/check_documents.py` validates JSON documents against their schema as before and leaves a committed document that is not
  JSON (a `.onnx` or `.pt` model file, a CSV table) to its row's own contract test; the row must fill its `producer test` or
  `consumer test` column, and the guard lists such files (WB-017).
- `scripts/check_tech_matrix.py` reads an npm alias `npm:<package>@<version>` (for example `"zz-typescript5": "npm:typescript@5.9.3"`,
  the TypeScript 5 compiler API that `openapi-typescript` needs beside a newer TypeScript): the version must be exact, the lock must
  record it, and the SDD technology table lists the alias under its own name with that version (WB-018).
- Three comments of the files a product takes verbatim (`scripts/check_sdd.py`, `scripts/check_content_standards.py`) named the owner;
  they now name the rule by its record (ADR-0067, `conventions/problem-context-first.md`), with no change of behaviour. A template test
  fails when a file listed in guide 00 under "Files a product takes verbatim" (now including `frontend/scripts/gate.mjs`) names the owner; the GitHub handle is the repositories' owner identifier and stays allowed (WB-019).

- `scripts/check_documents.py` names no document: it reads the new `documents` column of `docs/contracts/catalog.md` and
  validates every committed file each row governs against that row's schema (`-` for a row with none; globs relative to the
  root, `!` excludes, `path#Component` on an OpenAPI row; the same globs apply in the provider tree). A file two rows govern,
  and a JSON file under `data/derived` or `models` that no row covers, now fail (a hole used to pass unvalidated). The report
  and the exit codes are unchanged, and the template's own tree is validated as before (20 documents).
- `scripts/check_contracts.py` requires the `documents` column and validates its cells; a catalog without it fails naming the
  column and this release. `data/derived/readiness.json` is recomputed (the catalog changed).
- Requirements CT-030 (changed), CT-032 to CT-034 (new) with adversarial rows; the catalog and guide 00 document the column.

- The base-integrity step of the `guards` job moves out of `ci.yml` into `scripts/check_base_integrity.py` (same rules, same
  messages, read from `git ls-files` once, no pipe). It admits a tracked model file (`.pt`, `.pth`, `.onnx`) only when
  a catalog row's `documents` cell names it, at most 5 MB each and 50 MB together; a product with no catalog admits none. An
  undeclared `.onnx` file now fails too. The base rule stands: no heavy or native binary and no venv, and a declaration exempts a file from the model-file rule only (a declared `.dll`, `.parquet` or venv file is refused; `.npy` is raw data, not a model file). A machine path inside a tracked binary file fails, as in the inline step.
- `scripts/check_content_standards.py` reads `scripts/.content_standards_allow` (`<path> <sha256> <source URL>`, the template's
  has no entry): a listed file is skipped only while its digest, over LF-normalised content, matches; a changed or absent
  listed file fails.
- Requirements CT-035 to CT-038 with adversarial plants (`tests/adversarial/test_base_integrity_plants.py`) and unit tests
  (`tests/test_base_integrity.py`, which replace the tests of the inline step in `tests/test_guards.py`). Guide 00 documents both.

### Migration

A product instantiated from an earlier release:

1. adds the `documents` column to its catalog after `example`, one cell per row (`-` where a row has no committed document);
2. takes `scripts/check_documents.py` verbatim from this release, replacing its port (and the `check_contracts.py` that
   validates the column);
3. runs `python scripts/check_contracts.py docs/contracts/catalog.md --repo-root .`, `python scripts/check_documents.py` and
   `python data-pipeline/run.py readiness` (the catalog changed), and fixes what they report;
4. takes `scripts/check_base_integrity.py` and `scripts/check_content_standards.py` verbatim, replacing any variant of either
   guard and the inline base-integrity step of its `ci.yml` (that step becomes `python scripts/check_base_integrity.py`);
   moves the model files it commits by design into a catalog row's `documents` cell; and lists its third-party notice files
   (copied unmodified from upstream) in `scripts/.content_standards_allow` with their digests and source URLs. The base-integrity script imports `scripts/check_contracts.py` (the one parser of the `documents` column).
5. adopts shell 0.16.0 (`npm install --save-exact @fasl-work/caos-app-shell@0.16.0`) and takes `frontend/scripts/gate.mjs`,
   `scripts/check_sdd.py`, `scripts/check_documents.py`, `scripts/check_tech_matrix.py` and `scripts/check_content_standards.py`
   verbatim, with the tests of `tests/adversarial/test_app_kind.py` and `test_guard_gaps_0_09_0.py`. A workbench product needs no
   other change: with no `app` field it is a workbench with Focus, as before.
6. a product with a surface App sets `"app": "surface"` in `product.json` and gives its stage views `focus` (`TabDef.focus`, and
   `focus` on the `SurfacePage`); a hub without any simulation also sets `"focus": false` and a `focus_reason`, and writes the same
   reason on the SDD's ADR-0070 row as `not applicable: <reason>` (see guide 00). A product that kept an npm alias or a model file
   as a variant of a guard drops the variant: the guards now read both.
7. changes any comment of a verbatim script only upstream, never in the product: a product's public-safety guard may refuse the
   owner's name, and these files no longer carry it.

## [0.08.002], 2026-10-15

The template adopts shell 0.15.0. No data contract changes.

- Shell 0.15.0 (pinned exactly, lock file included). Its gate gains G19: in every measured state, a short value (a number,
  a percentage, an amount or a figure with its unit) must not break inside a segment; a break right after a hyphen, a dash
  or a slash is a normal line break. The template's full gate passes on it with no G19 failure.
- The example re-baked on 0.08.002 (only the version differs).

## [0.08.001], 2026-10-15

The template adopts shell 0.14.3 and fixes its CI base-integrity guard. No field of any data contract changes.

- Shell 0.14.3 (pinned exactly, lock file included). In Focus mode the stage label no longer covers the open group's
  controls when the title wraps: the shell measures its overlay chrome instead of clearing a fixed 4.6rem. The rail inside
  Focus no longer shows the Focus button. Gate G18 fails both defects.
- The CI base-integrity guard reads `git ls-files` once and runs every test on a here-string. Under the workflow's `bash -eo
  pipefail`, `git ls-files | grep -q` let grep exit on its first match; git ls-files then died of SIGPIPE and the pipeline
  reported 141, so `! git ls-files | grep -qx .env.example` turned true at random and the guard reported a tracked `.env`.
  Its .env test was also wrong both ways: a real `.env` passed whenever a root `.env.example` was tracked, and a product
  whose only example file is `frontend/.env.example` failed. Any `.env` other than an `.example` file fails now.
  `tests/test_guards.py` runs the step itself on planted trees (red on the old step for the three .env cases) and 16 times
  on a clean tree of 6,001 files.
- The example re-baked on 0.08.001: every manifest, the index and the readiness differ from 0.08.000 only in the version.
## [0.08.000], 2026-10-15

The template adopts shell 0.14.0: flip cards, the card carousel, animated illustrations and Focus mode for the App (Felipe,
2026-10-13; CAOS_MANAGE `plans/app-shell/0-14-0-plan.md`, backlog BL-060 to BL-063). Additive: no field of the executive data
contract changes (schema 2.0.0), and the header order, the landing and the full width of every documentation route are
unchanged.

- Shell 0.14.2 (pinned exactly, lock file included; 0.14.1 puts the Focus control on the case select's row, so no rail head grows
  with it; 0.14.2 keeps the cause shares of the executive view whole at phone width). The executive view now shows the bearers, the roles, the approaches of
  the state of the art and the 4 C's as small cards that flip, and a group of five or more cards as a carousel.
- The rule of use of flip cards, in guide 06 (section 2.1): small cards only, a title of at most 8 words in English and 10 in
  Spanish and a back of at most 40 and 50. The example's four groups fit the limits (`executive.test.ts`, WB-012; the shell
  gate G16 measures the rendered cards), and `pain.bearers` holds five cards of real content (the fifth is the ambulance
  crews held at the hospital door) so the example shows the carousel working.
- An animated illustration: the example's `pain.svg` animates the winter wave arriving, the queue of waiting patients growing,
  a clock running and the surgery being cancelled (one 8 second loop, theme tokens, the labels fixed), with a
  `@media (prefers-reduced-motion: reduce)` block that stops it and shows the static final frame. Guide 06 (section 5.1) says
  when to animate (a change, a flow, a sequence; a still for a single state) and what the block must do.
- `scripts/check_svg_animation.py` (new guard, CI checks job, with `scripts/svg_animation.mjs`): reads every `.svg` under
  `frontend/public/` and `frontend/src/` with the shell's own `analyseSvgAnimation` and `animationFailures` (`gate/areas.mjs`
  of the installed shell) and fails an animated SVG with no reduced-motion block, with a block that does not stop it, or that
  plays for more than ten seconds. It fails, never passes, without node or the installed shell (WB-013).
- Focus mode for the App: `Workbench.tsx` sets `focus` on `CaseWorkbench` (a Focus button in the rail head, `?focus=1` beside
  `?case=` and `?view=`, Escape or the exit button returns to the same case, group and sub-view), and `frontend/scripts/gate.mjs`
  always passes `--require-focus` to the shell gate, so an App built from the template cannot pass the gate without it
  (WB-014; a surface product with `--workbench ''` has no Focus control to require).
- Tests: `executive.test.ts` (the pin at 0.14.2, the flip limits, the carousel, the animated illustration and the refusals of
  the shell analysis), `App.test.tsx` (Focus mode on the App route), `gate-script.test.ts` (the flag), and
  `tests/adversarial/test_animation_and_focus.py` (the guard against planted SVGs, the runner against a stub gate).
- Docs: guides 00, 06 and 07, the README, the SDD (stack row, ADR-0070 and ADR-0078 rows), the web requirements and
  validation (WB-012 to WB-014). The example is re-stamped (`data/derived/readiness.json` and the manifests carry 0.08.000).

## [0.07.001], 2026-10-13

The template adopts shell 0.13.1 and states the two rules Felipe decided on 2026-10-13: the header order is always App,
Introduction, Methodology, Implementation, Experiments, Benchmark (the App is the leftmost tab; the product still lands
on the Introduction's executive view), and every documentation route, the Introduction included, takes the full width of
the page.

- Shell 0.13.1 (pinned exactly): `STANDARD_ROUTES` is App first again (0.13.0 had put the Introduction first) and `DocPage`
  always renders the full-width document layout. No code change was needed beyond the pin: the header reads the order from
  `STANDARD_ROUTES`, and the landing, the `/app` route and the forwarding of an old `/?case=` link are unchanged.
- Tests: `frontend/src/App.test.tsx` asserts the order of `STANDARD_ROUTES` (App first) and the order of the six links in
  the rendered header; `frontend/src/content/executive.test.ts` asserts the pin at 0.13.1.
- Docs: guide 07 states the header order and the full width; guides 00 and 06, the SDD (executive brief section, stack row,
  ADR-0078 row), the web feature requirements and validation (WB-010 the order, WB-011 the full width) follow; the
  Introduction's page list no longer calls the App "the landing page" and says it is the leftmost tab.
- The example is re-stamped (`data/derived/readiness.json` and the manifests carry 0.07.001).

## [0.07.000], 2026-10-13

The template adopts shell 0.13.0 and the executive view standard decided on 2026-10-13 (CAOS_MANAGE `conventions/problem-context-first.md`): a product lands on its Introduction's executive view, an executive frame of the problem space (a landing block with the key statement and headline figures, then five sub-tabs: the pain, the context, the current situation, the trends, the proposal with the 4 C's), never the app, never a client, never a pitch. The example frames hospital capacity in respiratory seasons, every figure and claim linked to its source; `check_sdd.py` validates it against the shell's schema 2.0.0.

- Shell 0.13.0 (pinned exactly): the executive view standard of CAOS_MANAGE `conventions/problem-context-first.md` (decided
  2026-10-13) replaces the 0.12.0 one. BREAKING for products: `executive.schema.json` 2.0.0 replaces the 0.12.0 fields
  (`executive`, `organisation`, `initiative`, `why_now`, `vision`, `outcomes`, `dialogue`); a product rewrites its
  `content/executive.json` and its three illustrations.
- Landing: the product lands on the Introduction's executive view. `App.tsx` routes `/` and `*` to the shell's `Landing`,
  the App moves to `/app` (an old link such as `/?case=B2` is forwarded with its query string), the unused `NotFound` page
  is removed, `scripts/check_live.py` checks `/app` too. Test: `frontend/src/App.test.tsx` (WB-008).
- The example's `content/executive.json` is rewritten as an executive frame of a problem space, hospital capacity in
  respiratory seasons, for no single hospital: a landing block, the five sub-tabs (the pain, the context, the current
  situation, the trends, the proposal with the 4 C's), nine sources each a title and an https link, every figure read at its
  source. The three illustrations are redrawn as `pain.svg`, `situation.svg` and `proposal.svg` under
  `frontend/public/executive/` (scenes in theme tokens, both languages inside the drawing; the pain and the proposal share
  one hospital setting); `initiative.svg`, `problem.svg` and `solution.svg` are gone.
- `scripts/check_sdd.py` validates the file against schema 2.0.0 (it refuses an installed schema that is not 2.0.0) and holds
  what a schema cannot say, as the shell's `validateExecutive` does: the 4 C's in order, the weights of the causes at most 100,
  every action owner a role of the situation, the writing limits in both languages, no promotional or client-bound wording,
  and the sources by id (unique, every citation names one, every source is cited, https links, no file citation).
- Tests: `frontend/src/content/executive.test.ts` and `Introduction.test.tsx` are rewritten for 2.0.0; `tests/test_spec_guards.py`
  and `tests/adversarial/test_guards_reject_planted_defects.py` plant the new defects; the residue marker flags the new example.
- Docs: guide 06 is rewritten to the standard, guides 00 and 07, the SDD executive brief, the design README, the web feature
  requirements WB-002 to WB-009 and their validation follow; `docs/design/measured-resources.md` no longer says the executive
  view states the example's numbers.

## [0.06.000], 2026-10-13

The executive view standard (CAOS_MANAGE `conventions/problem-context-first.md`): a product's executive view is the shell's `ExecutiveView` (0.12.0) rendering its `content/executive.json`, the four sections of Felipe's executive-pitch rubric in fixed fields, with three illustrations of the initiative, the problem and the proposed solution; `scripts/check_sdd.py` validates the file against the shell's schema. The example is tailored to a regional hospital network's chief operating officer, and its five documentation pages meet the ADR-0017 section 2.1 floors.

- The executive view standard (CAOS_MANAGE `conventions/problem-context-first.md`, Felipe 2026-10-12): the example ships a filled `content/executive.json` (a hospital network's chief operating officer planning beds for the winter respiratory season, every figure sourced or read from the example's own committed results, no 4 C's while the shell's `FOUR_CS` is empty) and three authored illustrations of the initiative, the problem and the proposed solution in `frontend/public/executive/`; the Introduction renders the shell's `ExecutiveView` from the file as its first and default view, the technical view second.
- Shell 0.12.0 (pinned exactly): `ExecutiveView`, `validateExecutive`, `executive.schema.json` 1.0.0. BREAKING for products: the Introduction areas `initiative`, `outcomes`, `positioning` and `credibility` are gone; the old four-part `Executive brief` of the SDD is replaced by a section that names the data file (`Data file: content/executive.json`) and restates nothing.
- `scripts/check_sdd.py` fails a product whose `content/executive.json` is missing, is not JSON or breaks the shell's schema (each finding names the field path), whose shell schema is not installed (it fails and says to run `npm ci`, it never passes unvalidated), whose figures lack a source by field path, whose illustration files are missing or are not SVG with a viewBox, or whose SDD section does not name the file or restates the view. It needs `jsonschema` (already in `requirements-dev.txt`), and CI installs the web dependencies and `jsonschema` in the checks job.
- `frontend/src/content/executive.test.ts` runs the shell's `validateExecutive` on the file and holds the illustrations to the standard (theme tokens only, no chart, labels in both languages, a shared setting); `frontend/src/pages/Introduction.test.tsx` holds the Introduction to the executive view first.
- Guide 06 is rewritten to the standard (the old four parts and their format are gone); guide 00 makes filling the executive view the first step after instantiating; guide 07 and the design README follow. The requirement rows WB-001 to WB-007 replace the old WB-001 to WB-004.
- The four other documentation pages reach the ADR-0017 section 2.1 floors the shell's gate measures (CAOS_MANAGE backlog BL-050): Methodology is six method topics (the SIR model and threshold, the final size, the numerical scheme, the analytic peak, then the learned surrogate and its held-out evaluation, each with four paragraphs, two captioned equations, a figure, one honest callout and references); Implementation is nine topics in four question groups with the architecture figure, the contract table, the lanes, the engine and reproducibility sections; Experiments is six topics (cases, theory, immunity, metrics, protocol, datasets); Benchmark declares results, comparison, robustness, live (a registered control running the engine in the browser), provenance and caveat. The example has one learned model, so its two learned topics are its fit and its held-out evaluation. Small inline figures come from `frontend/src/content/figures.tsx`.
- The three illustrations label the executive as the data file does: "Chief Operating Officer" and "Director de Operaciones".

## [0.05.000], 2026-10-12

The spec area with the executive brief (recorded at 0.06.000 from the unit fragments; the four-part brief is replaced in 0.06.000):

- The SDD carries an executive brief (initiative, outcomes, positioning, credibility) right after the problem and non-goals, and `scripts/check_sdd.py` fails an SDD without it, with a part that is empty, a quantified statement with no number, source or reasoned assumption, fewer than three outcome rows, a positioning that is not four bullets, fewer than three answered questions or no `Limits:` line, or an equation in it (problem-context-first).
- New guides: `docs/guides/06_executive-brief.md` (how to write the brief) and `docs/guides/07_documentation-pages.md` (the areas each of the five documentation pages must cover, from ADR-0017 section 2.1); the instantiate guide makes the brief the first thing a product writes after its research.
- The spec-area guards are hardened after the adversarial review of 0.05.000 (47 of 65 probes were false passes). `scripts/check_sdd.py`: a gate is a live test found by parsing the file (Python `ast`, a TypeScript scanner that ignores strings, comments and other tests' bodies), never a name in a string, a prefix of a title, a skipped test, a `describe`, a document or a non-test function; a malformed, indented or split requirement row, a bullet with an ID, a lower-case ID and a duplicate ID are findings; a status other than live needs a reasoned entry in the `.status-allow` file of the features folder; a feature folder without `requirements.md` is a finding; the twelve sections are headings outside fences and comments, once, in order, with a body; the research basis counts distinct works (a DOI cited three ways is one, placeholder hosts none) and needs a line starting `UNVERIFIED:`; the resources table needs one row per stage and no placeholder cell; a validation gate must be a test under `tests/adversarial/` or named `test_adversarial_...` or `it('adversarial: ...')`.
- `scripts/check_contract_versions.py` gains `--base REF` (CI passes the push's `before` SHA, or `origin/develop`): a schema that differs from the ref's needs a higher version whatever the lock says, a breaking change by the mechanical floor (a minimal JSON Schema diff, listed in the catalog) needs a major bump, and a schema removed needs a `major` History row; an unresolvable ref fails naming `fetch-depth: 0`. A History row's kind must be the semver step from the contract's previous row.
- `scripts/check_tech_matrix.py` reads every `requirements*.txt`, `pyproject.toml` dependencies and `package.json` optional, peer and overrides entries; fails on a package pinned twice with different versions, on `-e`, URL and wildcard requirements; a package.json range must equal the lock's root spec with a locked version that satisfies it, and the table holds the locked version.
- `scripts/check_ci_budget.py` allows exactly `[pip install pytest==X.Y.Z && ]python -m pytest tests/adversarial[ -q]` (a whole-command match after the backslash continuations are joined) and stops counting `pip install pytest` as a test run.
- `tests/adversarial/test_guard_holes.py` plants one defect per false pass of the review in a copy of only the files a guard reads; the line-endings test now proves the copy was hashed. The tests the validation files cite are renamed `test_adversarial_...` (Python) or `adversarial: ...` (TypeScript titles), and the requirement and validation gates name their full titles.
- The executive brief rule of `scripts/check_sdd.py` is read from the text a reader sees (a `~~~` fence is closed only by `~~~`, a part whose body is only a code block is empty, a numbered heading such as `## 2. Executive brief` is the brief and its position is checked), refuses a year or an index as the number of a claim, a source that is a directory, the repository root, a placeholder host or a made-up DOI, text made of placeholders or stubs (TBD, lorem ipsum, `- **-**: -`, one question three times, one-word answers, `Limits: TBD`), and a second brief section. A labelled assumption is accepted only in the template (no `.template-version`); in an instantiated product it is a finding.
- A validation gate that skips for lack of a tool (a `skipif` mark, `pytest.skip`, an `importorskip` of a package no requirements file pins) counts as not run: the row needs a second gate that runs, or `local-only: <why>` in its check cell. The adversarial name is `test_adversarial_` or `adversarial: ` with its separator; the design README says it is a claim a reviewer verifies, and lists the known limits of the guards.
- `scripts/check_ci_budget.py` reads a `run:` value as YAML does (folded and continued scalars, a block of any depth, `>` judged folded and line by line) and fails on any pytest environment variable (`PYTEST_ADDOPTS` and the like) in a product workflow.
- CT-019 now plants an undeclared and a missing route; EX-002 compares bytes and SHA-256 and plants a changed byte of equal size. The example brief cites committed evidence (`docs/design/measured-resources.md`, the manifests) instead of the SDD itself, and its sizes agree with the Deploy driver. Guides 06 and 07 follow the convention and ADR-0017 section 2.1 (the executive view and its four areas cannot be waived). The version is 0.05.000 and the bake is restamped.

## [0.04.000], 2026-10-11

The product side of contract-first parallel delivery (ADR-0080, issue #25): every boundary is a catalog row with one
schema file, the web's types are generated from it, both sides are tested against it, every row has a provider, and
missing data or an untrained model is a declared state the site and the API show. Built as three parallel units
against contracts fixed first.

### Added

- `docs/contracts/catalog.md`: seven rows (params-record, case-index, case-manifest, trace, the surrogate-model slot,
  readiness, api), each with owner, version, schema, example, producer, consumer and swap tests, missing-data
  behavior, provider and status, and the ordered rules that give every row one of six states (available, partial,
  stale, provider, training, missing) with bilingual reasons. `docs/contracts/schemas/` holds one JSON Schema 2020-12
  file per document; `docs/contracts/api.openapi.json` is the OpenAPI 3.1 document of the dormant API.
- `docs/contracts/fixtures/`: a provider tree in the layout of `data/derived/` (one case, its manifest, trace, index
  and a readiness that says provider) and a source table. `CAOS_DATA_ROOT=docs/contracts/fixtures/data/derived`
  builds the site on it (the walking skeleton) and `DATA_DIR` serves it from the API.
- `frontend/scripts/gen-contract-types.mjs`: generates `frontend/src/lib/contract.gen.ts` from the OpenAPI document
  with openapi-typescript 7.13.0, each schema file's `$defs` hoisted to one component per name; `npm run
  contracts:types` writes it, and `npm run build` fails when it is not current.
- `data-pipeline/pipeline/core/readiness.py`: computes `data/derived/readiness.json` from the catalog and the
  repository (no clock: the product version and the catalog's SHA-256); every bake writes it, `python
  data-pipeline/run.py readiness` recomputes it, and `scripts/check_readiness.py` (stdlib) fails when it is stale.
- `data-pipeline/pipeline/model/baseline.py`: the surrogate slot's analytic baseline (the SIR peak with S0 = 1) and the
  bundle validator; `run.py all --no-train` never trains and reports the released bundle or the baseline.
- The dormant API serves `GET /api/readiness`.
- The site reads the readiness document: a note on the workbench, Experiments and Benchmark for the stale, provider,
  partial and training states, with the document's reason; not available yet, never an empty chart, for what is
  missing, and the case marked in the selector; readiness unknown, with a console error, when the document cannot be
  read. Implementation gains the section "What is real in this build" with the readiness table.
- Tests on both sides of every row: `tests/contracts/` (the committed bake, a fresh sandbox bake and the provider
  tree against the schemas; contract 1 with its bounds held equal to the code's; every readiness state through the
  real computation with the catalog's reasons; the surrogate swap over the baseline and the trained bundle; every
  API response against the OpenAPI document, on the bake and on the provider tree), `frontend/src/lib/contract.test.ts`
  and `api.contract.test.ts`, `frontend/src/readiness/readiness.test.ts`.
- `scripts/check_contracts.py` and `scripts/check_skeleton.py`, vendored from the harness, and three CI steps in the
  `checks` job: the catalog complete with every path present, the readiness current, and the rows still on a provider
  listed (none allowed on `main`).

### Changed

- `frontend/src/lib/contract.types.ts`: every exported type is an alias of the generated types (names kept); the
  run-time descriptors are tied to them by `satisfies`.
- `train.predict` clamps to [0, 1]; `evaluate.run` takes no bundle and uses the baseline. The catalog declares the
  trained fit's domain: monotone to r0 = 10, past which the four-term fit turns down (the baseline holds to 20).
- `app/` reads its settings when instantiated, so `DATA_DIR` set after import takes effect.
- `requirements-dev.txt` pins jsonschema 4.26.0, openapi-spec-validator 0.9.0, and fastapi 0.143.0 and httpx 0.28.1
  for the API contract tests; `requirements-api.txt` keeps its pins as comments, so the API lane stays dormant.
- The canonical bake is re-run at 0.04.000 (manifests and index; the traces and the surrogate bundle are unchanged).

### Fixed

- The API answered `GET /api/cases` with `{"cases": []}`, a body that is not an index, when no bake existed; it now
  answers 503 with state `missing` and the reason.
- From the release's adversarial review: a catalog status other than `real` or `active` fails the readiness
  computation instead of being published as real; the API serves only indexed manifests and the artifacts they name
  (it served the index and the readiness as artifacts) and answers 503, never 500, for an unreadable document; a bake
  the readiness declares partial builds, with a warning per declared absence, so the frontend's partial handling
  reaches the site; `scripts/check_documents.py` validates every committed document against its schema in CI
  (constraints the generated types do not carry); the manifest is `example.manifest/v4` and records which model
  produced its metrics, so a baseline bake stays labelled after a bundle appears.

## [0.03.001], 2026-10-08

A guard for a failure the base's gate could report but not explain (issue #22), and the example on the shell 0.10.0.

### Added

- `check_web_baseline.py` fails when the source imports a shell entry and never its stylesheet: the shell needs
  `styles.css`, and `@fasl-work/caos-app-shell/chart` needs `chart.css`, imported from a source file or from the
  app's CSS. Without `chart.css` a filling chart has no height and is never drawn. CAOS_Fragmenta moved its parity
  plot onto the shell's chart without it, and the gate said only that a stage never got a size. The guard could not
  see it before: it reads both stylesheets from the installed shell, so a class the browser never receives a rule
  for passed as styled.

### Changed

- The web runs on `@fasl-work/caos-app-shell` 0.10.0, pinned exactly: reference lines, point sizes and picking in the
  plane on `UPlotChart` (what a parity plot needs), and every chart declares how many ticks each axis labels.

### Verified

- `pytest`: 25 tests (one new: the stylesheet of every shell entry the source imports); `ruff check`; every guard.
- `npm test` 20 of 20; `npm run build`; `caos-shell-gate` on the built example: 0 failures in 331 states; captures
  read.

## [0.03.000], 2026-10-07

The base on the shell 0.9.3 (CAOS_MANAGE `plans/app-shell`; research in
`wip/template-archetype/base-unify-audit-2026-10-07.md`): a product instantiated from this release starts on the
shell's tokens, its three route types, its bar chart and text kit, and the gate's checks of text in drawings, Spanish
numbers, sticky lists and contrast, and its guards hold the shell pin and judge product CSS by what it restyles.

### Changed

- The web runs on `@fasl-work/caos-app-shell` **0.9.3, pinned exactly** (it was `^0.7.2`: a product instantiated from
  the template floated to any later 0.x and shipped a shell it never gated; issue #19). With 0.9.3 a rail knob draws
  its value on its label's row (CAOS_APP_SHELL#77), so the example's rail is two lines shorter.
- The comparison of immunisation variants is the shell's `BarChart` (horizontal, filling its card, the variant on
  screen highlighted) in a `ViewsRow`; the hand-drawn bars with a fixed 56px axis margin and unfitted labels are
  gone. The chart marks ("peak", "this case") are drawn by the shell on the right side of their line, inside the plot,
  haloed.
- `check_web_baseline.py` judges each product CSS rule by the classes of its subject (the last compound), against the
  shell's `components` and `modifiers` (`reserved-classes.json` since 0.8.0): restyling a shell component fails, a
  modifier alone (`.on`) fails, a modifier joined to the product's own class (`.my-row.on`) passes. Until 0.8.0 the
  list reserved the words, and a product could not write `.my-row.on`.

### Added

- `check_web_baseline.py` fails a shell pin that is a range, or that differs from the installed package (issue #19).

### Fixed

- `check_version_coherence.py` reads code, not history: a version in a Python comment or docstring, in a
  TypeScript or JavaScript comment, or in the prose of the documentation pages (`frontend/src/pages/`,
  `frontend/src/content/`) passes; one in code fails (issue #19: on CAOS_Fragmenta 23 of 26 reports were history, and
  its Implementation page cites the release a measurement was made at). It takes the repository root as an argument,
  so its tests plant both kinds in a throwaway tree.
- The build wrote `dist/build.json` in `closeBundle`, which also runs when the build fails, so a failed build reported
  an ENOENT on `build.json` instead of its own error; it is written in `writeBundle`.

### Verified

On the shell 0.9.3, 2026-10-08:

- `pytest`: 24 tests (three new for the guards: code against history versions, the subject of a CSS rule, the exact
  pin); `ruff check`.
- `npm test` 20 of 20; `npm run build`; every guard (`check_live.py` runs after a deploy, with its URL).
- `caos-shell-gate` on the built example: 0 failures in 331 states (five sizes, both themes, both languages, the
  wide-font pass at 390 and 1280 px); captures read, the comparison opened by `?view=compare` at 1280 and 390 px.
- `check_version_coherence.py` keeps its lines within 110 characters, so a product whose linter checks line length
  takes it unchanged (CAOS_Fragmenta's does).

## [0.02.004], 2026-10-05

Two defects found while CAOS_Contraste built its case C05 (issues #13 and #16), and the base on the shell 0.7.2.
Each fix carries a test that fails without it (`tests/test_guards.py`).

### Changed

- The web runs on `@fasl-work/caos-app-shell` 0.7.2 (0.7.1 and 0.7.2 published to npm on 2026-10-05): it carries the
  fixes of the known shell defects 14 to 18 (scientific notation for tiny magnitudes, the workbench rows that no
  longer shrink, the key under every chart of several series, the gate's pointer probe) and 21 (an integer axis ticks
  only at integers, and the gate fails a repeated tick label), so a product instantiated from this release starts on
  them and carries no override for them.

### Fixed

- The residue marker for the example's immunisation variants (`\bCOVERAGE\b`) matched inside a hyphenated identifier,
  because a hyphen is a word boundary: Contraste's finding id `F-SCALED-COVERAGE` failed the guard in its pipeline and
  in every artifact that carries the finding. The token counts only when no word character or hyphen touches it, as
  the placeholder-name marker already does; the example's constant is still caught.
- The doc-path guard judged a named path by the working disk, so a git-ignored output (a gate's screenshots) passed on
  the machine that had made it and failed on CI's fresh checkout: Contraste's develop CI failed on docs naming
  `frontend/gate-output/shots`. It now judges the repository as git sees it (tracked and untracked-not-ignored files,
  and their folders), allows a path the repository ignores on purpose, and reports a link that leaves the repository;
  local runs and CI agree.

## [0.02.003], 2026-10-05

Eight defects found while CAOS_Contraste replaced the example and ran its first full gate (issue #10). Each fix
carries a test that fails without it (`tests/test_guards.py`, `tests/test_dormant_api.py`).

### Fixed

- The residue guard flagged its own tests in every product (`tests/test_guards.py` must name the placeholder it looks
  for); its tests are now part of the guard's own set.
- The residue guard never read `.sh` and `.ps1` files, so `scripts/precompute.sh` and `scripts/precompute.ps1`
  shipped the example's case id in every product; they are scanned now, and their comments name a `<case-id>`.
- `scripts/precompute.ps1` found the pipeline interpreter in `.venv-pipeline` and then ran the global `python`; it
  runs the environment's interpreter.
- The template's instantiate test failed in every product (it needs the `.template-source` sentinel that instantiation
  deletes); it runs only in the template repository.
- The web's unit tests read only `.test.ts`, so a product's component tests (`.test.tsx`) never ran; Vitest includes
  both.
- The dormant `app/` read the example's manifest shape (`artifact.path`, `trace_schema`), so it broke in a product whose
  manifests differ. It serves the committed documents unchanged: `/api/cases`, `/api/cases/{id}/manifest` and
  `/api/artifacts/{path}` (any artifact a manifest names, in either form of contract 2), nothing outside
  `data/derived`; the example DTOs are gone.
- Template prose survived instantiation in files a product keeps: `pyproject.toml`, `requirements-precompute.txt`,
  `requirements-gpu.txt`, `tests/conftest.py`, `data-pipeline/pipeline/io/formats.py` and the framework card template
  now say what is true in any product. A new residue marker catches prose about the example engine in the files a
  product rewrites.
- `read_csv_rows` read a spreadsheet's UTF-8 export with its byte-order mark in the first header; it drops it.

## [0.02.002], 2026-10-05

Six defects found while CAOS_Contraste replaced the example (issue #7). Each fix carries a test that plants the
failure (`tests/test_guards.py`, `frontend/src/lib/declared.test.ts`, `frontend/src/lib/contract.test.ts`).

### Fixed

- `scripts/instantiate.py` renamed the package in `frontend/package.json` but left the template's name and version in
  `frontend/package-lock.json`, which the residue guard then flagged; it now renames both places of the lockfile.
- The residue guard's placeholder-name marker matched the template's own Vite plugin name `caos-product-html`, a
  finding no product could clear without editing base code; it now matches the placeholder name only.
- `scripts/check_doc_paths.py` failed on the gates of a requirements file opened `Status: planned`, which
  `scripts/check_sdd.py` allows: the two guards contradicted each other on the first day of every unit. The gates of
  a planned feature's `requirements.md` are now skipped there (and only there).
- `scripts/instantiate.py` left the template's own guide to instantiating (`docs/guides/00_instantiate.md`) and its
  index line in the product, where it names the example's feature folder; it now removes both.

### Added

- A case manifest may name several artifacts (`artifacts: [{path, bytes, lane, gate, ...}]`, one per variant baked
  apart) as well as one (`artifact`); `frontend/scripts/declared.mjs` holds the rule for the build and its test, and
  `scripts/check_artifacts.py` checks each artifact's bytes and lane. The index may declare further files to serve
  (`files`, a product's contract declarations say), copied and checked like the rest.
- `conform()` gains a nullable kind (`{ nullable: Kind }`), for an optional bound or an absent reference.
- `scripts/check_artifacts.py`, `scripts/check_doc_paths.py` and `scripts/check_template_residue.py` take an optional
  repository root, so their tests run them on a planted tree.

## [0.02.001], 2026-10-05

Found instantiating CAOS_Contraste, the first product made from 0.02.000 (by copying into its existing repository).

### Fixed

- The residue and doc-path guards read tracked files only, so in a product instantiated by copying (nothing
  committed yet) the residue guard reported "OK, no example content in 2 tracked files": a check that passed with
  nothing to check. Both now read tracked and untracked files (ignored ones excluded), and refuse a tree with too
  few files to be a product.
- `.template-version` recorded the product repository's own HEAD as if it were the template's commit; it now records
  the template release and its tag (`CAOS_PRODUCT_TEMPLATE 0.02.001 (tag v0.02.001)`).

## [0.02.000], 2026-10-04

The base fix of 2026-10-04 (ADR-0078, the recurring-failures history): the template now carries the rules every
product kept re-deriving, each with the gate that fails when it is broken.

### Added

- The frontend on shell 0.7: the six standard routes, one `CaseWorkbench` (case picker, immunisation variants, the
  two rates and the live values in the rail; Dynamics, Validation, Compare and Context in the instrument), five
  documentation pages with captioned equations and references whose DOIs resolve, a not-found page, and five
  bilingual architecture diagrams inlined with the shell's tokens.
- The live lane as a TypeScript port of the engine, with a parity test against every baked trace and a
  first-order convergence test against the final-size relation.
- The contract 2 mirror as interfaces and run-time descriptors, and a test that reads every committed artifact
  against them in both directions, types included.
- The artifact layer: root-absolute URLs with `?v=VERSION`, JSON only, declared loading state.
- Expected ranges per case (`core/expect.py`): the bake fails on a result outside them, and the manifest carries
  them to the web. Bilingual titles, categories and expected bands; the index names the default case.
- Build: `VITE_BASE` or `/`, one React and one router, the pre-paint script, `build.json` with the commit, every
  route materialised, `404.html`; `npm run preview` serves the build as Pages does; `npm run gate` runs the
  measured gate.
- Guards: `check_version_coherence.py`, `check_sdd.py` (mirrored from OreFlow, with the ADR-fit section and named
  TypeScript tests), `check_web_baseline.py`, `check_doc_paths.py`, `check_deploy_place.py`, `check_live.py`; the
  residue guard rewritten on content markers; the test sandbox with a session guard on committed artifacts.
- `scripts/instantiate.py`, the MIT `LICENSE`, `deploy/TARGET`, the example's SDD and feature requirements.
- CI: a web job, `pipefail` on every step, a workflow parse check, every guard; the deploy runs only after CI
  succeeds on the same commit and checks the live site.

### Fixed

- The epidemic case promised an attack rate between 0.7 and 0.9; its engine produces 0.924 (the final size for
  R0 = 2.75 is 0.920). The band now says what the engine and the theory say, and is checked.
- A test rewrote the committed EX02 manifest with its own seed and metrics; tests now run in a sandbox.
- The version was written in three places and read from none; it is read from VERSION everywhere.
- The nginx template answered a missing artifact with the app; it now answers 404 and includes the MIME table.
- Documentation that named files which no longer exist (the Pyodide worker, `architecture.ts.txt`, the old SVG
  folder, `docs/data-contract.md`) and links into a private repository.

### Removed

- The stub frontend, the Pyodide worker stub and `pipeline/live.py` (nothing called it), the root
  `requirements.txt` of the former Python live lane, and `STRUCTURE.md` (a pre-template blueprint).

## [0.01.000], 2026-06-20

### Added
- Initial instantiation from the CAOS product-repo template (ADR-0057).
- Offline `data-pipeline/` (`pipeline`): the two data contracts (ingestion + artifact), the named staged
  pipeline (preprocess → feature_extraction → train → infer → evaluate → export), the seeded RNG, the compact
  trace, the manifest, and the measured live-vs-precompute gate.
- EXAMPLE engine: a deterministic SIR epidemic (numpy-only, Pyodide-safe), **replace with the product's
  research-chosen SOTA engine**.
- Cases-by-category registry (4 regimes + 1 degenerate control); a live-lane entrypoint (`live.py`); tests for
  both contracts + pipeline determinism.
