"""Thin wrapper around an OpenAI-compatible chat-completions endpoint with vision support."""

import base64
import mimetypes
from pathlib import Path
from typing import List, Optional, Union

from openai import OpenAI

PathLike = Union[str, Path]


def encode_image(path: PathLike) -> str:
    """Encode a local image file as a base64 data URL."""
    path = Path(path)
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    data = base64.b64encode(path.read_bytes()).decode("utf-8")
    return f"data:{mime};base64,{data}"


class ChatClient:
    """A single (V)LM endpoint. Pass image paths to `chat` for multimodal calls."""

    def __init__(
        self,
        model: str,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.7,
    ):
        self.model = model
        self.temperature = temperature
        self._client = OpenAI(base_url=base_url, api_key=api_key or "EMPTY")

    def chat(
        self,
        system: str,
        user_text: str,
        image_paths: Optional[List[PathLike]] = None,
    ) -> str:
        content: List[dict] = [
            {"type": "image_url", "image_url": {"url": encode_image(p)}}
            for p in (image_paths or [])
        ]
        content.append({"type": "text", "text": user_text})
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": content},
            ],
            temperature=self.temperature,
        )
        return (response.choices[0].message.content or "").strip()
