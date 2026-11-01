"""OreBridge's reproducible engine consumers, plant models and causal experiments."""

from pathlib import Path

# VERSION at the repository root is the only place the version is written (T4); every manifest records it.
__version__ = (Path(__file__).resolve().parents[2] / "VERSION").read_text(encoding="utf-8").strip()
