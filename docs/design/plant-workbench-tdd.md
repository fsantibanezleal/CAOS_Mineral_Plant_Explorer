# Test-driven acceptance: CAOS Mineral Plant Explorer workbench

These are product acceptance tests, not only code checks. A test fails if a different area selection leaves the same complete asset/stream diagram on screen.

## A. Model and graph tests

| ID | Acceptance test |
|---|---|
| TDD-01 | Every required area ID exists; each required core asset is assigned exactly once; all authored assets are assigned to an area or explicitly classified as shared context. |
| TDD-02 | For each area, the selected asset set is strictly smaller than the global set where appropriate, and its internal stream set differs from every other detail area. Boundary streams resolve to explicit connector nodes; dangling IDs fail validation. |
| TDD-03 | Water view includes every stream with a positive `water_m3_h`, including streams whose material is slurry, solution or electrolyte. It labels m³/h and never treats internal recycle as an external input. |
| TDD-04 | Water-balance closure is unavailable when any required boundary/value is missing, stale, invalid, or unit-incompatible. No missing value is imputed as zero. |
| TDD-05 | Plant snapshot and all engine observations retain asset/stream identity, units, source, version/hash, provenance and timestamp. Incompatible or stale adapter data is refused or visibly unavailable. |

## B. View behavior tests

| ID | Acceptance test |
|---|---|
| TDD-06 | Global process schematic shows every area boundary and the connected mine-to-plant flow. Selecting `flotation` replaces the graph with the flotation detail and its boundaries; grinding and leaching produce their own different nodes, lines, labels and layouts. |
| TDD-07 | The area selector is available from global and detail views. `mine-extraction`, `grinding`, `flotation`, `leach-sx-ew`, `thickening-filtration`, `water-balance`, `tailings` and `utilities` each open their own view. |
| TDD-08 | Switching among global/area, 2D schematic, 3D and evidence views preserves compatible selected area, asset, source and time cursor. Browser back/forward restores view state. |
| TDD-09 | Selecting a symbol or 3D asset synchronizes inspector, values, trends and engine evidence by the same stable ID. Area-boundary assets remain inspectable. |
| TDD-10 | Equipment uses recognizable, ported symbols by kind, not generic ID rectangles. Stream family, direction and status remain separately distinguishable in monochrome and color. |
| TDD-11 | Global overview has an intentional mine-to-plant composition, visible process-area boundaries, distinct solids and water/solution circuits, no clipped areas and no illegible all-plant knot. |
| TDD-12 | Every required area has distinct compositions in 2D site plan, 3D spatial view and process schematic. At 1440×900 and 390×844, area name, useful process/site extent, selected asset, values/units, source and status are legible with no collisions. |
| TDD-13 | A selected 3D area frames recognizable equipment, process context and declared boundaries; unrelated assets are hidden or de-emphasized. Global 3D frames the entire mine-to-plant extent; empty grid cannot dominate the view. |
| TDD-14 | Each area information panel shows its purpose, input/output boundaries, relevant source-supported metrics, related streams, linked CAOS evidence and trends. Every number has a source, timestamp/time basis, unit and evidence class. Unsupported KPIs are absent. |
| TDD-15 | Replay motion animates only valid flowing streams in the selected view; pausing stops it; no ambient spin or continuous decorative pulsing; reduced-motion disables nonessential animation. |
| TDD-16 | With no real gateway configured, the app states synthetic replay. A configured live source labels source, freshness and quality; stale, bad and missing inputs are visibly unavailable. |
| TDD-16a | Hovering/focusing an overview area reveals its useful preview; clicking/activating opens a dedicated area workspace and materially changes all three representations and area-specific information. Keyboard activation works. |
| TDD-16b | Opening an area from a global 2D plan keeps the 2D plan active and replaces its global spatial composition with the selected area's spatial composition. The same rule holds for schematic and 3D views; URL, area selector, equipment list and view label agree. |
| TDD-16c | Selecting an area filters CAOS engine links and method-comparison channels to its core assets; the water-balance scope uses its participating water-bearing assets. Global scope retains all evidence, and areas with no bound engine show an explicit empty state. |

## C. Integration tests

| ID | Acceptance test |
|---|---|
| TDD-17 | Valid CAOS engine manifests are discovered and their outputs appear on the relevant area/asset. Source product, engine/version, hash, unit and evidence class are inspectable. |
| TDD-18 | Missing engine, missing artifact, hash mismatch, unsupported schema, unknown binding and incompatible unit each produce a named unavailable/incompatible state; they do not break other adapters. |
| TDD-19 | The read-only site adapter rejects HTTP except loopback development, invalid credentials, graph-revision mismatch, out-of-order values and future timestamps; it never exposes a write operation. |

## D. Browser/deployment gate

| ID | Acceptance test |
|---|---|
| TDD-20 | Browser matrix visits global plus every required area in all three representations; asserts distinct area IDs, node/stream sets, area content and per-view screenshots after every selection. |
| TDD-21 | Visual captures at desktop and narrow phone widths show a usable global view and all area views, legend, inspector, source status and no clipped primary interaction. English and Spanish labels work. Review layout balance, hierarchy, line crossings, information density, value legibility, equipment form, camera framing and animation behavior. |
| TDD-22 | The canonical HTTPS endpoint has a valid hostname certificate and enforced HTTPS. `/`, `/app`, data manifests and all SPA routes load the exact deployed commit; browser console has no uncaught errors. HTTP-only is a deployment failure. |
| TDD-23 | Release asset hashes and source tag match the exact deployed commit. The Zenodo GitHub integration produces exactly one software concept record for the current release. |

