"""The template's own contract tests share the helpers of tests/contracts/ (contract_schemas.py)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "contracts"))
