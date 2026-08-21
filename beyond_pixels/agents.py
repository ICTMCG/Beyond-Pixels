"""The four agents of the framework (paper Sec. 4 and Algorithm 1 in the supplementary).

Perception Agent  : reference image -> Schema Grammar SG_ref              (Eq. 2)
Transfer Agent    : SG_ref + target subject -> SG_tgt, keeping G invariant (Eq. 3)
Generation Agent  : SG_tgt -> T2I master prompt                            (Eq. 4)
Diagnostic Agent  : generated image -> qualitative report + backtracking level
"""

import re
from dataclasses import dataclass
from typing import Optional

from .client import ChatClient, PathLike
from .prompts import load_prompt

# Backtracking levels used by the Diagnostic Agent (paper Sec. 4.4).
PROMPT_LEVEL = "prompt"
COMPONENT_LEVEL = "component"
ABSTRACTION_LEVEL = "abstraction"


# --------------------------------------------------------------------------- #
# Phase 1: Perception Agent
# --------------------------------------------------------------------------- #

def run_perception(vlm: ChatClient, reference_image: PathLike, feedback: Optional[str] = None) -> str:
    """Distill the reference image into a Schema Grammar SG_ref."""
    system = load_prompt("perception_agent")
    user = "Analyze the given reference image and output its UNIVERSAL SCHEMA GRAMMAR."
    if feedback:
        # Abstraction-level backtracking: re-extract the relational logic at a
        # different abstraction level (Algorithm 1, lines 20-22).
        user += (
            "\n\nA schema previously extracted from this image led to repeated generation "
            "failures. Re-extract the schema at a different abstraction level, taking the "
            "following diagnostic feedback into account:\n\n" + feedback
        )
    return vlm.chat(system, user, image_paths=[reference_image])


# --------------------------------------------------------------------------- #
# Phase 2: Transfer Agent
# --------------------------------------------------------------------------- #

_TRANSFER_INPUT_MARKER = "Now, the input is"


def run_transfer(
    vlm: ChatClient,
    sg_ref: str,
    target_subject: str,
    feedback: Optional[str] = None,
) -> str:
    """Synthesize SG_tgt for the target subject while preserving the Generic Space G."""
    template = load_prompt("transfer_agent")
    system, _, tail = template.partition(_TRANSFER_INPUT_MARKER)
    user = (_TRANSFER_INPUT_MARKER + tail).replace("{The Target Subject}", target_subject)
    user = user.replace("{The output of PHASE 1}", sg_ref)
    if feedback:
        # Component-level backtracking: re-select the carrier or redesign the
        # violation (Algorithm 1, lines 17-19).
        user += (
            "\n\nThe previous target schema failed during generation because the carrier "
            "or violation was unsuitable. Select a different carrier and/or redesign the "
            "violation, taking the following diagnostic feedback into account:\n\n" + feedback
        )
    return vlm.chat(system.strip(), user)


# --------------------------------------------------------------------------- #
# Phase 3: Generation Agent
# --------------------------------------------------------------------------- #

_GENERATION_INPUT_MARKER = "OK, let's start."


@dataclass
class GenerationOutput:
    raw: str
    prompt: str
    negative_prompt: str


def _extract_section(raw: str, header: str) -> Optional[str]:
    """Return the text following a "**N. <header>:**" style section title."""
    match = re.search(r"\*\*\s*\d\.\s*" + header + r"\s*:?\s*\*\*", raw, re.IGNORECASE)
    if not match:
        return None
    rest = raw[match.end():]
    nxt = re.search(r"\*\*\s*\d\.\s*", rest)
    return rest[: nxt.start()] if nxt else rest


def parse_generation_output(raw: str) -> GenerationOutput:
    prompt = _extract_section(raw, "Master Generation Prompt")
    negative = _extract_section(raw, r"Negative Prompting\s*/?\s*Exclusions") or ""
    return GenerationOutput(
        raw=raw,
        prompt=(prompt or raw).strip(),
        negative_prompt=negative.strip(),
    )


def run_generation(
    llm: ChatClient,
    sg_tgt: str,
    feedback: Optional[str] = None,
    previous_prompt: Optional[str] = None,
) -> GenerationOutput:
    """Translate SG_tgt into a T2I master prompt (and optional negative prompt)."""
    template = load_prompt("generation_agent")
    system, _, tail = template.partition(_GENERATION_INPUT_MARKER)
    user = (_GENERATION_INPUT_MARKER + tail).replace("{The output of PHASE 2}", sg_tgt)
    if feedback and previous_prompt:
        # Prompt-level backtracking: refine the prompt (Algorithm 1, lines 15-16).
        user += (
            "\n\nThe previous Master Generation Prompt was:\n\n" + previous_prompt +
            "\n\nIt failed at the rendering level. Revise the Master Generation Prompt "
            "according to the following diagnostic feedback while keeping the schema "
            "unchanged:\n\n" + feedback
        )
    raw = llm.chat(system.strip(), user)
    return parse_generation_output(raw)


# --------------------------------------------------------------------------- #
# Phase 4: Diagnostic Agent
# --------------------------------------------------------------------------- #

# Implementation detail (not part of the paper prompt): a short machine-readable
# footer so the loop can parse the verdict and backtracking level robustly.
_VERDICT_FOOTER = (
    "\n\nFinally, after the Diagnostic Report, output exactly two additional lines:\n"
    "VERDICT: PASS (if all four constraints are satisfied) or VERDICT: FAIL\n"
    "LEVEL: Prompt-Level | Component-Level | Abstraction-Level (or NONE when the verdict is PASS)"
)


@dataclass
class Diagnosis:
    passed: bool
    level: str  # one of: prompt | component | abstraction | none
    report: str


def run_diagnostic(
    vlm: ChatClient,
    generated_image: PathLike,
    sg_tgt: str,
    current_prompt: str,
) -> Diagnosis:
    """Evaluate the generated image and attribute failures to a backtracking level."""
    system = load_prompt("diagnostic_agent") + _VERDICT_FOOTER
    user = (
        "Target Schema (SG_tgt):\n\n" + sg_tgt +
        "\n\nCurrent Prompt (P):\n\n" + current_prompt +
        "\n\nThe attached image is the Generated Image (I_gen). Produce the Diagnostic Report."
    )
    raw = vlm.chat(system, user, image_paths=[generated_image])

    passed = bool(re.search(r"VERDICT:\s*PASS", raw, re.IGNORECASE))
    level = "none"
    match = re.search(r"LEVEL:\s*(Prompt|Component|Abstraction)", raw, re.IGNORECASE)
    if match is None:
        match = re.search(
            r"Identified Level\W*(Prompt|Component|Abstraction)", raw, re.IGNORECASE
        )
    if match:
        level = match.group(1).lower()
    return Diagnosis(passed=passed, level=level, report=raw)
