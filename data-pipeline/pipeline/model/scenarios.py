"""Connected, known-truth observation scenarios with causal transport delays.

Clean signals are an authored transport process anchored to an actual OreFlow
reference operating point. They are synthetic, not an independently calibrated
plant. Inference never receives latent truth or injected-fault labels.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

CHANNELS = [
    ("ROM.feed", "ROM", "Fresh ore feed", "Alimentación fresca", "t/h", 720.0, 0),
    ("CR1.product", "CR1", "Crusher product", "Producto del chancador", "t/h", 720.0, 1),
    ("SAG.feed", "SAG", "Combined grinding-circuit feed", "Alimentación total de molienda", "t/h", 2520.0, 3),
    ("CY1.feed", "CY1", "Cyclone feed", "Alimentación a ciclones", "t/h", 2520.0, 4),
    ("CY1.recycle", "CY1", "Cyclone underflow", "Descarga de ciclones", "t/h", 1800.0, 7),
    ("FL1.feed", "FL1", "Flotation dry solids", "Sólidos secos a flotación", "t/h", 720.0, 8),
    (
        "FL1.concentrate",
        "FL1",
        "Concentrate dry solids",
        "Sólidos secos de concentrado",
        "t/h",
        18.5991410176,
        10,
    ),
    ("FL1.tailings", "FL1", "Tailings dry solids", "Sólidos secos de relaves", "t/h", 701.4008589824, 12),
    (
        "CTH.feed",
        "CTH",
        "Concentrate thickener feed",
        "Alimentación al espesador de concentrado",
        "t/h",
        18.5991410176,
        13,
    ),
    (
        "CTH.underflow",
        "CTH",
        "Concentrate solids out",
        "Salida de sólidos del concentrado",
        "t/h",
        18.5991410176,
        14,
    ),
    (
        "TTH.feed",
        "TTH",
        "Tailings thickener feed",
        "Alimentación al espesador de relaves",
        "t/h",
        701.4008589824,
        13,
    ),
    (
        "TTH.underflow",
        "TTH",
        "Tailings solids out",
        "Salida de sólidos del relave",
        "t/h",
        701.4008589824,
        14,
    ),
    ("MWT.flow", "MWT", "Make-up water", "Agua de reposición", "m3/h", 150.0, 0),
    ("PU2.flow", "PU2", "Return water", "Agua recuperada", "m3/h", 265.0, 4),
    ("PWT.in", "PWT", "Water tank inflow", "Entrada de agua al estanque", "m3/h", 415.0, 5),
    ("PWT.out", "PWT", "Water tank outflow", "Salida de agua del estanque", "m3/h", 415.0, 5),
]
from ..cases.definitions import FAMILIES


def channel_specs():
    return [
        {
            "id": i,
            "asset_id": a,
            "label": {"en": en, "es": es},
            "unit": u,
            "nominal": v,
            "delay_s": d,
            "sigma": max(0.01 * v, 0.1),
        }
        for i, a, en, es, u, v, d in CHANNELS
    ]


def conservation_matrix():
    A = np.zeros((11, 16))
    for row, terms in enumerate(
        [
            [(0, 1), (1, -1)],
            [(1, 1), (4, 1), (2, -1)],
            [(2, 1), (3, -1)],
            [(3, 1), (4, -1), (5, -1)],
            [(5, 1), (6, -1), (7, -1)],
            [(6, 1), (8, -1)],
            [(8, 1), (9, -1)],
            [(7, 1), (10, -1)],
            [(10, 1), (11, -1)],
            [(12, 1), (13, 1), (14, -1)],
            [(14, 1), (15, -1)],
        ]
    ):
        for col, value in terms:
            A[row, col] = value
    return A


@dataclass
class Scenario:
    family: str
    seed: int
    severity: float
    truth: np.ndarray
    observed: np.ndarray
    fault: np.ndarray
    valid: np.ndarray
    reasons: dict[int, str]
    source_load: np.ndarray


def generate(family="healthy", seed=7, severity=1.0, steps=160, noise=1.0) -> Scenario:
    if family not in {f[0] for f in FAMILIES} or steps < 100 or severity <= 0 or noise < 0:
        raise ValueError("unsupported scenario domain")
    rng = np.random.default_rng(seed)
    t = np.arange(steps)
    # Hold the same source load for long enough that a finite transport model is meaningful.
    load = np.full(steps + 20, float(rng.uniform(0.87, 1.08)))
    for k in range(35, len(load), 35):
        load[k:] = rng.uniform(0.85, 1.15)
    load += 0.012 * np.sin(np.arange(len(load)) / 12 + seed)
    baseline = np.array([c[5] for c in CHANNELS])
    delays = np.array([c[6] for c in CHANNELS])
    truth = np.column_stack([baseline[j] * load[t + 20 - delays[j]] for j in range(16)])
    sigma = np.maximum(baseline * 0.01, 0.1)
    y = truth + rng.normal(size=truth.shape) * sigma * noise
    mask = (t >= 65) & (t < 115)
    fault = np.zeros_like(y, dtype=bool)
    valid = np.ones_like(fault)
    reasons = {}
    if family == "bias":
        y[mask, 5] += sigma[5] * 4 * severity
        fault[mask, 5] = True
    elif family == "drift":
        y[mask, 3] += np.linspace(0, 8 * severity, mask.sum()) * sigma[3]
        fault[mask, 3] = True
    elif family == "frozen":
        y[mask, 2] = y[64, 2]
        valid[mask, 2] = False
        fault[mask, 2] = True
        reasons[2] = "stale source timestamp"
    elif family == "unit":
        y[mask, 13] *= 3.6
        valid[mask, 13] = False
        fault[mask, 13] = True
        reasons[13] = "incompatible source unit"
    elif family == "mapping":
        y[mask, 6] = y[mask, 11]
        valid[mask, 6] = False
        fault[mask, 6] = True
        reasons[6] = "tag-to-asset mismatch"
    elif family == "missing":
        y[mask, 14] = np.nan
        valid[mask, 14] = False
        fault[mask, 14] = True
        reasons[14] = "missing observation"
    elif family == "ordering":
        valid[mask, 3] = False
        fault[mask, 3] = True
        reasons[3] = "out-of-order sequence"
    elif family == "imbalance":
        y[mask, 8] *= 1 + 0.12 * severity
        fault[mask, 8] = True
    elif family == "engine":
        # A balanced process change can invalidate the fixed engine relation: test model drift,
        # not a sensor fault. Labels retain this distinct category.
        change = truth[mask, 6] * 0.2 * severity
        for j in [6, 8, 9]:
            y[mask, j] += change
            fault[mask, j] = True
        for j in [7, 10, 11]:
            y[mask, j] -= change
            fault[mask, j] = True
    elif family == "water":
        y[mask, 13] *= 1 + 0.1 * severity
        fault[mask, 13] = True
    elif family == "delay":
        # This is a negative control for misspecified timing. There is no sensor fault.
        for j in [6, 7, 8, 9, 10, 11]:
            y[mask, j] = truth[np.maximum(t[mask] - 8, 0), j] + rng.normal(size=mask.sum()) * sigma[j] * noise
    return Scenario(family, seed, severity, truth, y, fault, valid, reasons, load[20:])


def align(values, delays=None):
    """Causally align material-parcel time. The first max-delay rows are unavailable."""
    values = np.asarray(values)
    delays = np.array([c[6] for c in CHANNELS]) if delays is None else np.asarray(delays, int)
    if len(delays) != values.shape[1] or np.any(delays < 0):
        raise ValueError("invalid transport delays")
    maximum = int(max(delays))
    out = np.full(
        values.shape, np.nan if values.dtype != bool else False, dtype=float if values.dtype != bool else bool
    )
    for j, delay in enumerate(delays):
        lag = maximum - int(delay)
        if lag:
            out[lag:, j] = values[:-lag, j]
        else:
            out[:, j] = values[:, j]
    out[:maximum] = np.nan if out.dtype != bool else False
    return out


def engine_prior(aligned_observations):
    """Only an observed upstream feed drives the engine ratio prior, never clean truth."""
    y = np.asarray(aligned_observations)
    base = np.array([c[5] for c in CHANNELS])
    prior = y[:, 0, None] / base[0] * base[None, :]
    # Water is not inferred from a dry-solids model. Its prior is unavailable.
    covered = np.ones_like(y, bool)
    covered[:, 12:] = False
    return prior, covered
