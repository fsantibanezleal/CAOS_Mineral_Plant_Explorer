"""Honest persistence baseline for the normal-state predictor capability."""

import math


def predict(history):
    if not history or not history[-1] or any(not math.isfinite(v) for v in history[-1]):
        raise ValueError("no finite past observation")
    return list(history[-1])


def is_valid_bundle(obj):
    return (
        isinstance(obj, dict)
        and obj.get("schema") == "orebridge.state-model/v1"
        and len(obj.get("checkpoint_sha256", "")) == 64
        and bool(obj.get("train_seeds"))
        and bool(obj.get("calibration_seeds"))
    )
