# AI-Powered Customer Success Platform

A full-stack Customer Success Insights Dashboard: JWT authentication with role-based access control, customer and interaction management, AI-generated meeting insights (summary, sentiment, action items, risks), a metrics dashboard, and Redis-backed caching — built with FastAPI + PostgreSQL on the backend and Next.js (App Router) + Redux Toolkit on the frontend.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL, Redis |
| Auth | JWT (access + refresh, httpOnly cookies), bcrypt, Redis-backed refresh-token blocklist |
| AI | OpenAI (`AsyncOpenAI`), strict JSON-mode prompting, Pydantic-validated parsing |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Redux Toolkit, Axios, Tailwind CSS, React Hook Form + Zod |
| Infra | Docker, Docker Compose |
| Testing | Pytest (70 tests, 98% coverage), Jest + React Testing Library (54 tests) |

## Architecture

**Backend** follows Clean Architecture: `Route → Service → Repository → Database`. Routes only validate input and delegate; all business logic lives in `app/services/`, all persistence in `app/repositories/`. AI generation is isolated behind `app/ai/` (`prompt_builder` → `openai_client` → `response_parser`), orchestrated by `AIInsightService`, which never lets an AI failure block interaction creation — a failed/timed-out/malformed AI call is persisted as an `AIInsight` row with `status=failed` and an `error_message`, and the UI exposes a regenerate action.

**Frontend** is feature-based (`src/features/{auth,customers,interactions,dashboard,ai-insights}/`). Redux Toolkit is scoped to auth, dashboard metrics, and per-feature list/filter state; forms and local UI state use local component state. All network access goes through `src/services/*.service.ts`, which wrap a single Axios instance (`src/services/axios.ts`) with a refresh-on-401 interceptor. `next.config.ts` rewrites `/api/v1/*` to the backend so the browser only ever talks to a single origin, keeping the httpOnly auth cookies visible to both Axios and the route-protection proxy (`src/proxy.ts`).

## RBAC Matrix

| Action | Admin | Manager | User |
|---|---|---|---|
| View customers / interactions / dashboard | ✅ | ✅ | ✅ |
| Create / update customers | ✅ | ✅ | ❌ |
| Create / update interactions | ✅ | ✅ | ✅ |
| Delete customers / interactions | ✅ | ✅ | ❌ |
| Trigger / regenerate AI insight | ✅ | ✅ | ❌ |

Enforced server-side via `require_roles(...)` FastAPI dependencies (the source of truth) and mirrored client-side via `useAuth().hasRole(...)` for UI gating only.

## Running with Docker (recommended)

Requires Docker Desktop with a working Linux container backend (WSL2 on Windows, or Hyper-V). Verify the engine is actually reachable before building — `docker info` should return without hanging; if it doesn't, Docker Desktop's VM backend isn't running (commonly because WSL2 isn't installed, or, in a virtualized/cloud Windows environment, because nested virtualization isn't exposed to the guest).

```bash
cp .env.example .env        # set JWT_SECRET_KEY and (optionally) OPENAI_API_KEY
docker compose up --build
```

This starts four services: `postgres`, `redis`, `api` (FastAPI, runs `alembic upgrade head` on boot, port 8000), and `web` (Next.js standalone server, port 3000). Wait for the healthchecks to pass, then open `http://localhost:3000`.

Without an `OPENAI_API_KEY`, AI insight generation takes the documented fallback path: the interaction still saves, and the insight is stored as `status=failed` with an explanatory message instead of raising — exercising the same code path a real API failure would take.

## Running locally (without Docker)

**Backend**

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env   # adjust DATABASE_URL/REDIS_URL if not using the compose services
alembic upgrade head
uvicorn app.main:app --reload
```

Postgres and Redis must be reachable at the URLs in `.env` — the quickest way is `docker compose up postgres redis`.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api/v1/*` to `http://localhost:8000` by default (override via `BACKEND_ORIGIN`).

## Testing

```bash
# Backend — from backend/
pytest --cov=app --cov-report=term-missing

# Frontend — from frontend/
npm test
```

Backend tests run against an in-memory SQLite database and fakeredis, so the suite needs no running Postgres/Redis/Docker.

## Linting

```bash
# Backend — from backend/
ruff check .
black --check .
isort --check .

# Frontend — from frontend/
npm run lint
```

## API Overview

All endpoints are under `/api/v1` and return the envelope `{success, message, data}` on success or `{success, message, errors}` on failure.

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/profile`
- **Customers**: `POST /customers`, `GET /customers` (search/filter/sort/paginate), `GET /customers/{id}`, `PATCH /customers/{id}`, `DELETE /customers/{id}` (soft delete, cascades to interactions)
- **Interactions**: `POST /customers/{customer_id}/interactions`, `GET /interactions`, `GET /interactions/{id}` (embeds `ai_insight`), `PATCH /interactions/{id}`, `DELETE /interactions/{id}`, `POST /interactions/{id}/insights/regenerate`
- **Dashboard**: `GET /dashboard/metrics` → total customers/interactions, sentiment breakdown, recent interactions

## Caching

`CacheService` (Redis) caches `dashboard:metrics` and `customers:list:{querystring-hash}`, both with a 5-minute TTL. Every customer/interaction write (create/update/delete) and every AI insight completion invalidates `dashboard:metrics` and pattern-deletes `customers:list:*`, so reads are never served stale data past a write.

## Edge Cases Handled

Duplicate email on register (409) · invalid/expired JWT → silent refresh → retry once → redirect to login on failure · refresh-token reuse after logout (blocklisted, 401) · deleting a customer cascades to its interactions · AI timeout/rate-limit/malformed-JSON → fallback insight row + regenerate endpoint · pagination clamped (`page ≥ 1`, `1 ≤ page_size ≤ 100`) · empty/whitespace-only notes rejected at validation before any AI call · role-escalation attempts → 403 · cache invalidated on every write path.
