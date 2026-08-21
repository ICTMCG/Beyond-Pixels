"""Pluggable text-to-image backends.

"openai" : any endpoint implementing the OpenAI Images API. This covers gpt-image-1
           as well as OpenAI-compatible gateways serving other commercial generators
           (e.g. gemini-3-pro-image, a.k.a. "Banana-pro" in the paper).
"flux"   : local open-source generation with FLUX via diffusers, matching the
           open-source stack reported in the supplementary material.
"""

import base64
import urllib.request
from pathlib import Path
from typing import Optional

from .config import PipelineConfig


class OpenAIImageBackend:
    def __init__(self, model: str, base_url: Optional[str], api_key: Optional[str], size: str):
        from openai import OpenAI

        self.model = model
        self.size = size
        self._client = OpenAI(base_url=base_url, api_key=api_key or "EMPTY")

    def generate(self, prompt: str, out_path: Path, negative_prompt: str = "") -> Path:
        full_prompt = prompt if not negative_prompt else f"{prompt}\n\nAvoid: {negative_prompt}"
        result = self._client.images.generate(
            model=self.model, prompt=full_prompt, size=self.size, n=1
        )
        datum = result.data[0]
        if getattr(datum, "b64_json", None):
            out_path.write_bytes(base64.b64decode(datum.b64_json))
        else:
            urllib.request.urlretrieve(datum.url, out_path)
        return out_path


class FluxBackend:
    def __init__(self, model: str, size: str):
        import torch
        from diffusers import FluxPipeline

        width, height = (int(v) for v in size.lower().split("x"))
        self.width, self.height = width, height
        self.pipe = FluxPipeline.from_pretrained(model, torch_dtype=torch.bfloat16)
        if torch.cuda.is_available():
            self.pipe.to("cuda")
        elif torch.backends.mps.is_available():
            self.pipe.to("mps")

    def generate(self, prompt: str, out_path: Path, negative_prompt: str = "") -> Path:
        # FLUX.1 has no negative-prompt input; exclusions are folded into the prompt.
        if negative_prompt:
            prompt = f"{prompt}\n\nAvoid: {negative_prompt}"
        image = self.pipe(
            prompt=prompt,
            width=self.width,
            height=self.height,
            num_inference_steps=28,
            guidance_scale=3.5,
        ).images[0]
        image.save(out_path)
        return out_path


def build_t2i_backend(config: PipelineConfig):
    model = config.resolved_t2i_model()
    if config.t2i_backend == "openai":
        return OpenAIImageBackend(
            model=model,
            base_url=config.t2i_base_url or config.base_url,
            api_key=config.t2i_api_key or config.api_key,
            size=config.image_size,
        )
    if config.t2i_backend == "flux":
        return FluxBackend(model=model, size=config.image_size)
    raise ValueError(f"Unknown T2I backend: {config.t2i_backend!r} (expected 'openai' or 'flux')")
