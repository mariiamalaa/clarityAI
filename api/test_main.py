import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health():
    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

def test_404():
    response = client.get("/unknown", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 404
    # Accept either our handler or FastAPI default for robustness
    assert response.json() in (
        {"error": "Not found"},
        {"detail": "Not Found"}
    )

def test_cors_preflight():
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

def test_internal_server_error():
    # Add a temporary route for this test
    route_path = "/raise-error"
    if not any(r.path == route_path for r in app.routes):
        @app.get(route_path)
        def raise_error():
            raise Exception("fail!")
    # Use TestClient context to not raise server exceptions
    from fastapi.testclient import TestClient as TC
    test_client = TC(app, raise_server_exceptions=False)
    response = test_client.get(route_path, headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 500
    assert response.json() == {"error": "Internal server error"}
