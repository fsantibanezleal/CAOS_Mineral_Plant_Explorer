# Adversarial validation

| requirement | adversarial check | gate |
|---|---|---|
| WB-101 | Plant a cyclic stream graph and switch identity; verify traversal terminates and selection remains exact. | `frontend/src/workbench/model.test.ts::adversarial: keeps traversal bounded despite recirculation` |
| WB-102 | Plant missing values and expired live timestamps; verify neither becomes a healthy zero. | `frontend/src/workbench/model.test.ts::adversarial: keeps source change age separate from server confirmation` |
| WB-103 | Plant external glTF buffers and an unknown asset mapping; verify both are rejected. | `frontend/src/workbench/scene.test.ts::adversarial: external resources and unknown mappings are refused` |
| WB-104 | Exercise a narrow viewport, language switch and Focus return with shared selection retained; local-only: the complete browser toolchain runs during workstation release validation. | `tests/adversarial/test_plant_ui.py::test_adversarial_phone_focus_and_selection` |


