"""The SIR equations as one public function of the engine (``pipeline.model.sir.derivatives``), shared by ``simulate`` and by the
notebooks that hand the model to a reference ODE solver, so that no notebook states the equations itself."""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from pipeline.io.schema import SIRParams
from pipeline.model.sir import derivatives, simulate

ROOT = Path(__file__).resolve().parents[2]


def test_derivatives_are_the_sir_equations() -> None:
    d = derivatives(0.0, (99_000.0, 1_000.0, 0.0), 0.5, 0.2, 100_000.0)
    infections = 0.5 * 99_000.0 * 1_000.0 / 100_000.0
    assert d == pytest.approx([-infections, infections - 0.2 * 1_000.0, 0.2 * 1_000.0], rel=1e-12)


def test_derivatives_conserve_the_population_and_ignore_time() -> None:
    a = derivatives(0.0, (60_000.0, 30_000.0, 10_000.0), 0.9, 0.3, 100_000.0)
    b = derivatives(123.0, (60_000.0, 30_000.0, 10_000.0), 0.9, 0.3, 100_000.0)
    assert a == b and abs(sum(a)) < 1e-9


def test_derivatives_of_an_empty_population_infect_nobody() -> None:
    assert derivatives(0.0, (0.0, 5.0, 0.0), 0.5, 0.2, 0.0) == [0.0, -1.0, 1.0]


def test_simulate_takes_its_euler_step_from_derivatives() -> None:
    p = SIRParams("t", beta=0.55, gamma=0.2, N=100_000.0, I0=50.0, days=1)
    dS, dI, dR = derivatives(0.0, (p.N - p.I0, p.I0, 0.0), p.beta, p.gamma, p.N)
    r = simulate(p, 0.25)
    assert r.S[1] == p.N - p.I0 + dS * 0.25 and r.I[1] == p.I0 + dI * 0.25 and r.R[1] == dR * 0.25


def test_the_committed_traces_are_unchanged_by_the_refactor() -> None:
    for case in json.loads((ROOT / "data/derived/manifests/index.json").read_text(encoding="utf-8"))["cases"]:
        cid = case["case_id"]
        params = json.loads((ROOT / f"data/derived/manifests/{cid}.json").read_text(encoding="utf-8"))["params"]
        trace = json.loads((ROOT / f"data/derived/{cid}/trace.json").read_text(encoding="utf-8"))
        r = simulate(SIRParams(cid, **params))
        at = {round(t, 4): v for t, v in zip(r.t, r.I)}
        for t, v in zip(trace["t"], trace["I"]):
            assert at[round(t, 4)] == pytest.approx(v, rel=1e-3, abs=1e-2)
