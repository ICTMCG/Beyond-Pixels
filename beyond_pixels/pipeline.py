"""End-to-end Visual Metaphor Transfer (Algorithm 1 in the supplementary material).

Phase 1  Perception Agent : SG_ref <- VLM(I_ref, p_extract)
Phase 2  Transfer Agent   : SG_tgt <- VLM(SG_ref, S_tgt, p_transfer)
Phase 3+4 Generation & Diagnostic loop with hierarchical backtracking:
          prompt-level      -> refine the T2I prompt
          component-level   -> re-select carrier / redesign violation (rerun Transfer)
          abstraction-level -> re-extract the reference schema (rerun Perception)
"""

import json
import shutil
from pathlib import Path
from typing import Optional, Union

from .agents import (
    ABSTRACTION_LEVEL,
    COMPONENT_LEVEL,
    PROMPT_LEVEL,
    run_diagnostic,
    run_generation,
    run_perception,
    run_transfer,
)
from .client import ChatClient
from .config import PipelineConfig
from .generator import build_t2i_backend


class VMTPipeline:
    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or PipelineConfig()
        self.vlm = ChatClient(
            self.config.vlm_model, self.config.base_url, self.config.api_key, self.config.temperature
        )
        self.llm = ChatClient(
            self.config.llm_model, self.config.base_url, self.config.api_key, self.config.temperature
        )
        self.t2i = build_t2i_backend(self.config)

    def run(
        self,
        reference_image: Union[str, Path],
        target_subject: str,
        out_dir: Union[str, Path] = "outputs/run",
    ) -> Path:
        """Transfer the metaphor of `reference_image` onto `target_subject`.

        All intermediate artifacts (schemas, prompts, images, diagnostic reports)
        are written to `out_dir`; the accepted image is copied to `final.png`.
        """
        out = Path(out_dir)
        out.mkdir(parents=True, exist_ok=True)
        reference_image = str(reference_image)
        trace = []

        def save(name: str, text: str) -> None:
            (out / name).write_text(text, encoding="utf-8")

        # ----- Phase 1: Perception Agent -------------------------------------
        print("[Phase 1] Perception Agent: extracting reference schema ...")
        sg_ref = run_perception(self.vlm, reference_image)
        save("schema_ref.md", sg_ref)

        # ----- Phase 2: Transfer Agent ----------------------------------------
        print("[Phase 2] Transfer Agent: synthesizing target schema ...")
        sg_tgt = run_transfer(self.vlm, sg_ref, target_subject)
        save("schema_tgt.md", sg_tgt)

        # ----- Phase 3 & 4: Generation / Diagnostic closed loop ---------------
        generation = None
        final_image: Optional[Path] = None
        last_image: Optional[Path] = None

        for t in range(self.config.max_iterations):
            if generation is None:
                print(f"[Iter {t}] Generation Agent: converting schema to T2I prompt ...")
                generation = run_generation(self.llm, sg_tgt)
                save(f"iter{t}_generation.md", generation.raw)

            print(f"[Iter {t}] Synthesizing image ...")
            image_path = out / f"iter{t}_image.png"
            self.t2i.generate(generation.prompt, image_path, generation.negative_prompt)
            last_image = image_path

            print(f"[Iter {t}] Diagnostic Agent: evaluating ...")
            diagnosis = run_diagnostic(self.vlm, image_path, sg_tgt, generation.prompt)
            save(f"iter{t}_diagnosis.md", diagnosis.report)
            trace.append(
                {
                    "iteration": t,
                    "image": image_path.name,
                    "passed": diagnosis.passed,
                    "level": diagnosis.level,
                }
            )

            if diagnosis.passed:
                print(f"[Iter {t}] Passed all diagnostic constraints.")
                final_image = image_path
                break

            # Hierarchical backtracking.
            if diagnosis.level == COMPONENT_LEVEL:
                print(f"[Iter {t}] Component-level failure: re-running Transfer Agent ...")
                sg_tgt = run_transfer(self.vlm, sg_ref, target_subject, feedback=diagnosis.report)
                save(f"iter{t}_schema_tgt_revised.md", sg_tgt)
                generation = None
            elif diagnosis.level == ABSTRACTION_LEVEL:
                print(f"[Iter {t}] Abstraction-level failure: re-running Perception Agent ...")
                sg_ref = run_perception(self.vlm, reference_image, feedback=diagnosis.report)
                save(f"iter{t}_schema_ref_revised.md", sg_ref)
                sg_tgt = run_transfer(self.vlm, sg_ref, target_subject)
                save(f"iter{t}_schema_tgt_revised.md", sg_tgt)
                generation = None
            else:  # PROMPT_LEVEL (default when the level is ambiguous)
                print(f"[Iter {t}] Prompt-level failure: refining the T2I prompt ...")
                generation = run_generation(
                    self.llm, sg_tgt, feedback=diagnosis.report, previous_prompt=generation.prompt
                )
                save(f"iter{t}_generation_revised.md", generation.raw)

        if final_image is None:
            # Iteration budget exhausted; keep the last attempt (paper Sec. 4.4).
            print("[Warn] Reached the maximum iteration limit; returning the last attempt.")
            final_image = last_image

        shutil.copyfile(final_image, out / "final.png")
        save(
            "run.json",
            json.dumps(
                {
                    "reference_image": reference_image,
                    "target_subject": target_subject,
                    "vlm_model": self.config.vlm_model,
                    "llm_model": self.config.llm_model,
                    "t2i_backend": self.config.t2i_backend,
                    "t2i_model": self.config.resolved_t2i_model(),
                    "max_iterations": self.config.max_iterations,
                    "trace": trace,
                    "final_image": "final.png",
                },
                indent=2,
                ensure_ascii=False,
            ),
        )
        print(f"Done. Final image: {out / 'final.png'}")
        return out / "final.png"
