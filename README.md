<div align="center">

# Beyond Pixels: Visual Metaphor Transfer via Schema-Driven Agentic Reasoning

### SIGGRAPH Asia 2026 (ACM Transactions on Graphics)

[Yu Xu](https://imxuyu.github.io/)<sup>1</sup>, Yuxin Zhang<sup>1</sup>, Lin Gao<sup>1</sup>, Oliver Deussen<sup>2</sup>, Tong-Yee Lee<sup>3</sup>, Fan Tang<sup>4&#9993;</sup>

<sup>1</sup>University of Chinese Academy of Sciences &nbsp; <sup>2</sup>University of Konstanz &nbsp; <sup>3</sup>National Cheng Kung University &nbsp; <sup>4</sup>University of Science and Technology Beijing

[![Paper](https://img.shields.io/badge/Paper-coming%20soon-b31b1b)](#citation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

![teaser](assets/teaser.png)

**Visual Metaphor Transfer (VMT)**: given a reference image that carries a visual metaphor and a user-specified target subject, the model must autonomously decouple the *creative essence* of the reference and re-materialize that abstract logic onto the new subject — going beyond pixel-level instruction alignment and surface-level appearance preservation.

## News

- **2026-08**: Code, agent system prompts, and evaluation prompts released.
- **2026-08**: *Beyond Pixels* is accepted to SIGGRAPH Asia 2026. 🎉

## Abstract

A visual metaphor constitutes a high-order form of human creativity, employing cross-domain semantic fusion to transform abstract concepts into impactful visual rhetoric. Despite the remarkable progress of generative AI, existing models remain largely confined to pixel-level instruction alignment and surface-level appearance preservation, failing to capture the underlying abstract logic necessary for genuine metaphorical generation. To bridge this gap, we introduce the task of **Visual Metaphor Transfer (VMT)**, which challenges models to autonomously decouple the "creative essence" from a reference image and re-materialize that abstract logic onto a user-specified target subject. We propose a cognitive-inspired, multi-agent framework that operationalizes **Conceptual Blending Theory (CBT)** through a novel **Schema Grammar (SG)**. This structured representation decouples relational invariants from specific visual entities, providing a rigorous foundation for cross-domain logic re-instantiation. Our pipeline executes VMT through a collaborative system of specialized agents: a perception agent that distills the reference into a schema, a transfer agent that maintains generic space invariance to discover apt carriers, a generation agent for high-fidelity synthesis, and a hierarchical diagnostic agent that mimics a professional critic, performing closed-loop backtracking to identify and rectify errors across abstract logic, component selection, and prompt encoding. Extensive experiments and human evaluations demonstrate that our method significantly outperforms state-of-the-art baselines in metaphor consistency, analogy appropriateness, and visual creativity.

## Framework

![pipeline](assets/pipeline.png)

A visual metaphor is represented as a 7-tuple **Schema Grammar** `SG = {S, C, A_S, A_es, G, V, I}` (subject, carrier, subject attributes, expressive attributes, generic space, violation points, emergent meaning), a direct operationalization of Conceptual Blending Theory. The pipeline runs four agents in a closed loop:

1. **Perception Agent** (VLM) — distills the reference image into `SG_ref`, separating surface entities from abstract relational logic.
2. **Transfer Agent** (VLM) — synthesizes `SG_tgt` for the target subject while keeping the Generic Space `G` invariant: it profiles the new subject, discovers an apt carrier, and redesigns the violation.
3. **Generation Agent** (LLM) — translates `SG_tgt` into a stylistically rigorous T2I master prompt, then synthesizes the image with a pre-trained generator.
4. **Diagnostic Agent** (VLM) — checks subject salience, violation realization, relational coherence, and meaning alignment, then triggers **hierarchical backtracking**: *prompt-level* (refine the T2I prompt), *component-level* (re-select carrier / redesign violation), or *abstraction-level* (re-extract the reference schema). The loop stops on success or after `tau` iterations (paper: `tau = 5`).

All four system prompts, the three VLM-judge prompts, and the strong-prompt ablation prompt are released verbatim under [`prompts/`](prompts/).

## Installation

```bash
git clone https://github.com/ICTMCG/Beyond-Pixels.git
cd Beyond-Pixels
pip install -r requirements.txt
```

Optional (only for local FLUX generation): uncomment the FLUX block in `requirements.txt` and reinstall.

## Configuration

All reasoning agents talk to an **OpenAI-compatible** chat-completions endpoint, so both commercial APIs and open-source deployments work without code changes:

| Stack | VLM / LLM (Perception, Transfer, Generation, Diagnostic) | Generator |
| --- | --- | --- |
| Commercial (paper main results) | `gemini-3-pro` | `gemini-3-pro-image` ("Banana-pro") or `gpt-image-1` via the Images API |
| Open-source (paper supplementary) | Qwen-VL / Qwen (e.g. served by vLLM or DashScope) | FLUX via `diffusers` |

Configure via environment variables (or the equivalent CLI flags of `run.py`):

```bash
export BP_BASE_URL="https://your-openai-compatible-endpoint/v1"
export BP_API_KEY="sk-..."
export BP_VLM_MODEL="gemini-3-pro"       # Perception / Transfer / Diagnostic
export BP_LLM_MODEL="gemini-3-pro"       # Generation
export BP_T2I_BACKEND="openai"           # "openai" (Images API) or "flux" (local diffusers)
export BP_T2I_MODEL="gpt-image-1"        # or e.g. black-forest-labs/FLUX.1-dev
# Optional: a separate endpoint for image generation
# export BP_T2I_BASE_URL=... ; export BP_T2I_API_KEY=...
```

## Quick Start

```bash
python run.py \
    --reference examples/your_reference.jpg \
    --subject "FRESH Rose Cream" \
    --out outputs/rose_cream
```

The output directory contains every intermediate artifact for inspection:

```
outputs/rose_cream/
├── schema_ref.md           # SG_ref extracted by the Perception Agent
├── schema_tgt.md           # SG_tgt synthesized by the Transfer Agent
├── iter0_generation.md     # Generation Agent output (master + negative prompt)
├── iter0_image.png         # synthesized image at iteration 0
├── iter0_diagnosis.md      # Diagnostic Agent report + backtracking level
├── ...                     # further iterations, revised schemas / prompts
├── final.png               # accepted result
└── run.json                # machine-readable trace of the whole run
```

Python API:

```python
from beyond_pixels import PipelineConfig, VMTPipeline

pipeline = VMTPipeline(PipelineConfig())
pipeline.run("examples/your_reference.jpg", "FRESH Rose Cream", "outputs/rose_cream")
```

## Evaluation

We release the exact VLM-as-judge prompts used in the paper for **Metaphor Consistency (MC)**, **Analogy Appropriateness (AA)**, and **Conceptual Integration (CI)** (10-point scales; judged by Gemini-3-pro, GPT-5.2, and Claude-4.5 in the paper):

```bash
python evaluate.py \
    --source examples/your_reference.jpg \
    --target outputs/rose_cream/final.png \
    --description "An ad for FRESH Rose Cream: cream boosts hydration to the max" \
    --judge-model gpt-5.2
```

Main quantitative results (126 curated visual metaphors, best in **bold**):

| Method | Gemini-3-pro MC / AA / CI | GPT-5.2 MC / AA / CI | Claude-4.5 MC / AA / CI | Aes. |
| --- | --- | --- | --- | --- |
| BAGEL | 5.17 / 4.55 / 5.05 | 6.21 / 5.83 / 6.07 | 6.05 / 5.58 / 5.95 | 4.77 |
| Midjourney | 5.33 / 5.57 / 6.09 | 6.33 / 6.46 / 6.24 | 6.51 / 5.94 / 6.06 | 5.22 |
| GPT-Image | 8.08 / 7.59 / 7.47 | 7.71 / 7.65 / 7.54 | 7.95 / 7.39 / 7.51 | 5.63 |
| Banana-pro | 8.75 / 7.68 / 7.33 | 7.95 / 7.77 / 7.37 | 8.08 / 7.42 / 7.74 | 5.57 |
| I-spy-a-metaphor | 8.86 / 8.02 / 7.49 | 8.14 / 7.98 / 7.55 | 8.52 / 7.83 / 7.94 | 5.48 |
| **Ours** | **9.31 / 8.97 / 8.76** | **8.62 / 8.51 / 8.58** | **8.73 / 8.61 / 8.36** | **5.68** |

## Repository Layout

```
Beyond-Pixels/
├── prompts/                        # released prompts (verbatim from the paper)
│   ├── perception_agent.md         # Perception Agent system prompt (p_extract)
│   ├── transfer_agent.md           # Transfer Agent system prompt (p_transfer)
│   ├── generation_agent.md         # Generation Agent system prompt (p_generation)
│   ├── diagnostic_agent.md         # Diagnostic Agent system prompt (p_critic)
│   ├── eval/                       # VLM-as-judge prompts (MC / AA / CI)
│   └── ablation/strong_prompt.md   # strong-prompt ablation baseline
├── beyond_pixels/                  # reference implementation of Algorithm 1
│   ├── agents.py                   # the four agents
│   ├── pipeline.py                 # closed loop with hierarchical backtracking
│   ├── generator.py                # T2I backends (OpenAI Images API / FLUX)
│   ├── client.py                   # OpenAI-compatible chat client (vision)
│   └── config.py
├── run.py                          # CLI entry point
├── evaluate.py                     # VLM-as-judge evaluation (MC / AA / CI)
└── examples/
```

Implementation note: the agent system prompts are released verbatim. The only
addition made by this implementation is a short machine-readable footer appended
to the Diagnostic Agent prompt (`VERDICT: PASS|FAIL`, `LEVEL: ...`) so that the
closed loop can parse the verdict and backtracking level robustly.

## Ethics & Responsible Use

The Diagnostic Agent includes a safety and alignment check that rejects or revises
schemas inducing malicious, offensive, or harmful subject-carrier-violation
alignments. Generated metaphors are intended for creative applications such as
advertising and media; please comply with the usage policies of the underlying
model providers.

## Citation

If you find this work useful, please cite:

```bibtex
@article{xu2026beyondpixels,
  title   = {Beyond Pixels: Visual Metaphor Transfer via Schema-Driven Agentic Reasoning},
  author  = {Xu, Yu and Zhang, Yuxin and Gao, Lin and Deussen, Oliver and Lee, Tong-Yee and Tang, Fan},
  journal = {ACM Transactions on Graphics},
  year    = {2026},
  note    = {SIGGRAPH Asia 2026}
}
```

## Acknowledgments

This work was partly supported by the Beijing Science and Technology Plan Project (No. Z231100005923033), the National Science and Technology Council, Taiwan (Grant 114-2221-E-006-114-MY3), and the Deutsche Forschungsgemeinschaft (DFG, German Research Foundation) under Germany's Excellence Strategy (EXC 2117, 422037984).
