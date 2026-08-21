#!/usr/bin/env python3
"""Run Visual Metaphor Transfer on a reference image and a target subject.

Example:
    python run.py --reference examples/reference.jpg --subject "FRESH Rose Cream" \
        --out outputs/rose_cream
"""

import argparse

from beyond_pixels import PipelineConfig, VMTPipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Beyond Pixels: Visual Metaphor Transfer")
    parser.add_argument("--reference", required=True, help="path to the reference metaphor image")
    parser.add_argument("--subject", required=True, help='target subject, e.g. "FRESH Rose Cream"')
    parser.add_argument("--out", default="outputs/run", help="output directory")

    group = parser.add_argument_group("models (defaults follow BP_* environment variables)")
    group.add_argument("--vlm-model", help="VLM for Perception/Transfer/Diagnostic agents")
    group.add_argument("--llm-model", help="LLM for the Generation Agent")
    group.add_argument("--base-url", help="OpenAI-compatible endpoint for the reasoning models")
    group.add_argument("--api-key", help="API key for the reasoning endpoint")
    group.add_argument("--t2i-backend", choices=["openai", "flux"], help="text-to-image backend")
    group.add_argument("--t2i-model", help="T2I model name (default: gpt-image-1 / FLUX.1-dev)")
    group.add_argument("--t2i-base-url", help="separate endpoint for image generation, if any")
    group.add_argument("--t2i-api-key", help="API key for the image generation endpoint")
    group.add_argument("--image-size", help="generated image size, e.g. 1024x1024")
    group.add_argument("--max-iterations", type=int, help="iteration threshold tau (paper: 5)")
    group.add_argument("--temperature", type=float, help="sampling temperature for the agents")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = PipelineConfig()
    overrides = {
        "vlm_model": args.vlm_model,
        "llm_model": args.llm_model,
        "base_url": args.base_url,
        "api_key": args.api_key,
        "t2i_backend": args.t2i_backend,
        "t2i_model": args.t2i_model,
        "t2i_base_url": args.t2i_base_url,
        "t2i_api_key": args.t2i_api_key,
        "image_size": args.image_size,
        "max_iterations": args.max_iterations,
        "temperature": args.temperature,
    }
    for name, value in overrides.items():
        if value is not None:
            setattr(config, name, value)

    pipeline = VMTPipeline(config)
    pipeline.run(args.reference, args.subject, args.out)


if __name__ == "__main__":
    main()
