/**
 * Single switch for standalone demo mode. When true, every `*.service.ts`
 * exports an in-memory/localStorage-backed mock implementation instead of
 * calling the real FastAPI backend — see `src/lib/mock/services/`.
 *
 * Set `NEXT_PUBLIC_USE_MOCK_API=true` (build-time env var) to enable. Flip it
 * back to `false`/unset to restore real API calls with zero code changes
 * elsewhere in the app.
 */
export const IS_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
