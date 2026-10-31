import pytest
from pipeline.model.hydromet import (
    COPPER_KG_MOL,
    FARADAY_C_MOL,
    acid_limited_extraction,
    cstr_conversion,
    electrowinning,
    shrinking_core_conversion,
    solvent_extraction,
)
from pipeline.model.thickener import simulate_thickener


def test_reaction_controlled_limit_is_closed_form():
    for age in [0, 0.1, 0.5, 0.9, 1.0]:
        assert shrinking_core_conversion(age, 1, 0) == pytest.approx(1 - (1 - age) ** 3, abs=1e-9)
    assert shrinking_core_conversion(100, 1, 3) == 1


def test_cstr_residence_and_acid_copper_closure():
    assert cstr_conversion(0.1, 2, 4) < cstr_conversion(1, 2, 4) < cstr_conversion(10, 2, 4)
    r = acid_limited_extraction(100, 0.005, 0.8, 100)
    assert r["acid_limited"] and r["dissolved_copper_kg_h"] + r["residue_copper_kg_h"] == 500
    assert r["acid_consumed_kg_h"] == pytest.approx(100)


def test_sx_phase_mass_balance_and_faraday_oracle():
    r = solvent_extraction(100, 2, 100, 2, 2)
    assert r["raffinate_g_l"] == pytest.approx(2 / 9)
    assert abs(r["mass_residual_kg_h"]) < 1e-10
    ew = electrowinning(2 * FARADAY_C_MOL / 3600, 1, 2)
    assert ew["cathode_kg_h"] == pytest.approx(COPPER_KG_MOL)
    assert electrowinning(100000, 1, 2, 0)["cathode_kg_h"] == 0


def test_thickener_conserves_solids_and_refines():
    a = simulate_thickener(cells=40)
    b = simulate_thickener(cells=80)
    assert abs(a["solids_residual_m3"]) < 1e-9 and abs(b["solids_residual_m3"]) < 1e-9
    assert max(a["fraction_profile"]) < 0.6 and min(a["fraction_profile"]) >= 0
    assert abs(a["underflow_fraction"] - b["underflow_fraction"]) < 0.03


@pytest.mark.parametrize(
    "fn,args",
    [
        (shrinking_core_conversion, (-1, 1, 1)),
        (electrowinning, (-1, 1, 2)),
        (solvent_extraction, (0, 1, 1, 1)),
        (acid_limited_extraction, (100, 2, 0.5, 1)),
    ],
)
def test_adversarial_invalid_process_domains(fn, args):
    with pytest.raises(ValueError):
        fn(*args)
