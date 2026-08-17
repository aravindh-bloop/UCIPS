from app.services.gemini_client import EMBEDDING_MODEL_NAME, call_with_retry, get_client


def embed_text(text: str) -> list[float]:
    response = call_with_retry(get_client().models.embed_content, model=EMBEDDING_MODEL_NAME, contents=text)
    return list(response.embeddings[0].values)
