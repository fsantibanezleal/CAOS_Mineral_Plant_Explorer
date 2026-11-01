import pytest
from pipeline.model.baseline import is_valid_bundle, predict


def test_persistence_baseline_is_honest_and_rejects_missing_history():
    assert predict([[1, 2], [3, 4]]) == [3, 4]
    with pytest.raises(ValueError):
        predict([])
    assert not is_valid_bundle({"schema": "unknown"})
