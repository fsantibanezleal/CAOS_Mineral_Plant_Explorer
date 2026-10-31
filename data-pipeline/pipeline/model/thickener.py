"""Conservative finite-volume reference thickener with hindered settling.

This one-dimensional model resolves solids volume fraction and outlet loads.
It excludes floc kinetics, compression and radial flow. Boundary extraction is
explicit, so solids closure is checked without concealing capacity exceedance.
"""

from __future__ import annotations

import numpy as np


def simulate_thickener(
    *,
    feed_m3_h=20.0,
    feed_fraction=0.08,
    underflow_m3_h=8.0,
    area_m2=40.0,
    height_m=6.0,
    settling_m_h=0.8,
    hindrance=4.65,
    hours=2.0,
    cells=40,
    initial_fraction=0.06,
):
    if (
        min(feed_m3_h, underflow_m3_h, area_m2, height_m, hours, settling_m_h) <= 0
        or underflow_m3_h > feed_m3_h
        or not 0 <= feed_fraction < 0.6
        or not 0 <= initial_fraction < 0.6
        or cells < 8
    ):
        raise ValueError("invalid thickener input")
    dz = height_m / cells
    feed_cell = cells // 2
    overflow = feed_m3_h - underflow_m3_h
    phi = np.full(cells, initial_fraction, dtype=float)
    # Positive z is downwards. Feed splits into upward and downward bulk flow.
    bulk = np.where(np.arange(cells - 1) < feed_cell, -overflow / area_m2, underflow_m3_h / area_m2)
    speed = max(overflow, underflow_m3_h) / area_m2 + settling_m_h * (hindrance + 1)
    dt = min(0.4 * dz / speed, hours / 50)
    steps = int(np.ceil(hours / dt))
    dt = hours / steps
    initial = float(phi.sum() * dz * area_m2)
    out_u = out_o = 0.0
    samples = []
    for k in range(steps):
        settling = lambda q: settling_m_h * q * np.maximum(1 - q, 0) ** hindrance
        left, right = phi[:-1], phi[1:]
        flux = 0.5 * (bulk * (left + right) + settling(left) + settling(right)) - 0.5 * speed * (right - left)
        faces = np.empty(cells + 1)
        faces[1:-1] = flux
        faces[0] = -overflow / area_m2 * phi[0]
        faces[-1] = underflow_m3_h / area_m2 * phi[-1]
        phi -= dt / dz * np.diff(faces)
        phi[feed_cell] += dt * feed_m3_h * feed_fraction / (area_m2 * dz)
        out_o -= faces[0] * area_m2 * dt
        out_u += faces[-1] * area_m2 * dt
        if phi.min() < -1e-10 or phi.max() > 0.60:
            raise ValueError("thickener capacity/positivity envelope exceeded")
        if k % max(1, steps // 100) == 0:
            samples.append(
                [round((k + 1) * dt, 8), float(phi[0]), float(phi[-1]), float(phi.sum() * dz * area_m2)]
            )
    feed_solids = feed_m3_h * feed_fraction * hours
    final = float(phi.sum() * dz * area_m2)
    return {
        "fraction_profile": phi.tolist(),
        "z_m": ((np.arange(cells) + 0.5) * dz).tolist(),
        "underflow_fraction": float(phi[-1]),
        "overflow_fraction": float(phi[0]),
        "initial_solids_m3": initial,
        "feed_solids_m3": feed_solids,
        "outlet_solids_m3": out_u + out_o,
        "final_solids_m3": final,
        "solids_residual_m3": initial + feed_solids - out_u - out_o - final,
        "steps": steps,
        "timeline": samples,
        "model": "one-dimensional hindered-settling finite volume",
    }
