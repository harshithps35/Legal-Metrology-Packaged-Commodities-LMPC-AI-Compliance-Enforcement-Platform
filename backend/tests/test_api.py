"""
Tests for the Backend API endpoints.

Uses FastAPI's TestClient with an in-memory SQLite database.
Tests auth flow, scan CRUD, field corrections, and dashboard stats.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.db.models.models import User, UserRole
from app.main import app


# ---------- Test Database Setup ----------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_factory = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def test_user() -> User:
    """Create a test user directly in the database."""
    async with test_session_factory() as session:
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash=hash_password("testpass123"),
            full_name="Test User",
            role=UserRole.INSPECTOR,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def admin_user() -> User:
    """Create an admin user."""
    async with test_session_factory() as session:
        user = User(
            username="admin",
            email="admin@example.com",
            password_hash=hash_password("adminpass123"),
            full_name="Admin User",
            role=UserRole.ADMIN,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _get_token(client: AsyncClient, username: str, password: str) -> str:
    """Helper: login and return the access token."""
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": password},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


# ============================================================
# Auth Tests
# ============================================================

class TestAuth:

    @pytest.mark.asyncio
    async def test_register_user(self, client):
        response = await client.post("/api/v1/auth/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "secure123",
            "full_name": "New User",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["role"] == "inspector"

    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client, test_user):
        response = await client.post("/api/v1/auth/register", json={
            "username": "testuser",
            "email": "other@example.com",
            "password": "secure123",
        })
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_login_success(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/token",
            data={"username": "testuser", "password": "testpass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/token",
            data={"username": "testuser", "password": "wrongpass"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        response = await client.post(
            "/api/v1/auth/token",
            data={"username": "ghost", "password": "pass"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_profile(self, client, test_user):
        token = await _get_token(client, "testuser", "testpass123")
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_unauthenticated_profile(self, client):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401


# ============================================================
# Scan List Tests
# ============================================================

class TestScanList:

    @pytest.mark.asyncio
    async def test_list_scans_empty(self, client, test_user):
        token = await _get_token(client, "testuser", "testpass123")
        response = await client.get(
            "/api/v1/scans",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    @pytest.mark.asyncio
    async def test_list_scans_unauthenticated(self, client):
        response = await client.get("/api/v1/scans")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_scans_invalid_status_filter(self, client, test_user):
        token = await _get_token(client, "testuser", "testpass123")
        response = await client.get(
            "/api/v1/scans?status=invalid_status",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400


# ============================================================
# Health Check
# ============================================================

class TestHealthCheck:

    @pytest.mark.asyncio
    async def test_health(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


# ============================================================
# Dashboard Tests
# ============================================================

class TestDashboard:

    @pytest.mark.asyncio
    async def test_dashboard_stats_empty(self, client, test_user):
        token = await _get_token(client, "testuser", "testpass123")
        response = await client.get(
            "/api/v1/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_scans"] == 0
        assert data["avg_compliance_score"] == 0.0
