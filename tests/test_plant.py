from copy import deepcopy

import pytest
from pipeline.model.plant import neighbors, reference_plant, validate_graph


def test_plant_is_connected_and_bilingual():
    g = reference_plant()
    assert len(g["assets"]) >= 35 and len(g["streams"]) >= 40
    assert {
        "crushing",
        "grinding",
        "flotation",
        "thickening",
        "leaching",
        "refining",
        "tailings",
        "extraction",
    } <= {a["stage"] for a in g["assets"]}
    assert "CAT" in neighbors(g, "ROM") and "CON" in neighbors(g, "ROM")
    assert "ROM" in neighbors(g, "FL1", upstream=True)


@pytest.mark.parametrize("failure", ["duplicate", "dangling", "nan"])
def test_adversarial_graph_rejects_bad_identity(failure):
    g = deepcopy(reference_plant())
    if failure == "duplicate":
        g["assets"].append(g["assets"][0])
    elif failure == "dangling":
        g["streams"][0]["target"] = "ABSENT"
    else:
        g["assets"][0]["position"] = [float("nan"), 0, 0]
    with pytest.raises(ValueError):
        validate_graph(g)


def test_nominal_solids_and_carrier_water_close_separately():
    graph = reference_plant()
    closed = [
        "ROM",
        "CV1",
        "CR1",
        "SC1",
        "CR2",
        "BIN",
        "SAG",
        "BAL",
        "PU1",
        "CY1",
        "FL1",
        "FL2",
        "RGM",
        "CTH",
        "FIL",
        "TTH",
    ]
    for asset in closed:
        incoming = sum(e["nominal"] for e in graph["streams"] if e["target"] == asset and e["unit"] == "t/h")
        outgoing = sum(e["nominal"] for e in graph["streams"] if e["source"] == asset and e["unit"] == "t/h")
        assert incoming == pytest.approx(outgoing, abs=1e-8), asset
    for asset in ["SAG", "BAL", "PU1", "CY1", "FL1", "FL2", "RGM", "CTH", "FIL", "TTH", "PU2", "PWT"]:
        incoming = sum(e["water_m3_h"] for e in graph["streams"] if e["target"] == asset)
        outgoing = sum(e["water_m3_h"] for e in graph["streams"] if e["source"] == asset)
        assert incoming == pytest.approx(outgoing, abs=1e-8), asset
