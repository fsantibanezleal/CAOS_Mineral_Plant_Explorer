"""Time, identity, quality and engineering-unit validation before state fusion."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, datetime

UNITS = {
    "t/h": ("mass_flow", 1.0),
    "kg/s": ("mass_flow", 3.6),
    "m3/h": ("volume_flow", 1.0),
    "L/s": ("volume_flow", 3.6),
    "kW": ("power", 1.0),
    "MW": ("power", 1000.0),
    "rpm": ("speed", 1.0),
    "%": ("fraction", 0.01),
    "fraction": ("fraction", 1.0),
    "m": ("length", 1.0),
    "mm": ("length", 0.001),
    "degC": ("temperature", 1.0),
    "g/L": ("concentration", 1.0),
    "mg/L": ("concentration", 0.001),
}


def canonical(value: float, unit: str, target: str) -> float:
    if unit not in UNITS or target not in UNITS or UNITS[unit][0] != UNITS[target][0]:
        raise ValueError(f"incompatible units: {unit} -> {target}")
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("non-finite observation")
    return value * UNITS[unit][1] / UNITS[target][1]


def utc_time(value: str) -> datetime:
    value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if value.tzinfo is None:
        raise ValueError("source timestamp must have timezone")
    return value.astimezone(UTC)


@dataclass(frozen=True)
class ObservationVerdict:
    accepted: bool
    state: str
    value: float | None
    reasons: tuple[str, ...]
    age_s: float | None


def validate_observation(
    record: dict,
    binding: dict,
    now: str,
    previous: dict | None = None,
    max_age_s: float = 15,
    future_tolerance_s: float = 2,
) -> ObservationVerdict:
    try:
        current = utc_time(now)
        source = utc_time(record["source_time"])
        receipt = utc_time(record["receipt_time"])
        age = (current - source).total_seconds()
        if record["tag_id"] != binding["tag_id"] or record["asset_id"] != binding["asset_id"]:
            return ObservationVerdict(False, "unmapped", None, ("asset_identity_mismatch",), age)
        if source > receipt and (source - receipt).total_seconds() > future_tolerance_s:
            return ObservationVerdict(False, "invalid", None, ("source_after_receipt",), age)
        if age < -future_tolerance_s:
            return ObservationVerdict(False, "invalid", None, ("future_source_time",), age)
        if record.get("quality") != "good":
            return ObservationVerdict(False, "uncertain", None, ("source_quality_not_good",), age)
        if previous and (
            record["sequence"] <= previous["sequence"] or source < utc_time(previous["source_time"])
        ):
            return ObservationVerdict(False, "out_of_order", None, ("older_sequence_or_time",), age)
        if age > max_age_s:
            return ObservationVerdict(False, "stale", None, ("source_age_exceeded",), age)
        value = canonical(record["value"], record["unit"], binding["unit"])
        if binding.get("minimum") is not None and value < binding["minimum"]:
            return ObservationVerdict(False, "invalid", None, ("below_engineering_domain",), age)
        if binding.get("maximum") is not None and value > binding["maximum"]:
            return ObservationVerdict(False, "invalid", None, ("above_engineering_domain",), age)
        return ObservationVerdict(True, "good", value, (), age)
    except (KeyError, ValueError, TypeError, OverflowError) as exc:
        return ObservationVerdict(False, "invalid", None, (str(exc),), None)
