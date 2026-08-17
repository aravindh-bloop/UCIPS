import os
import uuid

from app.config import settings


def save_upload(file_bytes: bytes, subdir: str, extension: str) -> str:
    directory = os.path.join(settings.storage_dir, subdir)
    os.makedirs(directory, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    path = os.path.join(directory, filename)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return f"/storage/{subdir}/{filename}"
