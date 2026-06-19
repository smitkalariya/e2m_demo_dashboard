import json
from typing import Any

from app.cache import redis_client


class CacheService:
    async def get_json(self, key: str) -> Any | None:
        redis = redis_client.get_redis()
        raw = await redis.get(key)
        return json.loads(raw) if raw is not None else None

    async def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        redis = redis_client.get_redis()
        await redis.set(key, json.dumps(value), ex=ttl_seconds)

    async def delete(self, key: str) -> None:
        redis = redis_client.get_redis()
        await redis.delete(key)

    async def delete_pattern(self, pattern: str) -> None:
        redis = redis_client.get_redis()
        async for key in redis.scan_iter(match=pattern):
            await redis.delete(key)
