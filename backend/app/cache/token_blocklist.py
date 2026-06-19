from app.cache import redis_client

_PREFIX = "blocklist:refresh:"


async def blocklist_token(jti: str, ttl_seconds: int) -> None:
    if ttl_seconds <= 0:
        return
    redis = redis_client.get_redis()
    await redis.set(f"{_PREFIX}{jti}", "1", ex=ttl_seconds)


async def is_blocklisted(jti: str) -> bool:
    redis = redis_client.get_redis()
    return bool(await redis.exists(f"{_PREFIX}{jti}"))
