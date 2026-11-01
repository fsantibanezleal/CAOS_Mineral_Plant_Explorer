import pytest
from pipeline.model.observations import canonical, validate_observation

B = {"asset_id": "SAG", "tag_id": "feed", "unit": "t/h", "minimum": 0, "maximum": 2000}
R = {
    "asset_id": "SAG",
    "tag_id": "feed",
    "value": 100,
    "unit": "kg/s",
    "source_time": "2026-10-31T12:00:00Z",
    "receipt_time": "2026-10-31T12:00:01Z",
    "sequence": 10,
    "quality": "good",
}


def test_mass_flow_conversion_and_boundary():
    assert canonical(100, "kg/s", "t/h") == 360
    assert canonical(50, "%", "fraction") == 0.5
    assert validate_observation(R, B, "2026-10-31T12:00:15Z").value == 360


@pytest.mark.parametrize(
    "patch,state",
    [
        ({"quality": "bad"}, "uncertain"),
        ({"unit": "kW"}, "invalid"),
        ({"value": float("nan")}, "invalid"),
        ({"asset_id": "BAL"}, "unmapped"),
        ({"source_time": "2026-10-31T13:00:00Z"}, "invalid"),
        ({"source_time": "2026-10-31T11:59:00Z"}, "stale"),
    ],
)
def test_adversarial_observation_refusal(patch, state):
    verdict = validate_observation({**R, **patch}, B, "2026-10-31T12:00:02Z")
    assert not verdict.accepted and verdict.value is None and verdict.state == state


def test_adversarial_older_sequence_does_not_replace_state():
    v = validate_observation({**R, "sequence": 9}, B, "2026-10-31T12:00:02Z", previous=R)
    assert v.state == "out_of_order"
