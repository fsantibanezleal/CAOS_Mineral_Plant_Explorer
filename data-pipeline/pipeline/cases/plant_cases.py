"""Plant cases differ by a declared observation/process disturbance."""

from dataclasses import dataclass

from ..cases.definitions import FAMILIES


@dataclass(frozen=True)
class Case:
    id: str
    title: dict[str, str]
    category: dict[str, str]
    family: str


NAMES = {
    "controls": {"en": "Controls", "es": "Controles"},
    "process": {"en": "Process coherence", "es": "Coherencia de procesos"},
    "data-quality": {"en": "Observation quality", "es": "Calidad de observaciones"},
    "model-mismatch": {"en": "Model compatibility", "es": "Compatibilidad de modelos"},
}
CASES = [
    Case(f"PL-{i + 1:02}", {"en": en, "es": es}, NAMES[kind], family)
    for i, (family, en, es, kind) in enumerate(FAMILIES)
]
DEFAULT_CASE = "PL-01"
