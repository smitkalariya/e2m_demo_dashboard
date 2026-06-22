# AI-Powered Customer Success Platform

A full-stack Customer Success Insights Dashboard: JWT authentication with role-based access control, customer and interaction management, AI-generated meeting insights (summary, sentiment, action items, risks), a metrics dashboard, and Redis-backed caching — built with FastAPI + PostgreSQL on the backend and Next.js (App Router) + Redux Toolkit on the frontend.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL, Redis |
| Auth | JWT (access + refresh, httpOnly cookies), bcrypt, Redis-backed refresh-token blocklist |
| AI | OpenAI (`AsyncOpenAI`), strict JSON-mode prompting, Pydantic-validated parsing |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Redux Toolkit, Axios, Tailwind CSS, React Hook Form + Zod |
| Infra | Docker, Docker Compose, Vercel (frontend) |
| Testing | Pytest (75 tests, 98% coverage), Jest + React Testing Library (59 tests) |

## Architecture

```
┌─────────────┐      same-origin       ┌──────────────────────┐      asyncpg      ┌────────────┐
│   Browser   │ ───────────────────▶   │  Next.js (App Router)│ ─────────────────▶│ PostgreSQL │
│  (cookies)  │ ◀───────────────────   │  /api/v1/* rewrite ──┼──┐                 └────────────┘
└─────────────┘                        └──────────────────────┘  │
                                                                  ▼
                                                       ┌────────────────────┐      redis://
                                                       │   FastAPI backend   │ ───────────────▶ ┌───────┐
                                                       │ Route→Service→Repo  │ ◀─────────────── │ Redis │
                                                       └─────────┬──────────┘                    └───────┘
                                                                 │ OpenAI API
                                                                 ▼
                                                       ┌────────────────────┐
                                                       │ AI: prompt→client→ │
                                                       │   response_parser  │
                                                       └────────────────────┘
```

**Backend** follows Clean Architecture: `Route → Service → Repository → Database`. Routes only validate input and delegate; all business logic lives in `app/services/`, all persistence in `app/repositories/`. AI generation is isolated behind `app/ai/` (`prompt_builder` → `openai_client` → `response_parser`), orchestrated by `AIInsightService`, which never lets an AI failure block interaction creation — a failed/timed-out/malformed AI call is persisted as an `AIInsight` row with `status=failed` and an `error_message`, and the UI exposes a regenerate action. A Redis-backed `RateLimitMiddleware` (`app/middleware/rate_limit.py`) sits in front of every route except `/health`, with a tighter per-IP limit on `/auth/*` to slow brute-force attempts.

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

To load demo data (an admin/manager/user account plus sample customers, interactions, and AI insights), run, against a running stack:

```bash
docker compose exec api python -m app.db.seed
```

It is idempotent — safe to re-run, it skips rows that already exist by natural key (email / company email / title).

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

Postgres and Redis must be reachable at the URLs in `.env` — the quickest way is `docker compose up postgres redis`. Optionally seed demo data: `python -m app.db.seed`.

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

## Environment Variables

Root `.env` (consumed by `docker-compose.yml`):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `JWT_SECRET_KEY` | Yes | — | No fallback in compose; the app also refuses to boot with the literal placeholder value when `ENVIRONMENT=production`. Generate with `openssl rand -hex 32`. |
| `OPENAI_API_KEY` | No | empty | Without it, AI insight generation always takes the fallback (`status=failed`) path. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | |
| `CORS_ORIGINS` | No | `["http://localhost:3000"]` | JSON array string; set to your deployed frontend origin in production. |
| `RATE_LIMIT_PER_MINUTE` | No | `120` | Per-IP, all non-auth routes. |
| `AUTH_RATE_LIMIT_PER_MINUTE` | No | `20` | Per-IP, tighter limit on `/api/v1/auth/*` to slow brute-force/credential-stuffing. |

`backend/.env` (local, non-Docker dev — see `backend/.env.example` for the full list): `ENVIRONMENT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_SECONDS`, `OPENAI_MAX_RETRIES`, `CORS_ORIGINS`, `RATE_LIMIT_PER_MINUTE`, `AUTH_RATE_LIMIT_PER_MINUTE`.

`frontend/.env` (local, non-Docker dev — see `frontend/.env.example`):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `BACKEND_ORIGIN` | No | `http://localhost:8000` | Server-side rewrite target for `/api/v1/*`. On Vercel, set this to your deployed backend's public URL. |

## API Overview

All endpoints are under `/api/v1` and return the envelope `{success, message, data}` on success or `{success, message, errors}` on failure. Full interactive API documentation (request/response schemas, auth flows, try-it-out) is auto-generated by FastAPI and served at **`/docs`** (Swagger UI) and **`/redoc`** (ReDoc) on the running backend — e.g. `http://localhost:8000/docs` locally, or `https://<your-api-host>/docs` in production.

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/profile`
- **Customers**: `POST /customers`, `GET /customers` (search/filter/sort/paginate), `GET /customers/{id}`, `PATCH /customers/{id}`, `DELETE /customers/{id}` (soft delete, cascades to interactions)
- **Interactions**: `POST /customers/{customer_id}/interactions`, `GET /interactions` (filter by customer/date range), `GET /interactions/{id}` (embeds `ai_insight`), `PATCH /interactions/{id}`, `DELETE /interactions/{id}`, `POST /interactions/{id}/insights/regenerate`
- **Dashboard**: `GET /dashboard/metrics` → total customers/interactions, sentiment breakdown, recent interactions

## Caching

`CacheService` (Redis) caches `dashboard:metrics` and `customers:list:{querystring-hash}`, both with a 5-minute TTL. Every customer/interaction write (create/update/delete) and every AI insight completion invalidates `dashboard:metrics` and pattern-deletes `customers:list:*`, so reads are never served stale data past a write.

## Edge Cases Handled

Duplicate email on register (409) · invalid/expired JWT → silent refresh → retry once → redirect to login on failure · refresh-token reuse after logout (blocklisted, 401) · deleting a customer cascades to its interactions · AI timeout/rate-limit/malformed-JSON → fallback insight row + regenerate endpoint · pagination clamped (`page ≥ 1`, `1 ≤ page_size ≤ 100`) · empty/whitespace-only notes rejected at validation before any AI call · role-escalation attempts → 403 · cache invalidated on every write path · per-IP rate limiting on all API routes (tighter on `/auth/*`) returns `429` once exceeded.

## Deployment Guide

The two halves of the stack have different hosting needs, so they deploy separately.

### Frontend → Vercel

1. Import the repo into Vercel and set **Root Directory** to `frontend` (it has its own `vercel.json`, lockfile, and Next.js config).
2. Set the `BACKEND_ORIGIN` environment variable in the Vercel project to your deployed backend's public URL (e.g. `https://e2m-api.onrender.com`) — this is the only env var the frontend needs, since all API calls go through the same-origin `/api/v1/*` rewrite in `next.config.ts`.
3. Deploy. Vercel auto-detects Next.js, runs `npm ci && npm run build`, and serves the App Router build on its edge network.

Because authentication cookies are set on the frontend's own origin (the rewrite proxies to the backend server-side, the browser never calls the backend directly), there is no CORS configuration needed between the deployed frontend and backend for normal app traffic — only the backend's `CORS_ORIGINS` needs to include the frontend's deployed URL, for the few cases (e.g. direct `/docs` access) where a browser hits the API origin directly.

### Backend → a long-lived container host (not Vercel)

Vercel's serverless functions are short-lived and stateless, and don't support a persistent PostgreSQL/Redis-backed FastAPI process the way this app is built — so the backend is **not** deployed to Vercel. Deploy `backend/Dockerfile` to any container host that supports Docker images and long-running processes — Railway, Render, Fly.io, or a VM/ECS task all work without code changes. Steps are the same regardless of host:

1. Provision managed PostgreSQL and Redis instances (or run them as sibling containers).
2. Set environment variables: `ENVIRONMENT=production`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY` (strong, unique — the app refuses to start without one in production), `CORS_ORIGINS=["https://<your-vercel-app>.vercel.app"]`, `OPENAI_API_KEY` (optional).
3. Deploy the image built from `backend/Dockerfile`; it runs `alembic upgrade head` on container start before serving, so migrations apply automatically.
4. Point the frontend's `BACKEND_ORIGIN` at this service's public URL and redeploy/redeploy-env the frontend.

### Database & Redis in production

Any managed PostgreSQL (Neon, Supabase, RDS, Railway Postgres, etc.) and managed Redis (Upstash, Railway Redis, ElastiCache, etc.) work — the app only needs a standard `postgresql+asyncpg://` and `redis://`/`rediss://` connection string via `DATABASE_URL`/`REDIS_URL`. No code path assumes a specific provider.

## Assumptions

- Grading/local evaluation has Docker Desktop with a working Linux container backend (WSL2 or Hyper-V on Windows); where that isn't available, the backend and frontend test suites (`pytest`, `npm test`) and `npm run build` are used as the substitute verification path, since they don't require Docker, Postgres, or Redis to be running.
- A real `OPENAI_API_KEY` is optional for grading — the fallback path (interaction saved, insight `status=failed`) is the one actually exercised without a key, and is itself a tested, first-class code path rather than an error case.
- "Production" for this assessment means "deployable," not "load-tested at scale" — rate limits, pool sizes, and cache TTLs are reasonable single-instance defaults, not tuned for a specific traffic profile.
- The frontend and backend are deployed as two separate services (Vercel + a container host) rather than both on Vercel, since Vercel doesn't host long-lived stateful processes like a PostgreSQL/Redis-backed FastAPI app.

## Trade-offs

- **httpOnly cookies + same-origin rewrite proxy, not a bearer token in localStorage** — chosen for XSS resistance (JS never touches the token) at the cost of needing the Next.js rewrite layer and slightly more deployment coordination (frontend must know the backend's origin) than a stateless bearer-token SPA would.
- **Redis-backed single-use refresh tokens (rotation + blocklist)** instead of fully stateless JWTs — adds a Redis dependency to auth, but makes logout and refresh-token replay actually revocable, which plain stateless JWTs can't do.
- **AI failures are persisted, not retried indefinitely or hidden** — a failed insight is saved as `status=failed` with the error message and a manual regenerate action, rather than blocking interaction creation or silently retrying forever; this favors data durability and operator visibility over a fully "invisible" AI layer.
- **Fixed-window (not sliding-window) rate limiting** — a per-minute counter in Redis is simple and cheap, but allows short bursts at window boundaries; acceptable for the brute-force/abuse-deterrence goal here, not a precision rate limiter.
- **`output: "standalone"` in `next.config.ts`** — optimized for the Docker image (small runtime, no `node_modules` copy); Vercel ignores it and uses its own build output, so it's a no-op there rather than a conflict, but it does mean the Docker and Vercel build artifacts are produced by different pipelines that both need to keep working.
- **No frontend chart library duplication for the small bar charts** — `recharts` was added specifically for the sentiment breakdown rather than hand-rolling SVG, accepting one extra dependency in exchange for accessible, responsive charts instead of a custom rendering path.
