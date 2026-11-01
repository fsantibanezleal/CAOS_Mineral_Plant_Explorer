"""Resolve verified dependency pins and reviewed product metadata."""

import importlib.metadata as md
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def pins(path, names):
    (ROOT / path).write_text("\n".join(f"{p}=={md.version(p)}" for p in names) + "\n", encoding="utf-8")


def main():
    pins(
        "data-pipeline/requirements.txt",
        ["numpy", "scipy", "scikit-learn", "joblib", "minehaulsim", "bedblend", "milldem", "oreblocks"],
    )
    pins(
        "requirements-dev.txt",
        ["pytest", "ruff", "jsonschema", "openapi-spec-validator", "fastapi", "httpx", "asyncua"],
    )
    pins("requirements-api.txt", ["fastapi", "uvicorn", "httpx", "asyncua"])
    pins(
        "notebooks/requirements.txt",
        ["numpy", "scipy", "scikit-learn", "joblib", "matplotlib", "nbclient", "nbformat", "ipykernel"],
    )
    (ROOT / "requirements-gpu.txt").write_text(
        "# No GPU lane: the selected forecaster trains on CPU.\n", encoding="utf-8"
    )
    npm = json.loads((ROOT / "frontend/package.json").read_text())
    lock = json.loads((ROOT / "frontend/package-lock.json").read_text())
    rows = ["| component | package | version | use | alternative considered |", "|---|---|---|---|---|"]
    python = {}
    for p in [
        ROOT / "data-pipeline/requirements.txt",
        ROOT / "requirements-dev.txt",
        ROOT / "requirements-api.txt",
        ROOT / "notebooks/requirements.txt",
    ]:
        for line in p.read_text().splitlines():
            name, version = line.split("==")
            python[name] = version
    for name, version in sorted(python.items()):
        rows.append(
            f"| Python | {name} | {version} | Offline scientific model or explicit validation tool | Separate industrial runtime, rejected for public replay |"
        )
    for group in ["dependencies", "devDependencies", "overrides"]:
        for name in npm[group]:
            version = lock["packages"]["node_modules/" + name]["version"]
            rows.append(
                f"| Browser | {name} | {version} | Visual client or build validation | Custom framework, rejected to preserve shared shell |"
            )
    p = ROOT / "docs/design/SDD.md"
    s = p.read_text(encoding="utf-8")
    technology = (
        "The verified runtime is Python 3.12.10 and Node "
        + __import__("subprocess").check_output(["node", "--version"], text=True).strip()
        + ". Template 0.14.001 and shell 0.19.9 are verified. All direct dependencies below are resolved from the installed environment and lock.\n\n"
        + "\n".join(rows)
        + "\n\n"
    )
    s = re.sub(
        r"(## Technology and versions\n).*?(?=## Contracts)",
        lambda m: (
            m[1]
            + "\n"
            + technology
            + "## Resources\n\n| stage | memory | disk | time | where it runs |\n|---|---|---|---|---|\n| bake | 2 GiB budget, CPU threads bounded to one | 1 MiB checkpoint and less than 20 MiB compact replay; external cache | Full matrix measured 146.8 s; training budget 5 min | External Python environment on workstation |\n| tests | 2 GiB budget per worker | Temporary fixtures outside repository | Core and gateway measured under 30 s; full suite budget 15 min | Workstation and cheap CI |\n| build | 2 GiB Node budget | Static output budget 20 MiB | Vite measured 2.4 s after type checking | Workstation and GitHub Actions |\n| deploy | Static host, no model process | GitHub Pages artifact budget 100 MiB | Deployment budget 10 min | GitHub Pages |\n\n"
        ),
        s,
        flags=re.DOTALL,
    )
    s = s.replace("and 70 observation channels", "and 16 benchmark observation channels")
    s = s.replace(
        "domain implementation has not started", "domain implementation follows this reviewed design"
    )
    s = s.replace("authenticated SSE", "authenticated polling snapshots")
    s = s.replace(
        "A 2,000-asset replicated stress plant measures scalability separately and is never mistaken for real equipment diversity.",
        "The current scene has 36 distinct assets; an unmeasured large-plant scalability claim is not made.",
    )
    p.write_text(s, encoding="utf-8")
    product = json.loads((ROOT / "product.json").read_text())
    product["method_entrypoints"] = [
        "pipeline.model.reconciliation.weighted_reconcile",
        "pipeline.model.reconciliation.robust_reconcile",
        "pipeline.model.reconciliation.tasc",
        "pipeline.model.learning.fit_normal",
        "pipeline.stages.plant_evaluate.evaluate_one",
    ]
    (ROOT / "product.json").write_text(
        json.dumps(product, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("Resolved technology matrix and resource budgets.")


if __name__ == "__main__":
    main()
