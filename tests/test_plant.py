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
