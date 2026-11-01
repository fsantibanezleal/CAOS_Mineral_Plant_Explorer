# Connected reference-plant cases

All twelve cases share one graph, sixteen channels and a common declared transport model. They are authored synthetic examples, not different isolated process calculators. Noise scale remains1; severity and held-out seed vary.

| Case | Family | Question/context | Category |
|---|---|---|---|
| [PL-01](PL-01.md) | healthy | Operating load change | controls |
| [PL-02](PL-02.md) | bias | Flotation feed bias | process |
| [PL-03](PL-03.md) | drift | Cyclone flow drift | process |
| [PL-04](PL-04.md) | frozen | Frozen mill observation | data-quality |
| [PL-05](PL-05.md) | unit | Incompatible water unit | data-quality |
| [PL-06](PL-06.md) | mapping | Wrong equipment binding | data-quality |
| [PL-07](PL-07.md) | missing | Missing water observation | data-quality |
| [PL-08](PL-08.md) | ordering | Out-of-order cyclone data | data-quality |
| [PL-09](PL-09.md) | imbalance | Concentrate balance break | process |
| [PL-10](PL-10.md) | engine | Changed recovery relation | model-mismatch |
| [PL-11](PL-11.md) | water | Return-water discrepancy | process |
| [PL-12](PL-12.md) | delay | Unmodeled transport delay | controls |

Quality-rejection families emulate a known ingestion decision. Healthy load and delay controls have no sensor-fault label. A changed recovery relation is a real modeled process change, not a claim of a broken instrument. The full benchmark retains null ratios, refusals and negative comparisons.
