"""Materialize the reviewed plant contracts and OpenAPI type source."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
S = {"type": "string", "minLength": 1}
N = {"type": "number"}
I = {"type": "integer"}
B = {"type": "boolean"}
T = {
    "type": "object",
    "additionalProperties": False,
    "required": ["en", "es"],
    "properties": {"en": S, "es": S},
}


def arr(items, minimum=0):
    return {"type": "array", "minItems": minimum, "items": items}


def obj(properties, required=None, extra=False):
    return {
        "type": "object",
        "additionalProperties": extra,
        "required": list(properties) if required is None else required,
        "properties": properties,
    }


def nullable(schema):
    return {"anyOf": [schema, {"type": "null"}]}


def write(path, document):
    dest = ROOT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def main():
    confusion = obj(
        {
            "tp": I,
            "fp": I,
            "fn": I,
            "tn": I,
            "precision": nullable(N),
            "recall": nullable(N),
            "false_positive_rate": nullable(N),
        }
    )
    metric = obj(
        {
            "method": S,
            "family": S,
            "seed": I,
            "severity": N,
            "numeric": confusion,
            "source_quality": confusion,
            "event": confusion,
            "detection_delay_s": nullable(N),
            "scored_points": I,
            "unscorable_points": I,
            "timing_alignment_s": I,
        }
    )
    matrix = arr(arr(nullable(N), 16), 100)
    vec3 = {"type": "array", "minItems": 3, "maxItems": 3, "items": N}
    asset = obj({"id": S, "name": T, "stage": S, "kind": S, "position": vec3, "size": vec3, "description": T})
    stream = obj(
        {
            "id": S,
            "source": S,
            "target": S,
            "material": S,
            "nominal": {"type": "number", "minimum": 0},
            "unit": S,
            "delay_s": {"type": "number", "minimum": 0},
        }
    )
    graph = obj(
        {
            "schema": {"const": "orebridge.plant/v1"},
            "id": S,
            "revision": S,
            "provenance": {"const": "authored_synthetic"},
            "coordinate_unit": {"const": "m"},
            "assets": arr(asset, 35),
            "streams": arr(stream, 40),
        }
    )
    params = obj(
        {
            "case_id": S,
            "family": S,
            "seed": {"type": "integer", "minimum": 0},
            "severity": {"type": "number", "minimum": 0.1, "maximum": 5},
            "noise": {"type": "number", "minimum": 0, "maximum": 5},
            "steps": {"type": "integer", "minimum": 100, "maximum": 2000},
        }
    )
    entry = obj({"case_id": S, "title": T, "category": T, "manifest_path": S})
    index = obj(
        {
            "schema": {"const": "orebridge.index/v1"},
            "engine_version": S,
            "n_cases": {"type": "integer", "minimum": 1},
            "default_case": S,
            "cases": arr(entry, 1),
            "files": arr(S),
        }
    )
    artifact = obj(
        {
            "path": S,
            "format": {"const": "json"},
            "trace_schema": {"const": "orebridge.trace/v1"},
            "bytes": {"type": "integer", "minimum": 1},
            "sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
        }
    )
    manifest = obj(
        {
            "schema": {"const": "orebridge.manifest/v1"},
            "case_id": S,
            "title": T,
            "category": T,
            "seed": I,
            "params": params,
            "engine": S,
            "engine_version": S,
            "real_or_synthetic": {"const": "synthetic"},
            "expected_band": T,
            "artifact": artifact,
            "lane": {"const": "replay"},
            "gate": obj(
                {"lane": {"const": "replay"}, "pure_python": B, "input_contract": B, "scientific_replay": B}
            ),
            "metrics": arr(metric, 8),
        }
    )
    channel = obj(
        {
            "id": S,
            "asset_id": S,
            "label": T,
            "unit": S,
            "nominal": N,
            "delay_s": N,
            "sigma": {"type": "number", "exclusiveMinimum": 0},
        }
    )
    trace = obj(
        {
            "schema": {"const": "orebridge.trace/v1"},
            "case_id": S,
            "family": S,
            "provenance": {"const": "authored_synthetic_known_truth"},
            "time_origin": S,
            "time_s": arr(N, 100),
            "channels": arr(channel, 16),
            "observed": matrix,
            "valid": arr(arr(B, 16), 100),
            "truth": matrix,
            "fault": arr(arr(B, 16), 100),
            "quality_reasons": {"type": "object", "additionalProperties": S},
            "scores": {"type": "object", "additionalProperties": matrix},
            "estimate": matrix,
            "metrics": arr(metric, 8),
            "threshold": {"type": "object", "additionalProperties": arr(N, 16)},
        }
    )
    evidence = obj(
        {
            "schema": {"const": "orebridge.engine-evidence/v1"},
            "records": arr(
                obj(
                    {
                        "id": S,
                        "asset_id": S,
                        "lane": {"enum": ["upstream_replay", "executed_model"]},
                        "source_url": S,
                        "version": S,
                        "license": S,
                        "provenance": S,
                        "metrics": arr(
                            obj(
                                {"path": S, "label": S, "value": N, "unit": S},
                                required=["label", "value", "unit"],
                                extra=True,
                            ),
                            1,
                        ),
                    },
                    extra=True,
                ),
                14,
            ),
            "unavailable": arr(obj({"id": S, "reason": S})),
        }
    )
    model = obj(
        {
            "schema": {"const": "orebridge.state-model/v1"},
            "algorithm": S,
            "checkpoint_sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
            "train_seeds": arr(I, 1),
            "calibration_seeds": arr(I, 1),
        },
        extra=True,
    )
    observation = obj(
        {
            "tag_id": S,
            "asset_id": S,
            "value": nullable(N),
            "unit": S,
            "source_time": {"type": "string", "format": "date-time"},
            "receipt_time": {"type": "string", "format": "date-time"},
            "sequence": {"type": "integer", "minimum": 0},
            "quality": {"enum": ["good", "uncertain", "bad"]},
        }
    )
    schemas = {
        "params-record": ("PlantParams", params),
        "case-index": ("CaseIndex", index),
        "case-manifest": ("CaseManifest", manifest),
        "trace": ("Trace", trace),
        "plant-graph": ("PlantGraph", graph),
        "engine-evidence": ("EngineEvidence", evidence),
        "state-model": ("StateModel", model),
        "observation": ("Observation", observation),
    }
    stream["properties"]["water_m3_h"] = {"type": "number", "minimum": 0}
    stream["required"].append("water_m3_h")
    aggregate = obj(
        {"method": S, **confusion["properties"], "cases": I, "scored_points": I, "unscorable_points": I}
    )
    protocol = obj(
        {
            "test_seeds": arr(I, 1),
            "severity": arr(N, 1),
            "train_seeds": arr(I, 1),
            "forecast_calibration_seeds": arr(I, 1),
            "state_calibration_seeds": arr(I, 1),
            "point_adjustment": {"const": False},
            "channels": {"const": 16},
            "steps": {"const": 160},
            "numerical_quality_separation": {"const": True},
            "threshold_quantile": N,
        }
    )
    schemas["benchmark"] = (
        "Benchmark",
        obj(
            {
                "schema": {"const": "orebridge.benchmark/v1"},
                "provenance": S,
                "protocol": protocol,
                "aggregate": arr(aggregate, 8),
                "rows": arr(metric, 8),
                "elapsed_s": N,
            }
        ),
    )
    schemas["downstream"] = (
        "Downstream",
        obj(
            {
                "schema": {"const": "orebridge.downstream/v1"},
                "leach": obj(
                    {
                        "feed_copper_kg_h": N,
                        "dissolved_copper_kg_h": N,
                        "residue_copper_kg_h": N,
                        "acid_consumed_kg_h": N,
                        "acid_limited": B,
                    }
                ),
                "sx": obj(
                    {
                        "raffinate_g_l": N,
                        "transferred_copper_kg_h": N,
                        "organic_loading_g_l": N,
                        "organic_total_m3_h": N,
                        "mass_residual_kg_h": N,
                    }
                ),
                "ew": obj(
                    {
                        "cathode_kg_h": N,
                        "faraday_limit_kg_h": N,
                        "power_kw": N,
                        "specific_energy_kwh_kg": nullable(N),
                        "solution_limited": B,
                    }
                ),
                "thickener": obj(
                    {
                        "z_m": arr(N, 2),
                        "fraction_profile": arr(N, 2),
                        "solids_residual_m3": N,
                        "underflow_fraction": N,
                    },
                    extra=True,
                ),
                "provenance": S,
            }
        ),
    )
    schemas["benchmark-analysis"] = (
        "BenchmarkAnalysis",
        obj(
            {
                "schema": {"const": "orebridge.benchmark-analysis/v1"},
                "protocol": obj({}, required=[], extra=True),
                "paired_differences": arr(
                    obj(
                        {
                            "method": S,
                            "reference": S,
                            "metric": S,
                            "difference": N,
                            "ci95": {"type": "array", "items": N, "minItems": 2, "maxItems": 2},
                        }
                    ),
                    1,
                ),
                "by_family": arr(obj({}, required=[], extra=True), 1),
                "matched_source_valid": arr(obj({"method": S, **confusion["properties"], "cases": I}), 8),
                "conclusion": S,
            }
        ),
    )
    for file, (title, schema) in schemas.items():
        write(
            f"docs/contracts/schemas/{file}.schema.json",
            {
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "$id": file + ".schema.json",
                "title": title,
                **schema,
            },
        )
    components = {name: {"$ref": f"schemas/{file}.schema.json"} for file, (name, _) in schemas.items()}
    components["Readiness"] = {"$ref": "schemas/readiness.schema.json"}
    components["Unavailable"] = obj({"detail": obj({"state": {"const": "missing"}, "reason": T})})

    def get(name):
        return {
            "get": {
                "responses": {
                    "200": {
                        "description": "Validated read-only document",
                        "content": {"application/json": {"schema": {"$ref": f"#/components/schemas/{name}"}}},
                    },
                    "503": {
                        "description": "Explicit unavailable state",
                        "content": {
                            "application/json": {"schema": {"$ref": "#/components/schemas/Unavailable"}}
                        },
                    },
                }
            }
        }

    paths = {
        "/api/index": get("CaseIndex"),
        "/api/plant": get("PlantGraph"),
        "/api/engines": get("EngineEvidence"),
        "/api/readiness": get("Readiness"),
        "/api/observations": {
            "get": {
                "responses": {
                    "200": {
                        "description": "Authenticated read-only observation snapshot",
                        "content": {
                            "application/json": {
                                "schema": obj(
                                    {
                                        "schema": {"const": "orebridge.observations/v1"},
                                        "source": {"const": "site-opc-ua"},
                                        "graph_revision": S,
                                        "records": arr({"$ref": "#/components/schemas/Observation"}),
                                    }
                                )
                            }
                        },
                    },
                    "401": {"description": "Authentication required"},
                }
            }
        },
    }
    write(
        "docs/contracts/api.openapi.json",
        {
            "openapi": "3.1.0",
            "info": {
                "title": "OreBridge read-only local gateway",
                "version": "2.0.0",
                "description": "Local site adapter and static replay documents; no write or control operations.",
            },
            "paths": paths,
            "components": {"schemas": components},
        },
    )
    write(
        "docs/contracts/examples/params-record.json",
        {"case_id": "PL-01", "family": "healthy", "seed": 1000, "severity": 1.0, "noise": 1.0, "steps": 160},
    )
    write(
        "docs/contracts/examples/observation.json",
        {
            "tag_id": "ROM.feed",
            "asset_id": "ROM",
            "value": 720.0,
            "unit": "t/h",
            "source_time": "2026-10-31T12:00:00Z",
            "receipt_time": "2026-10-31T12:00:01Z",
            "sequence": 1,
            "quality": "good",
        },
    )
    write(
        "docs/contracts/examples/api-unavailable.json",
        {
            "detail": {
                "state": "missing",
                "reason": {
                    "en": "No authorized site source configured.",
                    "es": "No hay fuente autorizada configurada.",
                },
            }
        },
    )
    rows = [
        [
            "params-record",
            "2.0.0",
            "data-pipeline/pipeline/io/contract.py",
            "docs/contracts/schemas/params-record.schema.json",
            "docs/contracts/examples/params-record.json",
            "docs/contracts/examples/params-record.json",
            "tests/contracts/test_plant_documents.py",
            "tests/contracts/test_plant_documents.py",
            "missing: no scenario is executed; malformed inputs are rejected with reasons",
            "fixture:docs/contracts/examples/params-record.json",
            "not a model slot",
            "tests/contracts/test_plant_documents.py",
            "real",
        ],
        [
            "case-index",
            "3.0.0",
            "data-pipeline/pipeline/stages/bake_plant.py",
            "docs/contracts/schemas/case-index.schema.json",
            "data/derived/manifests/index.json",
            "data/derived/manifests/index.json",
            "tests/contracts/test_plant_documents.py",
            "frontend/src/lib/contract.test.ts",
            "missing: the site build fails and no fake cases appear",
            "fixture:docs/contracts/fixtures/data/derived/manifests/index.json",
            "not a model slot",
            "tests/contracts/test_plant_documents.py",
            "real",
        ],
        [
            "case-manifest",
            "5.0.0",
            "data-pipeline/pipeline/stages/bake_plant.py",
            "docs/contracts/schemas/case-manifest.schema.json",
            "data/derived/manifests/PL-01.json",
            "data/derived/manifests/*.json, !data/derived/manifests/index.json",
            "tests/contracts/test_plant_documents.py",
            "frontend/src/lib/contract.test.ts",
            "missing: selected case refuses with unavailable state",
            "fixture:docs/contracts/fixtures/data/derived/manifests/PL-01.json",
            "not a model slot",
            "tests/contracts/test_plant_documents.py",
            "real",
        ],
        [
            "trace",
            "2.0.0",
            "data-pipeline/pipeline/stages/bake_plant.py",
            "docs/contracts/schemas/trace.schema.json",
            "data/derived/PL-01/trace.json",
            "data/derived/PL-*/trace.json",
            "tests/contracts/test_plant_documents.py",
            "frontend/src/lib/contract.test.ts",
            "missing: no empty numeric trace is substituted",
            "fixture:docs/contracts/fixtures/data/derived/PL-01/trace.json",
            "not a model slot",
            "tests/contracts/test_plant_documents.py",
            "real",
        ],
        [
            "plant-graph",
            "1.0.0",
            "data-pipeline/pipeline/model/plant.py",
            "docs/contracts/schemas/plant-graph.schema.json",
            "data/derived/plant.json",
            "data/derived/plant.json",
            "tests/test_plant.py",
            "frontend/src/lib/contract.test.ts",
            "missing: 3D and diagram cannot be bound, show unavailable",
            "fixture:docs/contracts/fixtures/data/derived/plant.json",
            "not a model slot",
            "tests/test_plant.py",
            "real",
        ],
        [
            "engine-evidence",
            "1.0.0",
            "data-pipeline/pipeline/io/engines.py",
            "docs/contracts/schemas/engine-evidence.schema.json",
            "data/derived/engine-evidence.json",
            "data/derived/engine-evidence.json",
            "tests/test_engine_adapters.py",
            "frontend/src/lib/contract.test.ts",
            "missing: affected engine panel declares unavailable; no mock engine result",
            "fixture:docs/contracts/fixtures/data/derived/engine-evidence.json",
            "not a model slot",
            "tests/test_engine_adapters.py",
            "real",
        ],
        [
            "state-model",
            "1.0.0",
            "data-pipeline/pipeline/model/learning.py",
            "docs/contracts/schemas/state-model.schema.json",
            "data/derived/state-model.json",
            "data/derived/state-model.json",
            "tests/test_learning.py",
            "frontend/src/lib/contract.test.ts",
            "missing: no model prediction; exact threshold and raw evidence remain separate",
            "fixture:docs/contracts/fixtures/data/derived/state-model.json",
            "calibration: real forecast checkpoint; no pretend trained fallback",
            "tests/test_learning.py",
            "real",
        ],
        [
            "observation",
            "1.0.0",
            "app/gateway.py",
            "docs/contracts/schemas/observation.schema.json",
            "docs/contracts/examples/observation.json",
            "docs/contracts/examples/observation.json",
            "tests/test_gateway.py",
            "frontend/src/lib/contract.test.ts",
            "missing: no live source connected; replay remains explicitly replay",
            "fixture:docs/contracts/examples/observation.json",
            "not a model slot",
            "tests/test_gateway.py",
            "real",
        ],
        [
            "readiness",
            "2.0.0",
            "data-pipeline/pipeline/core/readiness.py",
            "docs/contracts/schemas/readiness.schema.json",
            "data/derived/readiness.json",
            "data/derived/readiness.json",
            "tests/contracts/test_plant_documents.py",
            "frontend/src/readiness/readiness.test.ts",
            "missing: fail static copy, unknown runtime state stays unknown",
            "fixture:docs/contracts/fixtures/data/derived/readiness.json",
            "not a model slot",
            "tests/contracts/test_plant_documents.py",
            "real",
        ],
        [
            "api",
            "2.0.0",
            "app/",
            "docs/contracts/api.openapi.json",
            "docs/contracts/examples/api-unavailable.json",
            "docs/contracts/examples/api-unavailable.json#Unavailable",
            "tests/test_gateway.py",
            "frontend/src/lib/api.contract.test.ts",
            "missing: gateway returns 503 without a configured source; unauthorized readers receive 401",
            "fixture:docs/contracts/fixtures/data/derived",
            "not a model slot",
            "tests/test_gateway.py",
            "real",
        ],
    ]
    for ident in ["benchmark", "downstream", "benchmark-analysis"]:
        rows.append(
            [
                ident,
                "1.0.0",
                "data-pipeline/pipeline/stages/",
                f"docs/contracts/schemas/{ident}.schema.json",
                f"data/derived/{ident}.json",
                f"data/derived/{ident}.json",
                "tests/contracts/test_plant_documents.py",
                "frontend/src/lib/contract.test.ts",
                "missing: related numerical evidence is unavailable",
                f"fixture:docs/contracts/fixtures/data/derived/{ident}.json",
                "-",
                "tests/contracts/test_plant_documents.py",
                "real",
            ]
        )
    # The base catalog has twelve columns; model baseline is its own field.
    for row in rows:
        row[10] = "-"
        if row[0] == "state-model":
            row[9] = "baseline:data-pipeline/pipeline/model/baseline.py"
            row[10] = (
                "in: four past multichannel observations; out: next-step state and calibrated residual; domain: authored normal reference plant"
            )
    headers = "| id | version | owner | schema file | example | documents | producer test | consumer test | missing-data behavior | provider | model io | swap test | status |\n"
    catalog = (
        "# Contract catalog\n\nAll boundaries name typed data, two-sided verification and explicit unavailable behavior. The public site replays synthetic reference evidence; the site-local gateway is independently configured and authenticated.\n\n## Contracts\n\n"
        + headers
        + "|"
        + "---|" * 13
        + "\n"
        + "\n".join("| " + " | ".join(row) + " |" for row in rows)
        + "\n\n## Missing-data states\n\nUse the base vocabulary available, partial, stale, provider, training and missing. Invalid measurements never become zero or a healthy model estimate. The static site has no live plant connector; actual gateway status is inspected at runtime.\n\n## History\n\n| contract | version | date | change | kind |\n|---|---|---|---|---|\n"
    )
    old = {
        "params-record": "1.0.0",
        "case-index": "2.0.0",
        "case-manifest": "4.0.0",
        "trace": "1.0.0",
        "api": "1.0.0",
        "readiness": "1.0.0",
    }
    for row in rows:
        name, version = row[:2]
        if name in old:
            catalog += f"| {name} | {old[name]} | 2026-10-30 | inherited template boundary | initial |\n| {name} | {version} | 2026-10-31 | replace domain schema with connected plant contract | major |\n"
        else:
            catalog += f"| {name} | {version} | 2026-10-31 | first plant boundary | initial |\n"
    catalog += "| surrogate-model | 1.0.0 | 2026-10-30 | inherited template slot | initial |\n| surrogate-model | 2.0.0 | 2026-10-31 | removed and replaced by state-model contract | major |\n"
    (ROOT / "docs/contracts/catalog.md").write_text(catalog, encoding="utf-8", newline="\n")
    print("Defined plant graph, observation, engine, model and replay contracts.")


if __name__ == "__main__":
    main()
