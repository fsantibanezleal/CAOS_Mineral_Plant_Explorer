import numpy as np
from pipeline.model.scenarios import generate
from pipeline.stages import plant_evaluate as ev


def test_missed_event_with_late_false_alarm_has_no_detection_latency(monkeypatch):
    truth = np.array([[False], [True], [True], [False], [False]])
    score = np.array([[0], [0], [0], [0], [2.0]])
    monkeypatch.setattr(
        ev,
        "raw_scores",
        lambda *args: {"threshold": {"scores": score, "truth": truth, "valid": np.ones_like(truth)}},
    )
    rows, _, _ = ev.evaluate_one(generate(), {}, {"threshold": np.ones(1)})
    assert rows[0]["numeric"]["tp"] == 0 and rows[0]["detection_delay_s"] is None


def test_scored_coverage_is_exactly_the_confusion_denominator():
    import json
    from pathlib import Path

    report = json.loads(
        (Path(__file__).parents[1] / "data/derived/benchmark.json").read_text(encoding="utf-8")
    )
    for row in report["rows"]:
        assert row["scored_points"] == sum(row["numeric"][k] for k in ("tp", "fp", "fn", "tn"))
        assert row["scored_points"] + row["unscorable_points"] == 146 * 16
        if row["numeric"]["tp"] == 0:
            assert row["detection_delay_s"] is None


def test_process_change_truth_is_current_physical_state():
    for family in ("engine", "delay"):
        s = generate(family, noise=0)
        assert np.array_equal(s.truth, s.observed)


def test_rejected_finite_values_cannot_contaminate_forecast_history(monkeypatch):
    s = generate("unit")
    changed = generate("unit")
    changed.observed[~changed.valid] = 1e20
    # Inspect the actual prepared forecast feature input, before prediction.
    captured = []
    monkeypatch.setattr(
        ev, "forecast_scores", lambda bundle, y: captured.append(y.copy()) or np.zeros_like(y)
    )
    ev.raw_scores(s, {})
    ev.raw_scores(changed, {})
    assert np.array_equal(captured[0], captured[1])
