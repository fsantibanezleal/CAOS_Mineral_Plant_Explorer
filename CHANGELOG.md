# Changelog

All notable changes to this product. Versions are X.XX.XXX (VERSION is the single source); every release is
tagged.

## [0.02.004] - 2026-11-02

### Fixed

- Keep the no-series Trends state distinct from the process schematic; bring available area channels and boundary context forward for normal and Focus layouts.
- Add an adversarial browser assertion for trend fallback content and schematic separation.

## [0.02.003] - 2026-11-02

### Changed

- Recompose Focus around the active visualization with a compact configuration rail, moving selected data into the rail where a HUD would cover selectable map/evidence geometry.
- Preserve diagram detail while separating site-plan, global flowsheet, area schematic, 3D, trend/availability and CAOS evidence modes.

### Fixed

- Keep Focus controls within desktop height and avoid clipped Spanish replay-case labels.
- Clear global route labels from the oxide-lane title, meet text contrast, and keep phone site-plan targets clear of Focus chrome.
- Harden the bilingual geometry sweep against browser/WebGL accumulation between phases.

## [0.02.002] - 2026-11-01

### Added

- Show a selected area's route, evidence class, asset count, connected-engine coverage and process boundaries on hover/focus in both global 2D views.
- Add distinct bilingual process-reading guides for extraction, crushing/stockpiling, grinding, flotation, leach/SX/EW, thickening/filtration, water balance, tailings and utilities.

### Changed

- Refine the 3D plant scene with area-fitted ground and camera bounds, distinct crusher forms, thinner typed process routes and a low-relief, two-ridge ROM stockpile.
- Keep area drilldown on the selected global, 2D site-plan, schematic or 3D representation; stabilize the mobile evidence tabs and remove unsupported shadow-map configuration.

### Fixed

- Make every area choice open that area's own detailed process view and preserve view/area/equipment identity in the URL.
- Display the selected 3D equipment's identity, status, value, unit and evidence source in its hover card.

## [0.02.001] - 2026-11-01

### Fixed

- Route area-schematic labels around equipment, boundary cards and other stream labels; make inter-area stream identity explicit.
- Keep diagrams readable on narrow screens with a keyboard-accessible horizontal canvas and a visible scroll hint, without page-level horizontal overflow.
- Replace unexplained missing-value marks in the 3D scene with localized observation states and separate asset labels from values.
- Localize stream material names in Spanish area schematics and flow lists; increase boundary-port label sizes.
- Add English/Spanish geometry and 2D-area-to-detail browser checks for all nine areas.

## [0.02.000] - 2026-11-01

### Added

- Replace the case-first workspace with a global mine-to-plant overview and independent detail views for all nine required process areas.
- Add separate 2D spatial plans, area-specific process schematics, scoped 3D geometry, explicit inter-area connectors and water-route summaries.
- Synchronize area, compatible equipment, view and replay state in deep links; preserve synthetic/live provenance and CAOS engine evidence.
- Add SDD/TDD requirements, area graph ownership checks, browser interaction review and visual reference findings.

### Changed

- Rename the product to CAOS Mineral Plant Explorer; keep existing gateway and artifact identifiers compatible.
- Correct equipment-area ownership and make scoped 3D inspection frame the selected area's equipment while retaining boundary flows.

### Fixed

- Prevent the detail inspector from opening on an asset outside the selected area.
- Fix clipped area content and area-schematic hook ordering.

## [0.01.001] - 2026-11-01

- Add an independently checked, trained causal ridge family with its own checkpoint and paired held-out comparison.
- Preserve the original eight-method published study; identify the additional evaluation as a post-publication extension on reused test seeds.

## [0.01.000], 2026-10-31

### Added

- Instantiated from CAOS_PRODUCT_TEMPLATE 0.14.001: the pipeline, the two contracts, the lanes, the
  workbench on the shared shell, the six routes, the guards and the measured gate.
