"""Idempotent seed data for local development and demos.

Run with:
    python -m app.db.seed

Safe to re-run: each entity is looked up by a natural key (email for users,
company email for customers) before insert, so re-running never duplicates
rows.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.logging import configure_logging, get_logger
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.ai_insight import AIInsight, AIInsightStatus, Sentiment
from app.models.customer import Customer, CustomerStatus
from app.models.interaction import Interaction
from app.models.user import User, UserRole

configure_logging("INFO")
logger = get_logger(__name__)

SEED_USERS = [
    {
        "name": "Avery Admin",
        "email": "admin@e2m.dev",
        "password": "AdminPass123!",
        "role": UserRole.ADMIN,
    },
    {
        "name": "Morgan Manager",
        "email": "manager@e2m.dev",
        "password": "ManagerPass123!",
        "role": UserRole.MANAGER,
    },
    {
        "name": "Riley User",
        "email": "user@e2m.dev",
        "password": "UserPass123!",
        "role": UserRole.USER,
    },
]

SEED_CUSTOMERS = [
    {
        "company_name": "Acme Corp",
        "contact_name": "Jane Cooper",
        "email": "jane.cooper@acme.test",
        "phone": "+1-555-0101",
        "status": CustomerStatus.ACTIVE,
    },
    {
        "company_name": "Globex Inc",
        "contact_name": "Devon Lane",
        "email": "devon.lane@globex.test",
        "phone": "+1-555-0102",
        "status": CustomerStatus.ACTIVE,
    },
    {
        "company_name": "Initech",
        "contact_name": "Cameron Wells",
        "email": "cameron.wells@initech.test",
        "phone": "+1-555-0103",
        "status": CustomerStatus.PROSPECT,
    },
    {
        "company_name": "Umbrella Holdings",
        "contact_name": "Jordan Blake",
        "email": "jordan.blake@umbrella.test",
        "phone": "+1-555-0104",
        "status": CustomerStatus.CHURNED,
    },
    {
        "company_name": "Soylent Co",
        "contact_name": "Taylor Reed",
        "email": "taylor.reed@soylent.test",
        "phone": "+1-555-0105",
        "status": CustomerStatus.INACTIVE,
    },
]

# (customer index, title, notes, days ago, sentiment, summary, action_items, risks)
SEED_INTERACTIONS = [
    (
        0,
        "Quarterly business review",
        "Walked through Q3 usage metrics. Customer is happy with the rollout and "
        "wants to expand seats next quarter.",
        2,
        Sentiment.POSITIVE,
        "Acme is satisfied with the rollout and plans to expand seats next quarter.",
        ["Send expansion quote for 50 additional seats", "Schedule follow-up in 30 days"],
        [],
    ),
    (
        0,
        "Onboarding kickoff",
        "Kicked off onboarding with the IT team. They flagged SSO configuration "
        "as a blocker for go-live.",
        20,
        Sentiment.NEUTRAL,
        "Onboarding started; SSO configuration is pending and blocking go-live.",
        ["Share SSO setup guide", "Pair with their IT admin on SAML config"],
        ["Go-live date at risk if SSO isn't resolved this week"],
    ),
    (
        1,
        "Renewal negotiation",
        "Customer pushed back hard on the renewal price increase and threatened "
        "to evaluate competitors.",
        5,
        Sentiment.NEGATIVE,
        "Customer is unhappy with the proposed renewal price increase and is "
        "considering competitors.",
        ["Prepare a retention discount option", "Loop in account director before next call"],
        ["High churn risk this renewal cycle"],
    ),
    (
        2,
        "Discovery call",
        "First call with Initech. They are evaluating three vendors and want "
        "a technical deep-dive next.",
        1,
        Sentiment.NEUTRAL,
        "Initech is in early evaluation across three vendors; requested a technical deep-dive.",
        ["Schedule technical deep-dive with their engineering lead"],
        [],
    ),
    (
        3,
        "Churn exit interview",
        "Umbrella confirmed they are not renewing due to budget cuts, not product dissatisfaction.",
        45,
        Sentiment.NEGATIVE,
        "Umbrella is churning due to internal budget cuts rather than product issues.",
        ["Log churn reason as budget-related", "Re-engage in 6 months"],
        ["Lost account — budget driven, low win-back probability short-term"],
    ),
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        user_ids: dict[str, str] = {}
        for entry in SEED_USERS:
            existing = (
                await session.execute(select(User).where(User.email == entry["email"]))
            ).scalar_one_or_none()
            if existing:
                user_ids[entry["email"]] = existing.id
                continue
            user = User(
                name=entry["name"],
                email=entry["email"],
                password_hash=hash_password(entry["password"]),
                role=entry["role"],
            )
            session.add(user)
            await session.flush()
            user_ids[entry["email"]] = user.id
            logger.info("Seeded user %s (%s)", entry["email"], entry["role"].value)

        admin_id = user_ids[SEED_USERS[0]["email"]]

        customers: list[Customer] = []
        for entry in SEED_CUSTOMERS:
            existing = (
                await session.execute(select(Customer).where(Customer.email == entry["email"]))
            ).scalar_one_or_none()
            if existing:
                customers.append(existing)
                continue
            customer = Customer(
                company_name=entry["company_name"],
                contact_name=entry["contact_name"],
                email=entry["email"],
                phone=entry["phone"],
                status=entry["status"],
                created_by_id=admin_id,
            )
            session.add(customer)
            await session.flush()
            customers.append(customer)
            logger.info("Seeded customer %s", entry["company_name"])

        for (
            customer_idx,
            title,
            notes,
            days_ago,
            sentiment,
            summary,
            action_items,
            risks,
        ) in SEED_INTERACTIONS:
            customer = customers[customer_idx]
            existing = (
                await session.execute(
                    select(Interaction).where(
                        Interaction.customer_id == customer.id, Interaction.title == title
                    )
                )
            ).scalar_one_or_none()
            if existing:
                continue

            meeting_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
            interaction = Interaction(
                customer_id=customer.id,
                title=title,
                notes=notes,
                meeting_date=meeting_date,
                created_by_id=admin_id,
            )
            session.add(interaction)
            await session.flush()

            session.add(
                AIInsight(
                    interaction_id=interaction.id,
                    status=AIInsightStatus.COMPLETED,
                    summary=summary,
                    sentiment=sentiment,
                    action_items=action_items,
                    risks=risks,
                )
            )
            logger.info("Seeded interaction '%s' for %s", title, customer.company_name)

        await session.commit()
    logger.info("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
