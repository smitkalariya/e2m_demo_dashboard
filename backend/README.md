# E2M Backend

FastAPI + PostgreSQL + Redis backend for the E2M AI-powered customer success platform. See the [root README](../README.md) for the full system overview, Docker setup, and deployment guide — this file covers backend-specific structure and commands.

## Stack

Python 3.12, FastAPI, SQLAlchemy 2.0 (async, asyncpg), Alembic, PostgreSQL, Redis, PyJWT, bcrypt, OpenAI SDK, Pytest.

## Architecture

Clean Architecture, strictly layered:

```
Route (app/api/v1/)        → validates input via Pydantic, calls a service, returns a response
Service (app/services/)    → business logic, cache invalidation, orchestration — no DB queries here
Repository (app/repositories/) → all DB access; routes/services never query the DB directly
```

```
app/
├── api/v1/         # routers — one module per resource (auth, customers, interactions, dashboard)
├── core/           # config (env-driven Settings), security (JWT/bcrypt), exceptions, responses, logging
├── db/             # session/engine, declarative Base + mixins, seed.py
├── models/         # SQLAlchemy ORM models
├── schemas/        # Pydantic request/response schemas
├── services/       # business logic layer
├── repositories/   # data access layer
├── dependencies/   # FastAPI dependencies (auth, role guards)
├── middleware/     # ASGI middleware (rate limiting)
├── cache/          # Redis client, cache key helpers, token blocklist
└── ai/             # prompt_builder → openai_client → response_parser
```

## Getting Started

```bash
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Requires PostgreSQL and Redis reachable at `DATABASE_URL`/`REDIS_URL` — `docker compose up postgres redis` from the repo root is the quickest way to get both.

API docs: `http://localhost:8000/docs` (Swagger) and `/redoc` (ReDoc), auto-generated from the route/schema definitions.

## Seed Data

```bash
python -m app.db.seed
```

Idempotent: creates one admin, one manager, one user, five demo customers, and five interactions with pre-populated AI insights spanning all three sentiments. Safe to re-run — it looks up each row by natural key before inserting.

## Testing

```bash
pytest --cov=app --cov-report=term-missing
```

Runs against an in-memory SQLite database (`tests/conftest.py`) and `fakeredis` — no running Postgres/Redis/Docker required. 75 tests, 98% coverage as of the last run.

## Linting

```bash
ruff check .
black --check .
isort --check .
```

## Database

- UUID primary keys, `created_at`/`updated_at` on every table, soft-delete (`deleted_at`) on `users`/`customers`/`interactions`.
- Migrations: `alembic revision --autogenerate -m "..."` then `alembic upgrade head`. Migrations live in `alembic/versions/`.
- Indexes: `users.email` (unique), `users.role`, `customers.company_name`/`email`/`status`, `interactions.customer_id`/`meeting_date`, `ai_insights.interaction_id` (unique).

## Security

- Passwords hashed with bcrypt; JWT access (15 min) + refresh (7 day) tokens, refresh tokens are single-use (rotated + blocklisted in Redis on use/logout).
- `JWT_SECRET_KEY` has a hardcoded development default but the app **refuses to start** if `ENVIRONMENT=production` and that default hasn't been overridden — set a real value via env var.
- `RateLimitMiddleware` (`app/middleware/rate_limit.py`) enforces a per-IP, per-minute limit on every route except `/health` (`RATE_LIMIT_PER_MINUTE`, default 120) with a tighter limit on `/api/v1/auth/*` (`AUTH_RATE_LIMIT_PER_MINUTE`, default 20).
- Role-based access control (`admin`/`manager`/`user`) enforced via `require_roles(...)` FastAPI dependencies on every mutating route.
