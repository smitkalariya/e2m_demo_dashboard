import asyncio

from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, RateLimitError

from app.ai.exceptions import AIGenerationError
from app.ai.prompt_builder import SYSTEM_PROMPT
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

RETRYABLE_ERRORS = (RateLimitError, APITimeoutError, APIConnectionError)


class OpenAIInsightClient:
    def __init__(self):
        self._settings = get_settings()
        self._client: AsyncOpenAI | None = None
        if self._settings.openai_api_key:
            self._client = AsyncOpenAI(
                api_key=self._settings.openai_api_key,
                base_url=self._settings.openai_base_url,
                timeout=self._settings.openai_timeout_seconds,
            )

    async def generate(self, user_prompt: str) -> str:
        if self._client is None:
            raise AIGenerationError("OpenAI API key is not configured")

        attempts = self._settings.openai_max_retries + 1
        last_error: Exception | None = None

        for attempt in range(attempts):
            try:
                response = await self._client.chat.completions.create(
                    model=self._settings.openai_model,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                content = response.choices[0].message.content
                if not content:
                    raise AIGenerationError("OpenAI returned an empty response")
                return content
            except RETRYABLE_ERRORS as exc:
                last_error = exc
                logger.warning("OpenAI call failed (attempt %d/%d): %s", attempt + 1, attempts, exc)
                if attempt < attempts - 1:
                    await asyncio.sleep(2**attempt)
            except Exception as exc:
                raise AIGenerationError(f"OpenAI call failed: {exc}") from exc

        raise AIGenerationError(f"OpenAI call failed after {attempts} attempts: {last_error}")
