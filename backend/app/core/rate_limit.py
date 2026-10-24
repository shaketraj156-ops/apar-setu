import time
from collections import defaultdict
from fastapi import Request
from app.core.config import get_settings
from app.core.errors import RateLimitError

settings = get_settings()
_ip_requests = defaultdict(list)

def check_verify_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    window = 60.0  # 1 minute sliding window
    limit = settings.VERIFY_RATE_LIMIT_PER_MIN

    timestamps = [ts for ts in _ip_requests[client_ip] if now - ts < window]
    if len(timestamps) >= limit:
        raise RateLimitError(
            f"Rate limit exceeded: maximum {limit} verification requests per minute allowed.",
            code="RATE_LIMITED"
        )
    timestamps.append(now)
    _ip_requests[client_ip] = timestamps
