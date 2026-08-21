---
name: visual-metaphor-transfer
description: Transfer the visual metaphor of a reference image onto a new target subject (Visual Metaphor Transfer, VMT). Extracts the reference's abstract relational logic into a Schema Grammar, re-instantiates that logic on the user's product or concept, generates the image, then self-diagnoses and refines in a closed loop. Use when asked to remake a creative or advertising image's idea for a different product, to "transfer this metaphor / creative logic to X", or to produce metaphorical ad imagery from a reference image.
---

# Visual Metaphor Transfer

Given one reference image that carries a visual metaphor and one target subject, produce a new image that re-materializes the reference's *creative essence* — its abstract relational logic, not its pixels, objects, layout, or style.

Method from the SIGGRAPH Asia 2026 paper *Beyond Pixels: Visual Metaphor Transfer via Schema-Driven Agentic Reasoning* ([arXiv:2602.01335](https://arxiv.org/abs/2602.01335)).

## Requirements

- Vision input to inspect the reference image.
- A text-to-image tool (e.g. GPT-Image). If none is available, stop after Phase 3 and deliver the master prompt instead of an image.

## Inputs

- Reference image carrying a visual metaphor (required).
- Target subject, e.g. "FRESH Rose Cream" (required). An optional product photo may accompany it as an appearance reference.

## Schema Grammar

All phases communicate through a 7-tuple Schema Grammar `SG = {S, C, A_S, A_es, G, V, I}`: Subject, Carrier, Subject attributes, Aesthetic, Generic Space (the relational invariant), Violation points (the logic-breaking fusion), and the emergent meaning. `G` is what makes two images "the same metaphor" — it must survive the transfer unchanged.

## Workflow (closed loop, at most 5 iterations)

**Phase 1 — Perception.** Read [references/perception_agent.md](references/perception_agent.md) and apply it to the reference image to extract `SG_ref`.

**Phase 2 — Transfer.** Read [references/transfer_agent.md](references/transfer_agent.md). Keeping `G` and the aesthetic invariant, profile the target subject, discover an apt carrier, and redesign the violation; output `SG_tgt`.

**Phase 3 — Generation.** Read [references/generation_agent.md](references/generation_agent.md). Translate `SG_tgt` into the master image prompt (plus negative prompt) and generate the image.

**Phase 4 — Diagnosis.** Read [references/diagnostic_agent.md](references/diagnostic_agent.md). Critique the generated image against `SG_tgt` (subject salience, violation realization, relational coherence, meaning alignment). Accept, or backtrack by the attributed error level:

- Prompt-level → repeat from Phase 3 (refine the prompt only)
- Component-level → repeat from Phase 2 (re-select the carrier / redesign the violation)
- Abstraction-level → repeat from Phase 1 (re-extract the reference schema)

Accept when the diagnosis passes; after 5 iterations, deliver the best attempt together with its diagnostic report.

## Guardrails

- The reference image contributes only abstract logic. Never copy its subject, objects, scene, or layout into the result unless they independently fit the target.
- Never alter the identity of the user's target subject; if a product photo is supplied, keep its recognizable appearance.
- Keep intermediate artifacts visible: show `SG_ref`, `SG_tgt`, and the master prompt so the user can steer the loop.
- Reject or revise schemas that would produce malicious, offensive, or harmful subject-carrier-violation alignments.

## Reference Prompts

The four prompts under [references/](references/) are released verbatim from the paper: `perception_agent.md` (p_extract), `transfer_agent.md` (p_transfer), `generation_agent.md` (p_generation), `diagnostic_agent.md` (p_critic).

[assets/teaser.png](assets/teaser.png) and [assets/results.png](assets/results.png) illustrate expected inputs and outputs; do not reuse their subjects or compositions for new requests.
