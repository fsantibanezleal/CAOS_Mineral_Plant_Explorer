# Visual product review: CAOS Mineral Plant Explorer

Initial review: 2026-11-01. The published app was inspected over its working HTTP endpoint. This was the as-published 0.01.001 baseline on `main`, not the local 0.02.000 redesign. During that initial check HTTPS failed certificate validation, so the public deployment was not accepted as operational at that time.

Delivery recheck: 2026-11-01. The canonical HTTPS endpoint now returns `200 OK` with a valid certificate after the Pages certificate was repaired. The live `build.json` still reports `0.01.001` at `9f69e175150e8c934ee778d17cbb2ea875b5883e`; the redesigned build remains pending promotion.

### Public delivery evidence from the initial review

- DNS resolves `orebridge.fasl-work.com` as a CNAME to `fsantibanezleal.github.io`, which resolves to GitHub Pages addresses.
- The HTTP app route returns `200`, but `build.json` reports `0.01.001` at `9f69e175150e8c934ee778d17cbb2ea875b5883e`, so the redesign is not live.
- HTTPS fails hostname certificate validation with `SEC_E_WRONG_PRINCIPAL`. The Pages project URL redirects back to the custom domain over HTTP. Neither response satisfies the HTTPS acceptance gate.
- The PlantCraft and other repository reviews inform interaction patterns and data boundaries only. No source code, symbols, screenshots or assets are copied from those projects.

## Current product findings

- The default workbench opens the global 3D plant. Its process diagram renders the entire authored graph: 36 assets and 47 streams.
- Selecting FL1 changes the selected-asset panel and highlights FL1. It does not change the diagram's asset or stream set. There is no process-area navigator or distinct area schematic.
- The 2D view uses one fixed graph layout and generic rounded rectangles with asset IDs. It does not offer unit-specific process layouts or process equipment symbols.
- The 3D view is one full-plant scene. Asset selection changes highlighting; it does not select an area-specific scene.
- The workbench starts in synthetic replay. A read-only gateway may be configured, but no real plant endpoint or site observations are supplied in the public build.
- Engine evidence is a versioned, precomputed artifact collection. The workbench does not discover or subscribe to a fleet of CAOS engines at runtime.
- The authored graph already distinguishes extraction, stockpiling, crushing, grinding, flotation, leaching, refining, thickening, tailings and utilities. Water-bearing contributions use `water_m3_h`; not every water-bearing edge has `material: water`.

## Reference review and decisions

| Reference | Observed capability | Decision for this product |
|---|---|---|
| [PlantCraft](https://github.com/PlantCraft/PlantCraft), `apps/view/docs/help/diagrams.md` | A plant overview opens a separate page per unit/area. Off-page links connect pages; the same equipment identity supports live values, historical playback and asset inspection. The viewer is read-only. | Primary behavioral reference: global overview plus independent area detail; stable IDs and explicit navigation. Use our own industrial visual system, process layout and symbols. Do not reproduce PlantCraft's brand, UI, assets or implementation. Reviewed repository commit `2508777ce7b7a17315bd2f5d53cfb51cd4146a95`. |
| [PlantCraft View diagram implementation](https://github.com/PlantCraft/PlantCraft/tree/2508777ce7b7a17315bd2f5d53cfb51cd4146a95/apps/view) | Separate diagram pages, named process/utility/signal lines, a symbol library, value bindings, current values and playback. | Area pages must contain real, area-scoped symbols and streams. Crossing edges need labeled page connectors rather than shrinking the entire plant onto one canvas. |
| [ISA-101 series](https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards) | HMI display structure, navigation, dynamic elements, alarm and color conventions are part of the lifecycle, not decoration. | Keep a clear overview-to-unit hierarchy, stable legends, visible unknown/stale state and keyboard-accessible navigation. This app is observational and read-only. |
| [Grafana Scenes](https://grafana.com/developers/scenes) | Interactive app scenes support layouts, shared time ranges, variables, tabs and drill-down pages. | Keep selected area, replay time, source and selected asset as shared state across views. Use existing React/Three stack rather than adding Grafana as a runtime dependency. |
| [Eclipse Ditto connections](https://eclipse.dev/ditto/basic-connections.html) | A twin platform can consume and route data through multiple protocol connections, with source/target mappings. | Use a connector boundary with explicit protocol, identity, units, freshness, quality and provenance; never bind an arbitrary endpoint directly to a drawing. |
| [SCADA water-treatment example](https://github.com/Grodondo/SCADA-simulation-water-treatment-plant) | An open-source prototype combines an SVG process view and live/simulated process data. | Useful implementation comparison for a data-bound process schematic; not a quality, safety or operational conformance oracle. |
| [AxiomPlant](https://github.com/wieslawsoltes/AxiomPlant) | A 3D plant-design workspace derives drawings from a model and emphasizes model identity. | Keep geometry identity and diagram identity linked. It is a design/CAD reference, not a live operations HMI reference. |

## Data and integration boundary

The plant graph is synthetic reference data, not a surveyed or commissioned plant. Live display is enabled only for an explicitly configured read-only source. The source contract must preserve stable asset/tag identity, engineering unit, source and receipt times, quality, sequence, source name and version. Missing or invalid data remains visibly unavailable.

CAOS engine products are consumed through a versioned engine manifest and artifact adapter. Each contribution is bound to plant assets/streams and carries its source product, engine ID/version, artifact hash, units and evidence class. The browser does not silently execute arbitrary engine packages, merge incompatible units, or relabel external case data as this plant's live measurement. Existing engine-evidence artifacts remain one adapter input. New product adapters can be added without changing diagram components.

For water balance, the view uses the authored `water_m3_h` contribution on all water-bearing streams, including slurry/solution streams. It shows measured/reference/unavailable provenance per value. It reports closure only when a compatible balance model supplies a valid, declared boundary set; it never sums internal recirculation as external water input.

