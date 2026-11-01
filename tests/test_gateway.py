"""Gateway security and an actual OPC UA server/client round trip."""

import asyncio
import socket
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.gateway import GatewayConfig, OPCReader
from app.main import create_app

TOKEN = "test-local-gateway-token-32-characters"
BINDING = {
    "tag_id": "ROM.feed",
    "asset_id": "ROM",
    "unit": "t/h",
    "node_id": "ns=2;s=feed",
    "minimum": 0,
    "freshness_basis": "server",
}


def config(**kwargs):
    return GatewayConfig(
        endpoint="opc.tcp://127.0.0.1:4840", token=TOKEN, bindings=(BINDING,), allow_local_test=True, **kwargs
    )


def test_adversarial_token_and_allowlist():
    class Reader:
        async def read(self):
            return []

    client = TestClient(create_app(config(), Reader()))
    assert client.get("/api/observations").status_code == 401
    assert client.get("/api/observations", headers={"Authorization": "Bearer wrong"}).status_code == 401
    r = client.get("/api/observations?node_id=ns=2;s=unlisted", headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 200 and r.json()["records"] == []
    assert (
        client.options(
            "/api/observations",
            headers={"Origin": "https://evil.invalid", "Access-Control-Request-Method": "GET"},
        ).status_code
        == 400
    )


def test_adversarial_remote_security():
    with pytest.raises(ValueError, match="signed_encrypted"):
        GatewayConfig(endpoint="opc.tcp://plant.invalid:4840", token=TOKEN, bindings=(BINDING,)).validate()
    with pytest.raises(ValueError, match="wildcard"):
        config(origins=("*",)).validate()


def test_adversarial_no_writes_or_traversal():
    client = TestClient(create_app())
    assert client.post("/api/observations", json={"value": 9}).status_code == 405
    assert client.get("/api/artifacts/%2e%2e/%2e%2e/product.json").status_code != 200
    assert client.get("/health").json()["read_only"] is True


def test_adversarial_real_opc_stale():
    async def run():
        from asyncua import Server, ua

        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            port = s.getsockname()[1]
        server = Server()
        await server.init()
        server.set_endpoint(f"opc.tcp://127.0.0.1:{port}")
        ns = await server.register_namespace("urn:orebridge:local-test")
        node = await server.nodes.objects.add_variable(ua.NodeId("feed", ns), "feed", 720.0)
        await server.nodes.objects.add_variable(ua.NodeId("unlisted", ns), "unlisted", 999.0)
        cfg = GatewayConfig(
            endpoint=f"opc.tcp://127.0.0.1:{port}",
            token=TOKEN,
            bindings=(
                {**BINDING, "node_id": node.nodeid.to_string()},
                {**BINDING, "tag_id": "CR1.product", "asset_id": "CR1", "node_id": f"ns={ns};s=missing"},
            ),
            allow_local_test=True,
        )
        async with server:
            reader = OPCReader(cfg)
            records = await reader.read()
            good = records[0]
            assert (
                records[1]["value"] is None
                and records[1]["quality"] == "bad"
                and records[1]["source_time"] is None
            )
            assert good["value"] == 720 and good["quality"] == "good"
            dv = ua.DataValue(ua.Variant(730.0, ua.VariantType.Double))
            dv.SourceTimestamp = datetime.now(UTC) - timedelta(minutes=3)
            dv.ServerTimestamp = datetime.now(UTC)
            await node.write_value(dv)
            reader = OPCReader(cfg)
            constant = (await reader.read())[0]
            assert constant["value"] == 730 and constant["quality"] == "good"
            # The real server confirms the constant value on read. A source-time
            # sampling policy instead refuses its old change timestamp.
            from dataclasses import replace

            reader = OPCReader(
                replace(cfg, bindings=tuple({**b, "freshness_basis": "source"} for b in cfg.bindings))
            )
            stale = (await reader.read())[0]
            assert stale["value"] is None and stale["quality"] == "bad"
            assert len(await reader.read()) == 2

    asyncio.run(run())
