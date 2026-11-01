"""Scientific trace boundary. Construction belongs to the plant bake."""

TRACE_SCHEMA = "orebridge.trace/v1"


def build_trace(result):
    if result.get("schema") != TRACE_SCHEMA:
        raise ValueError("unsupported trace schema")
    return dict(result)
