"""Named product stages from immutable source evidence to validated visual replay."""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
from dataclasses import asdict
from pathlib import Path

import joblib
import numpy as np

from .. import registry
from ..io.contract import validate_rows
from ..io.engines import execute_packages, fetch_artifacts
from ..io.formats import write_json
from ..model.hydromet import acid_limited_extraction, cstr_conversion, electrowinning, solvent_extraction
from ..model.learning import fit_normal
from ..model.plant import reference_plant, validate_graph
from ..model.scenarios import channel_specs, generate
from ..model.thickener import simulate_thickener
from .plant_evaluate import benchmark, calibrate, evaluate_one
from .learned_compare import train_ridge, compare as compare_learned, summary as ridge_summary

ROOT = Path(__file__).resolve().parents[3]
VERSION = (ROOT / "VERSION").read_text().strip()


def clean(value):
    if isinstance(value, np.ndarray):
        return clean(value.tolist())
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        return round(float(value), 7) if np.isfinite(value) else None
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [clean(v) for v in value]
    return value


def sources(output: Path, cache: Path):
    lock = json.loads((ROOT / "data/sources/engines.lock.json").read_text(encoding="utf-8"))
    rows = fetch_artifacts(lock, cache) + execute_packages()
    obj = {"schema": "orebridge.engine-evidence/v1", "records": rows, "unavailable": lock["unavailable"]}
    write_json(output / "engine-evidence.json", clean(obj))
    return obj


def train(models: Path):
    models.mkdir(parents=True, exist_ok=True)
    bundle = fit_normal()
    joblib.dump(bundle, models / "forecast-model.joblib", compress=3)
    train_ridge(models)
    summary = {k: clean(v) for k, v in bundle.items() if k != "model"}
    summary.update(
        {
            "schema": "orebridge.state-model/v1",
            "algorithm": "scikit-learn HistGradientBoostingRegressor, causal multichannel lags",
            "checkpoint": "forecast-model.joblib",
            "checkpoint_sha256": hashlib.sha256((models / "forecast-model.joblib").read_bytes()).hexdigest(),
            "environment": {
                p: importlib.metadata.version(p) for p in ["numpy", "scipy", "scikit-learn", "joblib"]
            },
        }
    )
    return bundle, summary


def _trace(case, bundle, thresholds, seed=1000, severity=1):
    report = validate_rows([{"case_id": case.id, "family": case.family, "seed": seed, "severity": severity}])
    if report.rejected:
        raise ValueError(report.rejected)
    params = report.accepted[0]
    scenario = generate(params.family, params.seed, params.severity, params.steps, params.noise)
    rows, result, _ = evaluate_one(scenario, bundle, thresholds)
    methods = {}
    for name, r in result.items():
        scores = np.full(scenario.observed.shape, np.nan)
        scores[14:] = r["scores"] / thresholds[name]
        methods[name] = scores
    estimate = np.full(scenario.observed.shape, np.nan)
    if result["tasc"]["estimate"] is not None:
        estimate[14:] = result["tasc"]["estimate"]
    return clean(
        {
            "schema": "orebridge.trace/v1",
            "case_id": case.id,
            "family": case.family,
            "provenance": "authored_synthetic_known_truth",
            "time_origin": "2026-10-31T12:00:00Z",
            "time_s": np.arange(params.steps),
            "channels": channel_specs(),
            "observed": scenario.observed,
            "valid": scenario.valid,
            "truth": scenario.truth,
            "fault": scenario.fault,
            "quality_reasons": scenario.reasons,
            "scores": methods,
            "evidence_lag_s": {
                name: [14 - c["delay_s"] for c in channel_specs()]
                if name in ("robust-aligned", "tasc", "tasc-no-engine", "tasc-no-topology")
                else [0] * 16
                for name in methods
            },
            "estimate": estimate,
            "metrics": rows,
            "threshold": thresholds,
        }
    ), asdict(params)


def export_case(case, output: Path, bundle, thresholds, *, seed=1000, severity=1):
    trace, params = _trace(case, bundle, thresholds, seed, severity)
    path = f"{case.id}/trace.json"
    size = write_json(output / path, trace)
    raw = (output / path).read_bytes()
    manifest = {
        "schema": "orebridge.manifest/v1",
        "case_id": case.id,
        "title": case.title,
        "category": case.category,
        "seed": seed,
        "params": params,
        "engine": "OreBridge state coherence",
        "engine_version": VERSION,
        "real_or_synthetic": "synthetic",
        "expected_band": {
            "en": "Known-truth disturbance; numeric results are replayed, not plant forecasts.",
            "es": "Perturbación de verdad conocida; resultados reproducidos, no pronósticos de planta.",
        },
        "artifact": {
            "path": path,
            "format": "json",
            "trace_schema": "orebridge.trace/v1",
            "bytes": size,
            "sha256": hashlib.sha256(raw).hexdigest(),
        },
        "lane": "replay",
        "gate": {"lane": "replay", "pure_python": False, "input_contract": True, "scientific_replay": True},
        "metrics": trace["metrics"],
    }
    write_json(output / f"manifests/{case.id}.json", manifest)
    return {
        "case_id": case.id,
        "title": case.title,
        "category": case.category,
        "manifest_path": f"manifests/{case.id}.json",
    }


def run_all(
    output: Path,
    models: Path,
    *,
    train_model=True,
    full_benchmark=False,
    engine_file: Path | None = None,
    stage="all",
):
    output.mkdir(parents=True, exist_ok=True)
    graph = reference_plant()
    validate_graph(graph)
    if train_model:
        bundle, summary = train(models)
    else:
        checkpoint = models / "forecast-model.joblib"
        if not checkpoint.exists():
            raise FileNotFoundError(
                "real forecast checkpoint absent; --no-train never substitutes a fake model"
            )
        bundle = joblib.load(checkpoint)
        summary = {k: clean(v) for k, v in bundle.items() if k != "model"}
        summary.update(
            {
                "schema": "orebridge.state-model/v1",
                "algorithm": "scikit-learn histogram gradient boosting",
                "checkpoint_sha256": hashlib.sha256(checkpoint.read_bytes()).hexdigest(),
                "train_seeds": bundle["train_seeds"],
                "calibration_seeds": bundle["calibration_seeds"],
                "checkpoint": "forecast-model.joblib",
                "environment": {
                    p: importlib.metadata.version(p) for p in ["numpy", "scipy", "scikit-learn", "joblib"]
                },
            }
        )
    thresholds = calibrate(bundle)
    write_json(output / "state-model.json", clean(summary))
    evidence = engine_file or output / "engine-evidence.json"
    if not evidence.exists():
        raise FileNotFoundError("engine evidence absent: run sources with an external cache root first")
    engines = json.loads(evidence.read_text(encoding="utf-8"))
    if len(engines["records"]) < 14:
        raise ValueError("incomplete real engine adapter matrix")
    write_json(output / "engine-evidence.json", clean(engines))
    write_json(output / "plant.json", graph)
    leach = acid_limited_extraction(100, 0.005, cstr_conversion(6, 2, 4), 700)
    sx = solvent_extraction(150, leach["dissolved_copper_kg_h"] / 150, 120, 2)
    ew = electrowinning(400000, 0.92, 2.1, sx["transferred_copper_kg_h"])
    write_json(
        output / "downstream.json",
        clean(
            {
                "schema": "orebridge.downstream/v1",
                "leach": leach,
                "sx": sx,
                "ew": ew,
                "thickener": simulate_thickener(),
                "provenance": "bounded authored process reference; not plant calibrated",
            }
        ),
    )
    entries = [export_case(c, output, bundle, thresholds) for c in registry.list_cases()]
    if stage == "infer":
        return entries
    if stage == "extend":
        reference = json.loads((output / "benchmark.json").read_text(encoding="utf-8"))
        export_learned_comparison(output, models, reference)
        return finalize_existing(output, entries)
    result = benchmark(
        bundle,
        thresholds,
        seeds=range(1000, 1016) if full_benchmark else range(1000, 1002),
        severities=(0.5, 1, 2, 4) if full_benchmark else (1,),
    )
    write_json(output / "benchmark.json", clean(result))
    from .analysis import analyze

    write_json(output / "benchmark-analysis.json", clean(analyze(result)))
    export_learned_comparison(output, models, result)
    return finalize_existing(output, entries)


def export_learned_comparison(output, models, result):
    checkpoint = models / "ridge-model.joblib"
    if not checkpoint.is_file():
        raise FileNotFoundError("real ridge checkpoint absent; run train-ridge explicitly")
    bundle = joblib.load(checkpoint)
    write_json(output / "state-model-ridge.json", clean(ridge_summary(bundle, checkpoint)))
    write_json(output / "learned-comparison.json", clean(compare_learned(result, bundle)))


def finalize_existing(output: Path, entries=None):
    if entries is None:
        entries = []
        for case in registry.list_cases():
            manifest = json.loads((output / f"manifests/{case.id}.json").read_text(encoding="utf-8"))
            entries.append(
                {
                    "case_id": case.id,
                    "title": manifest["title"],
                    "category": manifest["category"],
                    "manifest_path": f"manifests/{case.id}.json",
                }
            )
    files = [
        "benchmark-analysis.json",
        "plant.json",
        "engine-evidence.json",
        "downstream.json",
        "benchmark.json",
        "state-model.json",
        "state-model-ridge.json",
        "learned-comparison.json",
        "readiness.json",
    ]
    index = {
        "schema": "orebridge.index/v1",
        "engine_version": VERSION,
        "n_cases": len(entries),
        "default_case": registry.default_case(),
        "cases": entries,
        "files": files,
    }
    write_json(output / "manifests/index.json", index)
    from ..core import readiness

    doc = readiness.compute(repo_root=ROOT, derived_root=output, models_dir=ROOT / "models")
    readiness.write(output, doc)
    validate(output)
    return entries


def validate(output: Path):
    graph = json.loads((output / "plant.json").read_text(encoding="utf-8"))
    validate_graph(graph)
    index = json.loads((output / "manifests/index.json").read_text(encoding="utf-8"))
    for file in index["files"]:
        if not (output / file).is_file():
            raise ValueError("required declared artifact absent: " + file)
    model_registry = json.loads((ROOT / "models/registry.json").read_text(encoding="utf-8"))
    if {r["id"] for r in model_registry["models"]} != {"forecast", "ridge"} or len(
        model_registry["models"]
    ) != 2:
        raise ValueError("the two trained model families must be complete and unique")
    for model in model_registry["models"]:
        manifest_file = output / Path(model["manifest"]).name
        if not manifest_file.is_file():
            raise ValueError("required trained model manifest absent: " + model["id"])
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        if manifest["checkpoint"] != model["checkpoint"] or not model["trained"]:
            raise ValueError("trained model checkpoint identity mismatch")
        if not (output / Path(model["evaluation"]).name).is_file():
            raise ValueError("trained model held-out evaluation absent")
    for entry in index["cases"]:
        manifest = json.loads((output / entry["manifest_path"]).read_text(encoding="utf-8"))
        artifact = manifest["artifact"]
        raw = (output / artifact["path"]).read_bytes()
        if len(raw) != artifact["bytes"] or hashlib.sha256(raw).hexdigest() != artifact["sha256"]:
            raise ValueError("case artifact byte/hash drift")
        trace = json.loads(raw)
        if np.shape(trace["observed"]) != (160, 16):
            raise ValueError("scenario matrix incomplete")
    b = json.loads((output / "benchmark.json").read_text(encoding="utf-8"))
    count = 12 * len(b["protocol"]["test_seeds"]) * len(b["protocol"]["severity"]) * 8
    if len(b["rows"]) != count:
        raise ValueError("benchmark matrix has missing method/case cells")
    additional = json.loads((output / "learned-comparison.json").read_text(encoding="utf-8"))
    if len(additional["rows"]) != count // 4:
        raise ValueError("paired learned comparison has missing cells")
    for method in ("forecast", "ridge"):
        rows = [r for r in additional["rows"] if r["method"] == method]
        expected = {(r["family"], r["seed"], r["severity"]) for r in b["rows"] if r["method"] == "forecast"}
        if len(rows) != len(expected) or {(r["family"], r["seed"], r["severity"]) for r in rows} != expected:
            raise ValueError("paired learned comparison duplicates or omits protocol cells")
    if [r for r in additional["rows"] if r["method"] == "forecast"] != [
        r for r in b["rows"] if r["method"] == "forecast"
    ]:
        raise ValueError("reused HGB rows differ from the published comparison")
    print(f"validated {len(index['cases'])} plant scenarios and {count} benchmark cells", flush=True)


def evaluate_existing(output: Path, models: Path, full_benchmark=False):
    bundle = joblib.load(models / "forecast-model.joblib")
    thresholds = calibrate(bundle)
    result = benchmark(
        bundle,
        thresholds,
        seeds=range(1000, 1016) if full_benchmark else range(1000, 1002),
        severities=(0.5, 1, 2, 4) if full_benchmark else (1,),
    )
    from .analysis import analyze

    write_json(output / "benchmark.json", clean(result))
    write_json(output / "benchmark-analysis.json", clean(analyze(result)))
    export_learned_comparison(output, models, result)
    return result
