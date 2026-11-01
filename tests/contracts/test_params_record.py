import json
from dataclasses import asdict
from pathlib import Path

from jsonschema import Draft202012Validator
from pipeline.io.contract import validate_rows


def test_schema_and_producer_accept_the_same_reference_record():
    root=Path(__file__).resolve().parents[2]
    value=json.loads((root/'docs/contracts/examples/params-record.json').read_text())
    report=validate_rows([value]);assert len(report.accepted)==1
    schema=json.loads((root/'docs/contracts/schemas/params-record.schema.json').read_text())
    Draft202012Validator(schema).validate(asdict(report.accepted[0]))
