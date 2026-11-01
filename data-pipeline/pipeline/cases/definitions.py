"""Scenario identity metadata for cheap checks, with no scientific imports."""

FAMILIES = [
    ("healthy", "Operating load change", "Cambio de carga operativa", "controls"),
    ("bias", "Flotation feed bias", "Sesgo de alimentación a flotación", "process"),
    ("drift", "Cyclone flow drift", "Deriva del caudal de ciclones", "process"),
    ("frozen", "Frozen mill observation", "Observación congelada del molino", "data-quality"),
    ("unit", "Incompatible water unit", "Unidad de agua incompatible", "data-quality"),
    ("mapping", "Wrong equipment binding", "Vínculo de equipo incorrecto", "data-quality"),
    ("missing", "Missing water observation", "Observación de agua ausente", "data-quality"),
    ("ordering", "Out-of-order cyclone data", "Datos de ciclón desordenados", "data-quality"),
    ("imbalance", "Concentrate balance break", "Ruptura del balance de concentrado", "process"),
    ("engine", "Changed recovery relation", "Relación de recuperación modificada", "model-mismatch"),
    ("water", "Return-water discrepancy", "Discrepancia del agua recuperada", "process"),
    ("delay", "Unmodeled transport delay", "Retardo de transporte no modelado", "controls"),
]
