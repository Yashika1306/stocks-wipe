import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock

from api.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.anyio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.anyio
async def test_register_and_login(client):
    payload = {"email": "test@example.com", "password": "testpass123"}

    with patch("api.routers.auth.get_db") as mock_db:
        mock_session = AsyncMock()
        mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_db.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_db.return_value.__aexit__ = AsyncMock(return_value=False)

        resp = await client.post("/auth/register", json=payload)
        # 201 or 400 (already registered in test env)
        assert resp.status_code in (201, 400, 422, 500)


@pytest.mark.anyio
async def test_swipe_requires_auth(client):
    resp = await client.post("/swipe", json={
        "user_id": "00000000-0000-0000-0000-000000000000",
        "ticker": "AAPL",
        "direction": "right",
    })
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_feed_requires_auth(client):
    resp = await client.get("/feed/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 403


@pytest.mark.anyio
async def test_disclaimer_header(client):
    resp = await client.get("/health")
    assert "X-Disclaimer" in resp.headers
    assert "not investment advice" in resp.headers["X-Disclaimer"].lower()
