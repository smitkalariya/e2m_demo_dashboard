from sqlalchemy import select

from app.db import seed as seed_module
from app.models.ai_insight import AIInsight
from app.models.customer import Customer
from app.models.interaction import Interaction
from app.models.user import User
from tests.conftest import TestSessionLocal


async def test_seed_creates_users_customers_interactions_and_insights(monkeypatch):
    monkeypatch.setattr(seed_module, "AsyncSessionLocal", TestSessionLocal)

    await seed_module.seed()

    async with TestSessionLocal() as session:
        users = (await session.execute(select(User))).scalars().all()
        customers = (await session.execute(select(Customer))).scalars().all()
        interactions = (await session.execute(select(Interaction))).scalars().all()
        insights = (await session.execute(select(AIInsight))).scalars().all()

    assert len(users) == len(seed_module.SEED_USERS)
    assert len(customers) == len(seed_module.SEED_CUSTOMERS)
    assert len(interactions) == len(seed_module.SEED_INTERACTIONS)
    assert len(insights) == len(seed_module.SEED_INTERACTIONS)
    assert all(insight.status.value == "completed" for insight in insights)


async def test_seed_is_idempotent(monkeypatch):
    monkeypatch.setattr(seed_module, "AsyncSessionLocal", TestSessionLocal)

    await seed_module.seed()
    await seed_module.seed()

    async with TestSessionLocal() as session:
        users = (await session.execute(select(User))).scalars().all()
        customers = (await session.execute(select(Customer))).scalars().all()
        interactions = (await session.execute(select(Interaction))).scalars().all()

    assert len(users) == len(seed_module.SEED_USERS)
    assert len(customers) == len(seed_module.SEED_CUSTOMERS)
    assert len(interactions) == len(seed_module.SEED_INTERACTIONS)
