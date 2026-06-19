import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.cache import redis_client
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.customer import Customer
from app.models.user import User

# In-memory SQLite for tests — keeps the suite fast and dependency-free.
# StaticPool keeps a single shared connection alive (in-memory SQLite is
# per-connection, so the default pool would give every checkout a blank DB).
# A real PostgreSQL is exercised via docker-compose for manual/integration checks.
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False)


async def _override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_client, "get_redis", lambda: fake)
    yield fake


@pytest.fixture
async def client():
    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def set_user_role():
    """Promote a registered user's role directly in the DB (no API surface for this)."""

    async def _set(email: str, role: str) -> None:
        async with TestSessionLocal() as session:
            await session.execute(update(User).where(User.email == email).values(role=role))
            await session.commit()

    return _set


@pytest.fixture
def insert_customer_directly():
    """Write a Customer row straight to the DB, bypassing CustomerService — used to
    prove the list cache returns a stale snapshot until a service-layer write
    invalidates it."""

    async def _insert(company_name: str, created_by_email: str) -> None:
        async with TestSessionLocal() as session:
            user = (
                await session.execute(select(User).where(User.email == created_by_email))
            ).scalar_one()
            slug = company_name.lower().replace(" ", "-")
            session.add(
                Customer(
                    company_name=company_name,
                    contact_name="Direct Insert",
                    email=f"{slug}@example.com",
                    created_by_id=user.id,
                )
            )
            await session.commit()

    return _insert
