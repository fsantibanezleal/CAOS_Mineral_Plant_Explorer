"""Declare the additional paired learned boundary without changing the published study."""

from copy import deepcopy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    schemas = ROOT / "docs/contracts/schemas"
    schema = deepcopy(json.loads((schemas / "benchmark.schema.json").read_text(encoding="utf-8")))
    schema["$id"], schema["title"] = "learned-comparison.schema.json", "LearnedComparison"
    p = schema["properties"]
    p["aggregate"]["minItems"] = 2
    p["aggregate"]["maxItems"] = 2
    p["schema"] = {"const": "orebridge.learned-comparison/v1"}
    p["validation_design"] = {"type": "string", "minLength": 50}
    p["channels"] = {"type": "array", "minItems": 16, "maxItems": 16, "items": {"type": "object"}}
    score = {"anyOf": [{"type": "number"}, {"type": "null"}]}
    p["examples"] = {
        "type": "array",
        "items": {
            "type": "object",
            "additionalProperties": False,
            "required": ["family", "seed", "severity", "time_s", "scores"],
            "properties": {
                "family": {"type": "string"},
                "seed": {"type": "integer"},
                "severity": {"type": "number"},
                "time_s": {"type": "array", "minItems": 160, "maxItems": 160, "items": {"type": "number"}},
                "scores": {
                    "type": "array",
                    "minItems": 160,
                    "maxItems": 160,
                    "items": {"type": "array", "minItems": 16, "maxItems": 16, "items": score},
                },
            },
        },
    }
    p["paired_recall"] = {
        "type": "object",
        "additionalProperties": False,
        "required": ["method", "reference", "seed_blocks", "resamples", "seed", "difference", "ci95"],
        "properties": {
            "method": {"const": "ridge"},
            "reference": {"const": "forecast"},
            "seed_blocks": {"type": "integer", "minimum": 1},
            "resamples": {"const": 5000},
            "seed": {"const": 414},
            "difference": {"type": "number"},
            "ci95": {"type": "array", "minItems": 2, "maxItems": 2, "items": {"type": "number"}},
        },
    }
    schema["required"] += ["validation_design", "channels", "examples", "paired_recall"]
    write(schemas / "learned-comparison.schema.json", schema)
    registry_schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "model-registry.schema.json",
        "title": "ModelRegistry",
        "type": "object",
        "additionalProperties": False,
        "required": ["schema", "models"],
        "properties": {
            "schema": {"const": "orebridge.model-registry/v1"},
            "models": {
                "type": "array",
                "minItems": 2,
                "maxItems": 2,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["id", "family", "trained", "manifest", "fit", "checkpoint", "evaluation"],
                    "properties": {
                        "id": {"enum": ["forecast", "ridge"]},
                        "family": {"type": "string", "minLength": 1},
                        "trained": {"const": True},
                        "manifest": {
                            "type": "string",
                            "pattern": "^data/derived/state-model(?:-ridge)?\\.json$",
                        },
                        "fit": {
                            "type": "string",
                            "pattern": "^pipeline\\.model\\.learning\\.fit_(normal|ridge)$",
                        },
                        "checkpoint": {"enum": ["forecast-model.joblib", "ridge-model.joblib"]},
                        "evaluation": {
                            "enum": ["data/derived/benchmark.json", "data/derived/learned-comparison.json"]
                        },
                    },
                },
            },
        },
    }
    write(schemas / "model-registry.schema.json", registry_schema)
    api_path = ROOT / "docs/contracts/api.openapi.json"
    api = json.loads(api_path.read_text(encoding="utf-8"))
    api["components"]["schemas"]["LearnedComparison"] = {"$ref": "schemas/learned-comparison.schema.json"}
    api["components"]["schemas"]["ModelRegistry"] = {"$ref": "schemas/model-registry.schema.json"}
    write(api_path, api)
    catalog_path = ROOT / "docs/contracts/catalog.md"
    catalog = catalog_path.read_text(encoding="utf-8")
    catalog = catalog.replace(
        "| data/derived/state-model.json | data/derived/state-model.json |",
        "| data/derived/state-model.json | data/derived/state-model*.json |",
    )
    if "| learned-comparison |" not in catalog:
        row = "| learned-comparison | 1.0.0 | data-pipeline/pipeline/stages/learned_compare.py | docs/contracts/schemas/learned-comparison.schema.json | data/derived/learned-comparison.json | data/derived/learned-comparison.json | tests/test_ridge.py | frontend/src/lib/contract.test.ts | missing: second learned comparison is unavailable; never reuse another model's result | fixture:docs/contracts/fixtures/data/derived/learned-comparison.json | - | tests/test_ridge.py | real |\n"
        catalog = catalog.replace("\n## Missing-data states", row + "\n## Missing-data states")
        catalog += "| learned-comparison | 1.0.0 | 2026-11-01 | paired Ridge extension with explicit reused test-seed design | initial |\n"
    catalog = catalog.replace("| api | 3.0.0 | app/", "| api | 3.1.0 | app/")
    if "| model-registry |" not in catalog:
        catalog = catalog.replace(
            "\n## Missing-data states",
            "| model-registry | 1.0.0 | models/registry.json | docs/contracts/schemas/model-registry.schema.json | models/registry.json | models/registry.json | tests/test_ridge.py | tests/test_ridge.py | missing: trained model coverage is unknown and validation refuses the release | fixture:models/registry.json | - | tests/test_ridge.py | real |\n\n## Missing-data states",
        )
        catalog += "| model-registry | 1.0.0 | 2026-11-01 | explicit two-family checkpoint and evaluation completeness | initial |\n"
    if "| api | 3.1.0 |" not in catalog:
        catalog += "| api | 3.1.0 | 2026-11-01 | add typed paired learned comparison component | minor |\n"
    catalog = catalog.replace("| api | 3.1.0 | app/", "| api | 3.2.0 | app/").replace(
        "| learned-comparison | 1.0.0 | data-pipeline/", "| learned-comparison | 1.0.1 | data-pipeline/"
    )
    if "| api | 3.2.0 |" not in catalog:
        catalog += "| api | 3.2.0 | 2026-11-01 | add typed model registry component | minor |\n"
    if "| learned-comparison | 1.0.1 |" not in catalog:
        catalog += "| learned-comparison | 1.0.1 | 2026-11-01 | correct pair aggregate cardinality to exactly two families | patch |\n"
    catalog_path.write_text(catalog, encoding="utf-8")
    lock_path = ROOT / "docs/contracts/versions.lock.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    print(
        "Added schema/OpenAPI/catalog boundary; update the lock through check_contract_versions.py --update"
    )
    # Read its format so a malformed existing lock fails without silently rewriting it.
    assert isinstance(lock, dict)
    print(
        "schema SHA-256",
        hashlib.sha256((schemas / "learned-comparison.schema.json").read_bytes()).hexdigest(),
    )


if __name__ == "__main__":
    main()
