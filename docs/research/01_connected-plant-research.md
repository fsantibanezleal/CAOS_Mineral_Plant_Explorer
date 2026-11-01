# Connected plant research and model choices

Research checked2026-10-31 against primary standards, maintained documentation and original method publications. The product question is how to keep geometry, process topology, instrument meaning and model evidence synchronized. It is separate from rebuilding every CAOS process engine inside a new application.

## Existing systems and exchange standards

| Source | Relevant established capability | OreBridge implementation boundary |
|---|---|---|
| [Azure3D Scenes](https://learn.microsoft.com/en-us/azure/digital-twins/how-to-use-3d-scenes-studio) | Binds scene elements, entities and data-driven behaviors | 3D/data binding is established prior art; this application tests its own stable-ID snapshot behavior. |
| [AWS TwinMaker scenes and graph](https://docs.aws.amazon.com/iot-twinmaker/latest/guide/tm-knowledge-graph-scene.html) | Connects entities, knowledge graph and scene context | The authored asset graph supports traceable local context; no cloud-platform parity or superiority is inferred. |
| [OPC UA Mining General1.01](https://reference.opcfoundation.org/specs/OPC-40560/full) | Domain-oriented mining information definitions | Stable semantic tags are implemented, without claiming full companion-spec conformance. |
| [OPC UA DataValue](https://reference.opcfoundation.org/specs/OPC-10000-4/7.11) | Distinguishes status, source-change and server-confirmation times | Both times and the explicit freshness policy are retained; a constant value is not automatically stale. |
| [OPC UA security](https://reference.opcfoundation.org/specs/OPC-10000-2/full) | Separates secure transport, trust and application authorization | Remote reads require signed encrypted transport and server certificate; no write/control route exists. |
| [DEXPI specifications](https://dexpi.org/specifications/) | Structured plant/process engineering exchange | The bounded graph is not DEXPI import/export or conformance. |
| [IDTA submodels](https://industrialdigitaltwin.org/en/content-hub/submodels) | Reusable semantic descriptions | No Asset Administration Shell compliance claim is made. |
| [ISA95](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | Equipment and enterprise-control information context | The scene is contextual information, not a manufacturing execution or control system. |
| [Khronos glTF2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) | Hierarchical geometry nodes and application extras | extras.assetId binds geometry to graph equipment; imported world transforms drive labels and pipes. |

These sources motivate identity and time boundaries. Vendor documentation establishes existing features; it is not an independent performance comparison. A source hash verifies exact bytes, not the applicability of its process model to an operating asset.

## Numerical models actually implemented

[Sadeghi, Hodouin and Bazin2018](https://doi.org/10.1016/j.mineng.2018.04.023) motivates constrained mineral-processing reconciliation. The implemented example uses eleven homogeneous solids/water factors, not that publication's full mineralogical formulation. WLS is checked against an independent constrained solution. [Huber1964](https://doi.org/10.1214/aoms/1177703732) supplies the robust loss; an independent optimizer checks objectives rather than accepting convergence as proof of fault localization.

The actual learned comparison uses maintained [HistGradientBoostingRegressor1.9.1](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingRegressor.html), one estimator per channel with four causal lags. [GDN](https://arxiv.org/abs/2106.06947) and [GST-Pro](https://arxiv.org/abs/2401.05800) are relevant graph/time-series prior work. They are not executed comparators. A current library or a familiar citation does not make this a globally best detector.

TASC tests robust projection with causal alignment and a fixed dry-solids relation anchored to one OreFlow reference. It does not dynamically fuse all fourteen visual engine outputs. The complete batch requires accepted frames; a reusable single-row function also exposes algebraic factor membership and conservative missing-input admission. Neither produces validated physical root causes. Dynamic inventory inference is outside the benchmark.

The downstream references use conservative1D hindered settling, shrinking-core conversion averaged over CSTR residence, acid-limited dissolution, two ideal fresh-organic crosscurrent SX contacts and copper-capped Faraday deposition. [Clarification/thickening context](https://doi.org/10.1016/0043-1354(91)90066-Y), [reaction/diffusion context](https://pubs.acs.org/doi/abs/10.1021/acs.iecr.2c04118) and [electrowinning practice](https://pressbooks.bccampus.ca/hydrometallurgy/chapter/copper-electrowinning-practice/) motivate equations and exclusions. The implemented model is not a replication of a full industrial thickener, reactive heap or countercurrent solvent plant.

## Falsification and independent recomputation

Twelve families, sixteen held-out seeds and four severity slots give768 protocol scenarios and6144 method cells. Noise is fixed at1. Magnitude-bearing disturbances change with severity; healthy/delay controls and known quality-rejection cases repeat at those slots. Complete seed blocks remain together in5000 paired resamples, so those dependent cases are not treated as independent observations.

The causal predictor reaches0.8399375 recall, TASC0.3419063 and its no-topology ablation0.5190938. The topology result is negative under this experiment. Complete-frame methods also lose more numerical coverage than per-target methods. The source-valid subset preserves the unfavorable recall ordering. These results do not estimate field detection, maintenance savings or safety.

The independent scientific review reproduced all four package digests, all ten pinned public artifacts,48 constrained Huber comparisons and every aggregate count. It identified and then rechecked corrections to input masking, evidence times, latency, coverage, geometry anchors, timestamp policy and grid resolution. The640-cell default settling endpoint differs0.7562% from2000 at default inputs; other conditions require their own refinement.

## Industrial context and remaining evidence

[Cochilco electricity projections](https://www.cochilco.cl/web/informe-proyeccion-del-consumo-de-energia-electrica-en-la-mineria-del-cobre-periodo-2025-2034-2/) and [water-demand projections](https://www.cochilco.cl/web/https-www-cochilco-cl-web-download-1014-2026-15581-informe-proyeccion-de-la-demanda-de-agua-en-la-mineria-del-cobre-en-chile-periodo-2025-2034-pdf/) establish current energy/water pressure in Chilean copper mining. They do not quantify a benefit from this visualization. An asset-linked model can help inspect context, but economic or operational value needs measured use at an actual site.

No historian, survey, production instrument credentials or operator acceptance has been supplied. Site geometry, canonical tag mapping, timestamp policy, delay/uncertainty calibration and held-out operating data are the evidence needed to evaluate field behavior. The working public reference makes those absences visible rather than inventing measurements.
