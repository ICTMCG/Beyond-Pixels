"""Configuration for the Beyond-Pixels pipeline.

All reasoning agents talk to an OpenAI-compatible chat-completions endpoint, so the
pipeline works out of the box with commercial APIs (Gemini, GPT, Claude via a
compatible gateway) as well as open-source deployments (Qwen / Qwen-VL served by
vLLM, DashScope, etc.). Text-to-image generation is pluggable (see generator.py).
"""

import os
from dataclasses import dataclass, field
from typing import Optional


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


@dataclass
class PipelineConfig:
    # --- Reasoning models (OpenAI-compatible endpoint) -------------------------
    # The paper uses Gemini-3-pro as both the VLM and the LLM (Sec. 5.1); the
    # open-source stack uses Qwen-VL (VLM) and Qwen (LLM).
    vlm_model: str = field(default_factory=lambda: _env("BP_VLM_MODEL", "gemini-3-pro"))
    llm_model: str = field(default_factory=lambda: _env("BP_LLM_MODEL", "gemini-3-pro"))
    base_url: str = field(
        default_factory=lambda: _env("BP_BASE_URL", _env("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    )
    api_key: str = field(default_factory=lambda: _env("BP_API_KEY", _env("OPENAI_API_KEY")))

    # --- Text-to-image generation ----------------------------------------------
    # Backend "openai": any endpoint implementing the OpenAI Images API
    #   (gpt-image-1, or gateways serving gemini-3-pro-image / "Banana-pro", etc.).
    # Backend "flux": local open-source generation with FLUX via diffusers.
    t2i_backend: str = field(default_factory=lambda: _env("BP_T2I_BACKEND", "openai"))
    t2i_model: Optional[str] = field(default_factory=lambda: _env("BP_T2I_MODEL") or None)
    t2i_base_url: Optional[str] = field(default_factory=lambda: _env("BP_T2I_BASE_URL") or None)
    t2i_api_key: Optional[str] = field(default_factory=lambda: _env("BP_T2I_API_KEY") or None)
    image_size: str = field(default_factory=lambda: _env("BP_IMAGE_SIZE", "1024x1024"))

    # --- Closed-loop refinement -------------------------------------------------
    # Iteration threshold tau (the paper sets tau = 5, Sec. 5.1).
    max_iterations: int = field(default_factory=lambda: int(_env("BP_MAX_ITERATIONS", "5")))
    temperature: float = field(default_factory=lambda: float(_env("BP_TEMPERATURE", "0.7")))

    def resolved_t2i_model(self) -> str:
        if self.t2i_model:
            return self.t2i_model
        return "black-forest-labs/FLUX.1-dev" if self.t2i_backend == "flux" else "gpt-image-1"
