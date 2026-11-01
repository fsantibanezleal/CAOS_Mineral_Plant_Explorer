"""OreBridge named pipeline: source -> preprocess -> split/train -> infer -> evaluate -> export -> validate."""

import argparse
import os
from pathlib import Path

from .stages import bake_plant

DERIVED = bake_plant.ROOT / "data/derived"
MANIFESTS = DERIVED / "manifests"
MODELS = Path(os.environ["OREBRIDGE_MODELS_ROOT"]) if os.environ.get("OREBRIDGE_MODELS_ROOT") else None


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "stage",
        nargs="?",
        default="all",
        choices=[
            "all",
            "sources",
            "preprocess",
            "train",
            "train-ridge",
            "infer",
            "extend",
            "evaluate",
            "export",
            "validate",
            "readiness",
        ],
    )
    p.add_argument("--output", type=Path, default=DERIVED)
    p.add_argument("--models-root", type=Path, default=MODELS)
    p.add_argument("--cache-root", type=Path, default=os.environ.get("OREBRIDGE_CACHE_ROOT"))
    p.add_argument("--engine-evidence", type=Path)
    p.add_argument("--no-train", action="store_true")
    p.add_argument("--benchmark", action="store_true", help="full 768-scenario paired benchmark; never in CI")
    a = p.parse_args()
    for name in ["models_root", "cache_root"]:
        value = getattr(a, name)
        if value:
            resolved = Path(value).resolve()
            if resolved == bake_plant.ROOT or bake_plant.ROOT in resolved.parents:
                p.error(name + " must be outside the repository")

    if a.stage == "sources":
        if not a.cache_root:
            p.error("sources requires --cache-root outside the repository")
        bake_plant.sources(a.output, a.cache_root)
    elif a.stage in ["all", "infer", "extend"]:
        if not a.models_root:
            p.error("model stage requires --models-root outside the repository")
        bake_plant.run_all(
            a.output,
            a.models_root,
            train_model=not a.no_train and a.stage == "all",
            stage=a.stage,
            full_benchmark=a.benchmark,
            engine_file=a.engine_evidence,
        )
    elif a.stage == "evaluate":
        if not a.models_root:
            p.error("evaluate requires --models-root")
        bake_plant.evaluate_existing(a.output, a.models_root, a.benchmark)
    elif a.stage == "export":
        bake_plant.finalize_existing(a.output)
    elif a.stage == "train-ridge":
        if not a.models_root:
            p.error("train-ridge requires --models-root outside the repository")
        from .stages.learned_compare import train_ridge

        train_ridge(a.models_root)
    elif a.stage == "train":
        if not a.models_root:
            p.error("train requires --models-root outside the repository")
        bake_plant.train(a.models_root)
    elif a.stage == "preprocess":
        from .model.plant import reference_plant, validate_graph

        validate_graph(reference_plant())
        print("plant graph and scene dimensions valid")
    elif a.stage == "readiness":
        from .core import readiness

        doc = readiness.compute(
            repo_root=bake_plant.ROOT, derived_root=a.output, models_dir=bake_plant.ROOT / "models"
        )
        readiness.write(a.output, doc)
    else:
        bake_plant.validate(a.output)


if __name__ == "__main__":
    main()
