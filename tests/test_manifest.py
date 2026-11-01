import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data/derived"


def test_manifest_matches_artifact_and_gate():
    index = json.loads((ROOT / "manifests/index.json").read_text())
    for entry in index["cases"]:
        m = json.loads((ROOT / entry["manifest_path"]).read_text())
        raw = (ROOT / m["artifact"]["path"]).read_bytes()
        assert len(raw) == m["artifact"]["bytes"]
        assert hashlib.sha256(raw).hexdigest() == m["artifact"]["sha256"]
        assert m["lane"] == m["gate"]["lane"] == "replay"
