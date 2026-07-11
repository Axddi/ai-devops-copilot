import json
import os
import redis
from redis.exceptions import RedisError

REDIS_URL = os.getenv("REDIS_URL")
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_SOCKET_TIMEOUT_SECONDS = float(os.getenv("REDIS_SOCKET_TIMEOUT_SECONDS", 1))

if REDIS_URL:
    redis_client = redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_timeout=REDIS_SOCKET_TIMEOUT_SECONDS,
        socket_connect_timeout=REDIS_SOCKET_TIMEOUT_SECONDS,
    )
elif REDIS_HOST:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True,
        socket_timeout=REDIS_SOCKET_TIMEOUT_SECONDS,
        socket_connect_timeout=REDIS_SOCKET_TIMEOUT_SECONDS,
    )
else:
    redis_client = None


def get_cache(key):
    if not redis_client:
        return None

    try:
        data = redis_client.get(key)
    except RedisError:
        return None

    if data:
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            delete_cache(key)

    return None


def set_cache(key, value, ttl=15):
    if not redis_client:
        return False

    try:
        redis_client.setex(
            key,
            ttl,
            json.dumps(value)
        )
    except (RedisError, TypeError):
        return False

    return True


def delete_cache(key):
    if not redis_client:
        return False

    try:
        redis_client.delete(key)
    except RedisError:
        return False

    return True
