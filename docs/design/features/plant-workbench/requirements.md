# Connected plant workbench

The graph, scene and diagram share one selected asset and replay position. Source provenance is part of the display state. The public build starts paused on a synthetic case.

| ID | statement | gate |
|---|---|---|
| WB-101 | WHEN an asset is selected the scene, diagram, evidence and trend SHALL use its stable graph identity. | `frontend/src/workbench/model.test.ts` |
| WB-102 | WHEN a source is absent, stale or malformed the display SHALL expose unavailable values and SHALL refuse a healthy state. | `frontend/src/workbench/model.test.ts` |
| WB-103 | WHEN a glTF scene is imported it SHALL reject external resources, unknown asset identities and excessive geometry before binding. | `frontend/src/workbench/scene.test.ts` |
| WB-104 | The app SHALL provide language, keyboard asset selection, timeline and Focus controls on desktop and phone. | `frontend/scripts/check-plant-ui.mjs` |

