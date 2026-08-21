#!/usr/bin/env python3
"""VLM-as-judge evaluation of Metaphor Consistency (MC), Analogy Appropriateness (AA)
and Conceptual Integration (CI), using the released judge prompts (paper Sec. 5.1).

Example:
    python evaluate.py --source ref.jpg --target outputs/rose_cream/final.png \
        --description "An ad for FRESH Rose Cream: cream boosts hydration to the max" \
        --judge-model gpt-5.2
"""

import argparse
import json
import re
from typing import Optional

from beyond_pixels.client import ChatClient
from beyond_pixels.prompts import load_prompt

METRIC_PROMPTS = {
    "mc": "eval/metaphor_consistency",
    "aa": "eval/analogy_appropriateness",
    "ci": "eval/conceptual_integration",
}


def parse_score(raw: str) -> Optional[float]:
    match = re.search(r"Score:\s*\[?\s*(\d+(?:\.\d+)?)", raw)
    return float(match.group(1)) if match else None


def evaluate(judge: ChatClient, source: str, target: str, description: str, metric: str) -> dict:
    system = load_prompt(METRIC_PROMPTS[metric])
    user = (
        "The first attached image is the Source Image; the second is the Target Image.\n"
        f"Target Description: {description}\n\n"
        "Evaluate according to the criteria above and answer strictly in the required output format."
    )
    raw = judge.chat(system, user, image_paths=[source, target])
    return {"metric": metric.upper(), "score": parse_score(raw), "raw": raw}


def main() -> None:
    parser = argparse.ArgumentParser(description="VLM-as-judge evaluation (MC / AA / CI)")
    parser.add_argument("--source", required=True, help="reference metaphor image")
    parser.add_argument("--target", required=True, help="generated image to evaluate")
    parser.add_argument("--description", required=True, help="target subject and intended message")
    parser.add_argument("--metrics", nargs="+", default=["mc", "aa", "ci"], choices=list(METRIC_PROMPTS))
    parser.add_argument("--judge-model", default="gpt-5.2", help="judge VLM (paper: Gemini-3-pro / GPT-5.2 / Claude-4.5)")
    parser.add_argument("--base-url", default=None, help="OpenAI-compatible endpoint for the judge")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--out", default=None, help="optional path to save the JSON results")
    args = parser.parse_args()

    judge = ChatClient(args.judge_model, args.base_url, args.api_key, temperature=0.0)
    results = [
        evaluate(judge, args.source, args.target, args.description, metric)
        for metric in args.metrics
    ]

    summary = {r["metric"]: r["score"] for r in results}
    print(json.dumps(summary, indent=2))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump({"summary": summary, "details": results}, f, indent=2, ensure_ascii=False)
        print(f"Saved detailed results to {args.out}")


if __name__ == "__main__":
    main()
