class AIGenerationError(Exception):
    """Raised whenever insight generation cannot complete — missing key, timeout,
    rate limit exhaustion, or a malformed model response. Callers must treat this
    as a recoverable, per-interaction failure, never as a request-fatal error."""
