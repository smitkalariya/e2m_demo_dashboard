# E2M Frontend

Next.js 16 (App Router) + React 19 + TypeScript + Redux Toolkit frontend for the E2M AI-powered customer success platform. See the [root README](../README.md) for the full system overview, Docker setup, and deployment guide — this file covers frontend-specific structure and commands.

## Stack

Next.js (App Router), TypeScript (strict), Redux Toolkit, Axios, Tailwind CSS, React Hook Form + Zod, Jest + React Testing Library, Recharts.

## Folder Structure

```
src/
├── app/            # App Router routes — thin pages that render feature components
├── features/       # auth, customers, interactions, dashboard, ai-insights
│   └── <feature>/{components,types,validation,*Slice.ts}
├── components/      # shared ui/layout/cards/feedback components
├── services/        # axios.ts + one *.service.ts per backend resource — all API calls go through these
├── store/           # Redux store, hooks, root reducer
├── hooks/           # cross-feature hooks (e.g. useAuth)
├── utils/           # pure helpers (e.g. date formatting)
├── constants/        # role constants, etc.
├── providers/        # client-side providers (StoreProvider, AuthInitializer)
└── proxy.ts          # route-guard middleware — redirects unauthenticated users
```

Redux holds auth state, dashboard metrics, and per-feature list/filter state only — form state and local UI state (modals, dropdowns) stay in component `useState`.

## Getting Started

```bash
npm install
cp .env.example .env   # set BACKEND_ORIGIN if the API isn't at http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server proxies `/api/v1/*` to `BACKEND_ORIGIN` (default `http://localhost:8000`) via `next.config.ts` rewrites, so the backend's httpOnly auth cookies are set on this app's own origin.

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `BACKEND_ORIGIN` | No | `http://localhost:8000` | Server-side rewrite target for `/api/v1/*`. Set to the deployed backend's URL in production/Vercel. |

## Scripts

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm start        # serve the production build
npm run lint     # ESLint
npm test         # Jest + React Testing Library
```

## Testing

Tests live under `tests/`, mirroring `src/features/`. Service modules (`@/services/*.service`) are mocked at the module boundary so component/slice tests never make real HTTP calls. Run `npm test` from this directory.

## Deployment

Deploys to Vercel via the included `vercel.json` — set the Vercel project's **Root Directory** to `frontend` and configure the `BACKEND_ORIGIN` environment variable to point at the deployed backend. See the [root README's Deployment Guide](../README.md#deployment-guide) for the full flow, including the backend side.
