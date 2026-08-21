"""Loading of the released system prompts (see the prompts/ directory)."""

from pathlib import Path

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"


def load_prompt(name: str) -> str:
    """Load a prompt by its relative name, e.g. "perception_agent" or "eval/metaphor_consistency"."""
    return (PROMPT_DIR / f"{name}.md").read_text(encoding="utf-8")
