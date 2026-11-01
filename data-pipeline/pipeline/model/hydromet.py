"""Bounded reference-route leaching and electrowinning models, SI units explicit.

The shrinking-core law describes a specified reactive mineral with fixed
particle radius and concentration. It does not predict arbitrary ore chemistry.
"""

from __future__ import annotations

import math

from scipy.integrate import quad
from scipy.optimize import brentq

FARADAY_C_MOL = 96485.33212
COPPER_KG_MOL = 0.063546


def shrinking_core_conversion(age_h: float, reaction_time_h: float, diffusion_time_h: float) -> float:
    if (
        not all(math.isfinite(v) for v in (age_h, reaction_time_h, diffusion_time_h))
        or age_h < 0
        or reaction_time_h <= 0
        or diffusion_time_h < 0
    ):
        raise ValueError("invalid kinetic time")
    if age_h == 0:
        return 0.0
    if age_h >= reaction_time_h + diffusion_time_h:
        return 1.0

    def law(x):
        r = (1 - x) ** (1 / 3)
        return reaction_time_h * (1 - r) + diffusion_time_h * (1 - 3 * r * r + 2 * r * r * r) - age_h

    return float(brentq(law, 0.0, 1.0, xtol=1e-12))


def cstr_conversion(mean_residence_h: float, reaction_time_h: float, diffusion_time_h: float) -> float:
    if mean_residence_h <= 0 or not math.isfinite(mean_residence_h):
        raise ValueError("invalid residence time")
    # Dimensionless age u avoids underflow for very large or small residence.
    value, _ = quad(
        lambda u: (
            shrinking_core_conversion(u * mean_residence_h, reaction_time_h, diffusion_time_h) * math.exp(-u)
        ),
        0,
        35,
        epsabs=1e-8,
        points=[min(34.9, (reaction_time_h + diffusion_time_h) / mean_residence_h)],
    )
    return float(value)


def acid_limited_extraction(
    feed_tph: float,
    grade_fraction: float,
    kinetic_conversion: float,
    acid_kg_h: float,
    acid_kg_per_kg_cu: float = 1.543,
) -> dict:
    if not all(
        math.isfinite(v) for v in (feed_tph, grade_fraction, kinetic_conversion, acid_kg_h, acid_kg_per_kg_cu)
    ):
        raise ValueError("non-finite leach input")
    if (
        feed_tph < 0
        or not 0 <= grade_fraction <= 1
        or not 0 <= kinetic_conversion <= 1
        or acid_kg_h < 0
        or acid_kg_per_kg_cu <= 0
    ):
        raise ValueError("invalid leach material balance")
    cu = feed_tph * 1000 * grade_fraction
    dissolved = min(cu * kinetic_conversion, acid_kg_h / acid_kg_per_kg_cu)
    return {
        "feed_copper_kg_h": cu,
        "dissolved_copper_kg_h": dissolved,
        "residue_copper_kg_h": cu - dissolved,
        "acid_consumed_kg_h": dissolved * acid_kg_per_kg_cu,
        "acid_limited": dissolved < cu * kinetic_conversion - 1e-9,
    }


def solvent_extraction(
    aqueous_m3_h: float, aqueous_g_l: float, organic_m3_h: float, distribution_ratio: float, stages: int = 2
) -> dict:
    if not all(
        math.isfinite(v) for v in (aqueous_m3_h, aqueous_g_l, organic_m3_h, distribution_ratio)
    ) or not isinstance(stages, int):
        raise ValueError("non-finite SX input or noninteger stages")
    # Ideal fresh-organic cross-current stages, not countercurrent McCabe-Thiele.
    if (
        aqueous_m3_h <= 0
        or organic_m3_h <= 0
        or aqueous_g_l < 0
        or distribution_ratio <= 0
        or stages < 1
        or stages > 20
    ):
        raise ValueError("invalid ideal SX stage")
    raffinate = aqueous_g_l * (aqueous_m3_h / (aqueous_m3_h + distribution_ratio * organic_m3_h)) ** stages
    captured = aqueous_m3_h * (aqueous_g_l - raffinate)
    return {
        "raffinate_g_l": raffinate,
        "transferred_copper_kg_h": captured,
        "organic_loading_g_l": captured / (organic_m3_h * stages),
        "organic_total_m3_h": organic_m3_h * stages,
        "mass_residual_kg_h": aqueous_m3_h * aqueous_g_l - captured - aqueous_m3_h * raffinate,
    }


def electrowinning(
    current_a: float, efficiency: float, voltage_v: float, available_copper_kg_h: float = float("inf")
) -> dict:
    if math.isnan(available_copper_kg_h):
        raise ValueError("unknown available copper")
    if (
        not all(math.isfinite(v) for v in (current_a, efficiency, voltage_v))
        or current_a < 0
        or not 0 <= efficiency <= 1
        or voltage_v < 0
        or available_copper_kg_h < 0
    ):
        raise ValueError("invalid electrowinning state")
    charge_copper = current_a * 3600 * efficiency * COPPER_KG_MOL / (2 * FARADAY_C_MOL)
    deposited = min(charge_copper, available_copper_kg_h)
    power = current_a * voltage_v / 1000
    return {
        "cathode_kg_h": deposited,
        "faraday_limit_kg_h": charge_copper,
        "power_kw": power,
        "specific_energy_kwh_kg": power / deposited if deposited > 0 else None,
        "solution_limited": deposited < charge_copper,
    }
