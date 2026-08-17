import time

from google import genai
from google.genai.errors import APIError, ClientError

from app.config import settings

MODEL_NAME = "gemini-flash-lite-latest"
EMBEDDING_MODEL_NAME = "gemini-embedding-001"

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def call_with_retry(fn, *args, **kwargs):
    last_error = None
    for attempt in range(4):
        try:
            return fn(*args, **kwargs)
        except ClientError as e:
            last_error = e
            if e.code != 429:
                raise
            time.sleep(5 * (attempt + 1))  # rate limit (free tier RPM cap) needs longer backoff
        except APIError as e:
            last_error = e
            time.sleep(1.5 * (attempt + 1))  # transient 5xx (model overloaded)
    raise last_error


def generate_with_retry(**kwargs):
    return call_with_retry(get_client().models.generate_content, **kwargs)
