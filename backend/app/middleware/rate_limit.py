import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.cache import redis_client
from app.core.config import get_settings
from app.core.responses import error_response

AUTH_PATH_PREFIX = "/api/v1/auth"
EXEMPT_PATHS = {"/health"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window per-IP rate limiter backed by Redis.

    Auth endpoints get a tighter window to slow down credential-stuffing /
    brute-force attempts; everything else shares a more permissive global
    window. Health checks and CORS preflights are exempt so Docker/Vercel
    health probes and browser preflights never get throttled.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if request.method == "OPTIONS" or path in EXEMPT_PATHS:
            return await call_next(request)

        settings = get_settings()
        is_auth = path.startswith(AUTH_PATH_PREFIX)
        limit = settings.auth_rate_limit_per_minute if is_auth else settings.rate_limit_per_minute

        client_ip = request.client.host if request.client else "unknown"
        window = int(time.time() // 60)
        bucket = "auth" if is_auth else "global"
        key = f"ratelimit:{bucket}:{client_ip}:{window}"

        redis = redis_client.get_redis()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 60)

        if count > limit:
            return error_response(
                message="Too many requests. Please try again later.",
                status_code=429,
            )

        return await call_next(request)
