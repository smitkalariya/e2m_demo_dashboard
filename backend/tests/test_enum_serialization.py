"""SQLite (used everywhere else in this suite) has no native ENUM type, so it
never enforces the Postgres CHECK constraint that pins enum columns to their
lowercase migration-defined labels (e.g. "admin", not "ADMIN"). Without
`values_callable`, SQLAlchemy's Enum type binds by the Python enum member's
`.name` by default, which only surfaces as a hard failure against a real
Postgres database. These tests exercise the bind processor directly against
the Postgres dialect — no DB connection required — so a regression here is
caught without needing to run against real Postgres."""

from sqlalchemy.dialects import postgresql

from app.models.ai_insight import AIInsight, AIInsightStatus, Sentiment
from app.models.customer import Customer, CustomerStatus
from app.models.user import User, UserRole

DIALECT = postgresql.dialect()


def _bound_value(column, member):
    processor = column.type.bind_processor(DIALECT)
    return processor(member) if processor else member


def test_user_role_binds_by_value_not_name():
    column = User.__table__.c.role
    assert _bound_value(column, UserRole.ADMIN) == "admin"
    assert _bound_value(column, UserRole.MANAGER) == "manager"
    assert _bound_value(column, UserRole.USER) == "user"


def test_customer_status_binds_by_value_not_name():
    column = Customer.__table__.c.status
    assert _bound_value(column, CustomerStatus.ACTIVE) == "active"
    assert _bound_value(column, CustomerStatus.CHURNED) == "churned"


def test_ai_insight_status_binds_by_value_not_name():
    column = AIInsight.__table__.c.status
    assert _bound_value(column, AIInsightStatus.COMPLETED) == "completed"


def test_ai_insight_sentiment_binds_by_value_not_name():
    column = AIInsight.__table__.c.sentiment
    assert _bound_value(column, Sentiment.NEGATIVE) == "negative"
