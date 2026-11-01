from fastapi.testclient import TestClient

from app.main import create_app


def test_replay_api_serves_real_graph_and_index():
    client = TestClient(create_app())
    assert len(client.get("/api/plant").json()["assets"]) == 36
    assert client.get("/api/index").json()["n_cases"] == 12
    assert len(client.get("/api/engines").json()["records"]) == 14
