"""Read-only, allow-listed OPC UA observation adapter for a site-local gateway."""

from __future__ import annotations

import hashlib
import hmac
import json
import math
import os
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "data-pipeline") not in sys.path:
    sys.path.insert(0, str(ROOT / "data-pipeline"))
from pipeline.model.observations import canonical, validate_observation  # noqa: E402 (explicit local script import root)


@dataclass(frozen=True)
class GatewayConfig:
    endpoint: str | None = None
    token: str | None = None
    bindings: tuple[dict, ...] = ()
    origins: tuple[str, ...] = ("http://localhost:5173",)
    security_string: str | None = None
    allow_local_test: bool = False
    max_age_s: float = 15

    @classmethod
    def from_env(cls):
        binding_file = os.environ.get("OREBRIDGE_TAG_MAP")
        bindings = tuple(json.loads(Path(binding_file).read_text(encoding="utf-8"))) if binding_file else ()
        return cls(
            endpoint=os.environ.get("OREBRIDGE_OPC_ENDPOINT"),
            token=os.environ.get("OREBRIDGE_GATEWAY_TOKEN"),
            bindings=bindings,
            origins=tuple(
                x.strip()
                for x in os.environ.get("OREBRIDGE_ORIGINS", "http://localhost:5173").split(",")
                if x.strip()
            ),
            security_string=os.environ.get("OREBRIDGE_OPC_SECURITY"),
            allow_local_test=os.environ.get("OREBRIDGE_ALLOW_LOCAL_TEST") == "1",
        )

    def validate(self):
        if not self.endpoint or not self.bindings:
            raise ValueError("source_not_configured")
        if not self.token or len(self.token) < 24:
            raise ValueError("gateway_token_too_short")
        host = urlparse(self.endpoint).hostname
        if urlparse(self.endpoint).scheme != "opc.tcp":
            raise ValueError("unsupported_opc_transport")
        local = host in ("localhost", "127.0.0.1", "::1")
        secure = (
            self.security_string
            and len(self.security_string.split(",")) >= 5
            and self.security_string.split(",")[:2]
            in [
                ["Basic256Sha256", "SignAndEncrypt"],
                ["Aes128Sha256RsaOaep", "SignAndEncrypt"],
                ["Aes256Sha256RsaPss", "SignAndEncrypt"],
            ]
        )
        if not secure and not (local and self.allow_local_test):
            raise ValueError("signed_encrypted_source_required")
        if len(self.bindings) > 2000:
            raise ValueError("tag_budget_exceeded")
        if not math.isfinite(self.max_age_s) or not 0 < self.max_age_s <= 15:
            raise ValueError("invalid_freshness_window")
        ids = [r["tag_id"] for r in self.bindings]
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate_tag_binding")
        if "*" in self.origins:
            raise ValueError("wildcard_gateway_origin_forbidden")
        if not (ROOT / "data/derived/plant.json").is_file():
            raise ValueError("plant_graph_not_available")
        graph = json.loads((ROOT / "data/derived/plant.json").read_text(encoding="utf-8"))
        tags = {t["tag_id"]: t for t in graph["tags"]}
        for r in self.bindings:
            if not r.get("node_id") or not r.get("unit") or not r.get("asset_id"):
                raise ValueError("incomplete_tag_binding")
            tag = tags.get(r["tag_id"])
            if not tag or any(r[k] != tag[k] for k in ("asset_id", "unit")):
                raise ValueError("unknown_semantic_tag_binding")
            canonical(1, r.get("source_unit", r["unit"]), tag["unit"])
            if any(not math.isfinite(r[k]) for k in ("minimum", "maximum") if k in r):
                raise ValueError("nonfinite_engineering_bound")
            if r.get("minimum", tag["minimum"]) < tag["minimum"]:
                raise ValueError("bound_outside_plant_domain")
            if r.get("freshness_basis") not in ("source", "server"):
                raise ValueError("explicit_freshness_policy_required")


class OPCReader:
    def __init__(self, config: GatewayConfig):
        config.validate()
        self.config = config
        self.sequence = 0
        self.previous = {}

    async def read(self):
        from asyncua import Client

        client = Client(url=self.config.endpoint, timeout=5)
        if self.config.security_string:
            await client.set_security_string(self.config.security_string)
        self.sequence += 1
        records = []
        async with client:
            # One read transaction preserves individual status codes and source times.
            nodes = [client.get_node(binding["node_id"]) for binding in self.config.bindings]
            values = await client.read_attributes(nodes)
            for binding, dv in zip(self.config.bindings, values, strict=True):
                now = datetime.now(UTC).isoformat()
                source = dv.SourceTimestamp
                record = {
                    "tag_id": binding["tag_id"],
                    "asset_id": binding["asset_id"],
                    "value": dv.Value.Value if dv.Value is not None else None,
                    "unit": binding.get("source_unit", binding["unit"]),
                    "source_time": source.isoformat() if source else None,
                    "server_time": dv.ServerTimestamp.isoformat() if dv.ServerTimestamp else None,
                    "freshness_basis": binding["freshness_basis"],
                    "receipt_time": now,
                    "sequence": self.sequence,
                    "quality": "good" if dv.StatusCode.is_good() and source else "uncertain",
                }
                verdict = validate_observation(
                    record,
                    {"minimum": 0, **binding},
                    now,
                    self.previous.get(binding["tag_id"]),
                    max_age_s=self.config.max_age_s,
                )
                if verdict.accepted:
                    record = {**record, "value": verdict.value, "unit": binding["unit"]}
                    self.previous[binding["tag_id"]] = record
                else:
                    record = {**record, "value": None, "unit": binding["unit"], "quality": "bad"}
                records.append(record)
        return records


def token_matches(provided: str | None, expected: str | None):
    if not provided or not expected:
        return False
    return hmac.compare_digest(
        hashlib.sha256(provided.encode()).digest(), hashlib.sha256(expected.encode()).digest()
    )
