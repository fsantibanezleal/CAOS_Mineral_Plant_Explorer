# Software design: CAOS Mineral Plant Explorer workbench

Status: required product design, 2026-11-01. This specification supersedes the former single-global-diagram behavior. Implementation acceptance is defined by [plant-workbench-tdd.md](plant-workbench-tdd.md). Research findings are in [visual-reference-review.md](visual-reference-review.md).

## 1. Product goal

Build one connected mineral-plant application. Operators and engineers start from a global mine-to-plant overview, open an area to see its own detailed process diagram, and move among 2D process schematic, 3D spatial view and data/evidence views without losing asset identity, time, source or provenance.

The product is an observation and engineering workspace. It does not write setpoints or control equipment. Public data is synthetic; a live-site claim is allowed only after a real read-only source is configured and validated.

## 2. Required view hierarchy

1. **Global overview:** complete mine-to-plant flow, major area boundaries, principal solids/solution/water/energy paths, current summary state, alarms/unavailable status, and clear selectable area targets.
2. **Area detail:** a distinct layout and bounded asset/stream set per selected area. It includes local recirculation, selected internal assets, important incoming/outgoing boundaries and labeled links to connected areas. It must not be a crop, highlight, or relabel of the same global graph.
3. **Equipment detail:** selected asset identity, description, bound observations, units, status, time/source quality, connected streams, engine contributions and related trends.

Required areas:

| Area ID | Display scope |
|---|---|
| `mine-extraction` | Pit/source, shovel and haul route into ROM |
| `crushing-stockpiling` | ROM, primary/secondary crushing, screen and feed transfer |
| `grinding` | Feed bin, SAG/ball mills, drive, cyclone pump/cluster, recirculating load and flotation feed |
| `flotation` | Rougher/cleaner banks, regrind, concentrate and tailings outlets |
| `leach-sx-ew` | Heap/tank leach, PLS/raffinate, SX/stripping, EW and cathode product |
| `thickening-filtration` | Concentrate and tailings thickeners, filter, solids outlets and reclaim-water boundaries |
| `water-balance` | Fresh/make-up, process-water storage, distribution, reclaim, water carried by slurry/solution and declared external boundaries |
| `tailings` | Tailings thickener, TSF and observation context; no geotechnical safety inference |
| `utilities` | Acid supply, return/process-water pumps and tank, electrical supply |

Mining extraction and hydrometallurgical extraction (leaching/SX-EW) are separate, navigable areas.

## 3. Three synchronized representations

- **2D site plan:** top-down spatial arrangement of mine/plant areas, equipment footprints, buildings/roads where authored and the physical locations of shared services. It is spatial context, not a process-flow drawing.
- **3D spatial view:** global scene or area-focused scene using legible, proportionate equipment forms and plant context bound by stable IDs. The global camera frames the full mine-to-plant extent without a dominant empty grid. Area selection frames the area's equipment and relevant boundaries; unrelated geometry is hidden or clearly de-emphasized. Equipment must be recognizable at its area camera scale.
- **Process schematic:** a separate process-engineering representation with equipment symbols by kind, directed/routed lines encoding stream family and direction, stream labels with quantity/unit when valid, instrumentation/data points where bound, and named off-page connectors between areas. It is not the site plan or the simplified global topology graph.
- **Data and evidence:** trends, replay, observation quality and engine evidence share the same plant snapshot.
- One `PlantViewState` owns `areaId`, `viewMode`, `assetId`, `timeCursor`, `sourceId` and selected data layer. URL state supports direct links and browser back/forward.
- The global overview and every required area are available in all three representations. Switching mode preserves selected area, time and asset when that asset exists in the target area. The same generic node/edge SVG cannot stand in for all three modes.

## 4. Information architecture and area content

- The workbench opens on a useful global operational overview, not a scientific case selector. Case/replay/method controls are secondary and remain available without dominating the plant view.
- Global overview shows named areas, process direction, current source/time, known unavailable/alarm state and a small set of source-supported indicators. Every indicator identifies its unit and whether it is live, synthetic replay, authored nominal or engine evidence.
- Each area detail has: (1) concise area purpose and boundary, (2) incoming/outgoing stream values and units, (3) asset-level state/observations with source age, (4) relevant CAOS engine evidence linked to the assets/streams, and (5) related time trends. Hide a metric if no valid source supports it; show explicit “no data” instead of fabricating one.
- Each area detail includes a process-reading guide specific to its circuit: ordered route, engineering checks that help interpret the displayed graph, boundary/evidence limits, and a clear statement of whether values are synthetic, authored reference, engine output or site observations. Guides must be bilingual, graph-consistent and must not imply that general engineering checks are alarms, recommendations or site-specific diagnoses.
- On global plan/overview, hovering or keyboard-focusing an area gives an information preview: area purpose, source/time, status and only supported key input/output flows. Activating an area from the global overview opens its detailed process page. Activating an area from the 2D plan or 3D view keeps that representation active and replaces the global composition with the selected area's spatial view. Area identity, URL, equipment list and selected asset update together.
- Required informational coverage includes mine/extraction throughput; crushing/grinding feed and recycle; flotation feed, concentrate and tailings; leach solution, SX/EW outputs; concentrate/tailings thickener and filtration solids/water; water make-up, process demand, reclaim and external balance boundaries; tailings and utilities context. Every displayed number must resolve to an observation, graph stream, model output or engine artifact.
- Selecting an area changes its diagram, 3D framing, area summary, stream set, equipment list, trends and engine-evidence set together. Selection is not only a highlight or a global panel filter.

- Focus mode is a clean visualization layout: retain only the shell exit/language/theme affordances, use the full stage for the active 2D/3D/schematic view, remove the normal inspector and duplicate parameter rail, and hide repeated headings around the drawing.
## 5. Visual and interaction quality

- Use a purpose-built, consistent symbol set for mine assets, crushers/screens, mills/cyclones, flotation cells, tanks/heaps, SX/EW, thickeners/filters, pumps, conveyors and utilities. Each class has a recognizable silhouette, connection ports and a selected/status treatment. Generic rounded rectangles with equipment IDs are not process equipment symbols.
- Give the global view a composed mine-to-plant layout with visually distinct process areas, directional process paths, a clear solids route and separate water/solution/utility circuits. Line routing must avoid label collisions and minimize crossings; use boundary connectors for long or cross-area routes.
- Give every area detail its own composed layout. The main path, recirculation paths, feed/product/tailings, instrument or engine evidence and off-page boundaries must be distinguishable without zooming into a miniature global graph.
- Use a consistent visual grammar: neutral equipment; separate stream-family color and dash/weight; status shown as a separate badge/outline/shape; visible value, unit, source and age. Color is never the only encoding. Do not use one status color to encode both material class and health.
- At 1440×900 and 390×844, fit-to-view must show the area name, whole useful diagram, legend, selected asset and source/status summary. Labels must not collide with symbols, edges or values. Provide zoom/pan, fit view, persistent legend and accessible asset hit targets.
- The 3D global view composes the whole plant with visible area boundaries. Each area selection hides unrelated geometry or de-emphasizes it and fits the camera to the selected equipment plus declared boundaries. Per-area 3D is not the global scene with a single object highlighted.
- Motion is restrained and data-driven: replay/live flow indicators communicate valid moving state; animation uses the direction and rate of a valid selected stream when those data exist. No ambient spinning/bouncing, decorative equipment spin, constant pulsing of every edge or movement while paused. `prefers-reduced-motion` disables nonessential movement.
- Normal, warning/alarm, stale, invalid and unavailable states use color plus labels/shapes; missing data never appears as zero or healthy.
- Keep 2D symbols, 3D objects, streams, inspector, trends and engine artifacts joined by the same graph IDs.
- Visual approval requires direct review of desktop and phone captures for global and area views. Geometry checks are necessary but do not prove composition quality; screenshots must be checked for readable values, coherent routing, balanced density, sensible camera framing and distinct visual languages for plan, schematic and 3D.

## 6. Data and CAOS integrations

- `PlantGraph`: stable asset/stream/area IDs, typed process family, directed endpoints, physical quantity/unit, geometry, diagram layout, boundaries and provenance.
- `Observation`: stable tag/asset ID, value or explicit absence, canonical unit, quality, UTC source/receipt timestamps, sequence and source ID.
- `EngineManifest`: product/engine ID, semantic version, artifact/source hash, capability, input/output schema, asset/stream bindings, units and evidence class.
- Adapters expose compatible CAOS engine outputs through one normalized evidence boundary. An adapter can use an existing released artifact or a configured read-only product endpoint. Unavailable/incompatible engines remain explicit; no synthetic data is presented as a running engine or a field measurement.
- The public replay uses committed compact, hash-verified evidence. Site connections are optional and read-only. Credentials remain in memory or a protected backend, never in public artifacts/URLs.
- Water-balance views classify external inputs/outputs separately from internal recycle and show declared balance boundaries. Compute closure only from complete compatible values.

## 7. Non-goals and acceptance boundary

- No plant write/control path, automatic diagnosis claim, as-built geometry claim, geotechnical safety claim or measured benefit claim.
- No reproduction of PlantCraft's appearance or proprietary content. The reference informs navigation and behavior only.
- A successful local build or HTTP response is not deployed acceptance. The canonical HTTPS site must present a valid certificate, verified build identity, working app routes, and area-specific behavior over the deployed browser.

