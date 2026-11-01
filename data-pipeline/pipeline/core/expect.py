"""Named physical bounds; non-finite values can never pass."""

import math


class ExpectationError(ValueError):
    pass


def check(case_id, expect, result):
    if not expect:
        raise ExpectationError(f"{case_id}: no expected range")
    for name, (lo, hi) in expect.items():
        if name not in result:
            raise ExpectationError(f"unknown expected metric {name!r}")
        value = result[name]
        if not math.isfinite(value) or lo > hi or not lo <= value <= hi:
            raise ExpectationError(f"{case_id}: {name}={value:.6g} outside [{lo}, {hi}]")
    return {k: list(v) for k, v in expect.items()}
