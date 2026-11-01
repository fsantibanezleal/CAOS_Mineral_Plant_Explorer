"""Create scientific figures and tables from the actual public experiment."""

from pathlib import Path
import json
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data-pipeline"))
from pipeline.model.thickener import simulate_thickener  # noqa: E402

OUT = Path(__file__).resolve().parent
plt.rcParams.update({"font.size": 12, "savefig.dpi": 220, "figure.dpi": 130})


def read(name):
    return json.loads((ROOT / "data/derived" / name).read_text(encoding="utf-8"))


def save(fig, name):
    fig.savefig(OUT / (name + ".png"), bbox_inches="tight")
    plt.close(fig)


def latex(value):
    return str(value).replace("&", r"\&").replace("%", r"\%").replace("_", r"\_").replace("#", r"\#")


def main():
    b, analysis, plant = read("benchmark.json"), read("benchmark-analysis.json"), read("plant.json")
    names = {"threshold": "Engineering threshold", "wls": "WLS", "robust-aligned": "Aligned Huber", "forecast": "Causal HGB", "tasc": "TASC", "tasc-no-timing": "TASC: no timing", "tasc-no-engine": "TASC: no prior", "tasc-no-topology": "TASC: no topology"}
    order = [r["method"] for r in b["aggregate"]]
    positions = np.arange(len(order))
    fig, axes = plt.subplots(1, 3, figsize=(10, 4), sharey=True, layout="constrained")
    for ax, key, title in zip(axes, ["recall", "false_positive_rate", "coverage"], ["Affected points\ndetected", "Unaffected points\nalarmed", "Numerical score\ncoverage"], strict=True):
        vals = [100 * (r[key] if key != "coverage" else r["scored_points"] / (r["scored_points"] + r["unscorable_points"])) for r in b["aggregate"]]
        ax.barh(positions, vals, color=["#236b8e" if m != "tasc" else "#a74748" for m in order])
        ax.set(title=title, xlabel="Percent")
        ax.grid(axis="x", alpha=.18)
    axes[0].set_yticks(positions, [names[m] for m in order]); axes[0].invert_yaxis()
    save(fig, "comparison")

    fig, axes = plt.subplots(1, 2, figsize=(9, 3.4), layout="constrained")
    for method in ["robust-aligned", "forecast", "tasc", "tasc-no-topology"]:
        recall, fpr = [], []
        for severity in [.5, 1, 2, 4]:
            rows = [r["numeric"] for r in b["rows"] if r["method"] == method and r["severity"] == severity]
            tp, fp, fn, tn = [sum(r[k] for r in rows) for k in ["tp", "fp", "fn", "tn"]]
            recall.append(100 * tp / (tp + fn)); fpr.append(100 * fp / (fp + tn))
        axes[0].plot([.5, 1, 2, 4], recall, "o-", label=names[method])
        axes[1].plot([.5, 1, 2, 4], fpr, "o-", label=names[method])
    for ax in axes: ax.set(xlabel="Injected severity multiplier", xticks=[.5, 1, 2, 4]); ax.grid(alpha=.2)
    axes[0].set(ylabel="Pointwise recall (%)"); axes[1].set(ylabel="False-positive rate (%)"); axes[1].legend(fontsize=10)
    save(fig, "severity")

    diffs = [r for r in analysis["paired_differences"] if r["metric"] == "recall"]
    point = np.array([r["difference"] for r in diffs]) * 100
    limits = np.array([r["ci95"] for r in diffs]) * 100
    fig, ax = plt.subplots(figsize=(7.2, 2.8), layout="constrained")
    ax.errorbar(point, np.arange(3), xerr=[point-limits[:, 0], limits[:, 1]-point], fmt="o", capsize=4)
    ax.axvline(0, color="black", linestyle="--", linewidth=.8)
    ax.set(yticks=np.arange(3), yticklabels=["TASC minus " + names[r["reference"]] for r in diffs], xlabel="Recall difference (percentage points)")
    ax.grid(axis="x", alpha=.2); save(fig, "paired")

    fig, ax = plt.subplots(figsize=(10, 5.5), layout="constrained")
    stages = list(dict.fromkeys(a["stage"] for a in plant["assets"]))
    palette = plt.get_cmap("tab10")
    assets = {a["id"]: a for a in plant["assets"]}
    for edge in plant["streams"]:
        a, c = assets[edge["source"]]["position"], assets[edge["target"]]["position"]
        ax.annotate("", xy=(c[0], c[2]), xytext=(a[0], a[2]), arrowprops={"arrowstyle": "->", "color": "#408fb4" if edge["material"] == "water" else "#b0b0b0", "lw": .7, "alpha": .65})
    for i, stage in enumerate(stages):
        group = [a for a in plant["assets"] if a["stage"] == stage]
        ax.scatter([a["position"][0] for a in group], [a["position"][2] for a in group], s=40, color=palette(i), label=stage, zorder=3)
    for a in plant["assets"]: ax.annotate(a["id"], (a["position"][0], a["position"][2]), xytext=(2, 5), textcoords="offset points", fontsize=9)
    ax.set(xlabel="Authored X coordinate (m)", ylabel="Authored Z coordinate (m)", xlim=(-145, 160), ylim=(-80, 95))
    ax.legend(ncol=4, fontsize=9, loc="upper center", bbox_to_anchor=(.5, -.16)); ax.grid(alpha=.15); save(fig, "plant-map")

    grids = [40, 80, 160, 320, 640, 1280, 2000]
    runs = [simulate_thickener(cells=n) for n in grids]
    fig, axes = plt.subplots(1, 2, figsize=(8.6, 3.2), layout="constrained")
    axes[0].semilogx(grids, [r["underflow_fraction"] for r in runs], "o-")
    axes[0].set(xlabel="Vertical cells", ylabel="Outlet solids volume fraction")
    for n, r in zip(grids, runs, strict=True):
        if n in [40, 320, 640, 2000]: axes[1].plot(r["z_m"], r["fraction_profile"], label=str(n) + " cells")
    axes[1].set(xlabel="Depth coordinate (m)", ylabel="Solids volume fraction"); axes[1].legend(fontsize=10)
    for ax in axes: ax.grid(alpha=.2)
    save(fig, "grid-study")
    (OUT / "grid-study.json").write_text(json.dumps([{"cells": n, "outlet_fraction": r["underflow_fraction"], "solids_residual_m3": r["solids_residual_m3"]} for n, r in zip(grids, runs, strict=True)], indent=2) + "\n", encoding="utf-8")

    trace = read("PL-02/trace.json"); j = 5
    fig, axes = plt.subplots(2, 1, figsize=(8.6, 4.8), sharex=True, layout="constrained")
    for method in ["robust-aligned", "forecast", "tasc", "tasc-no-topology"]:
        score = np.array([row[j] if row[j] is not None else np.nan for row in trace["scores"][method]])
        axes[1].plot(trace["time_s"], score, label=names[method], linewidth=1)
    raw = np.array(trace["observed"])[:, j]; lag = trace["evidence_lag_s"]["tasc"][j]
    axes[0].plot(trace["time_s"], raw, label="Raw wall-clock observation")
    warmup = max(trace["evidence_lag_s"]["tasc"])
    admitted = np.arange(warmup, len(raw))
    axes[0].plot(admitted, raw[admitted - lag], "--", label="TASC channel evidence at availability time")
    axes[0].set(ylabel="Flotation dry solids (t/h)"); axes[0].legend(fontsize=10)
    axes[1].axhline(1, color="black", linestyle=":", linewidth=.8)
    axes[1].set(xlabel="Snapshot availability time (s)", ylabel="Score / own threshold"); axes[1].legend(fontsize=10)
    save(fig, "evidence-time")

    header = "Method & TP & FP & FN & Precision & Recall & FPR & Coverage \\\\ \n\\midrule\n"
    rows = []
    for r in b["aggregate"]:
        cov = r["scored_points"] / (r["scored_points"] + r["unscorable_points"])
        rows.append(f"{names[r['method']]} & {r['tp']} & {r['fp']} & {r['fn']} & {r['precision']:.4f} & {r['recall']:.4f} & {r['false_positive_rate']:.5f} & {cov:.4f} \\\\")
    (OUT / "results-table.tex").write_text("\\begin{tabular}{lrrrrrrr}\\toprule\n" + "\n".join(line.rstrip() for line in header.splitlines()) + "\n" + "\n".join(rows) + "\n\\bottomrule\\end{tabular}\n", encoding="utf-8")
    source_rows = []
    for source in read("engine-evidence.json")["records"]:
        metric = source["metrics"][0]
        source_rows.append(" & ".join(latex(v) for v in [source["id"].replace("CAOS_", ""), source["version"], source["license"], source["asset_id"], metric["label"] + " (" + metric["unit"] + ")"]) + r"\\")
    table = r"\begin{tabular}{p{.17\textwidth}p{.14\textwidth}p{.13\textwidth}p{.07\textwidth}p{.35\textwidth}}" + "\n"
    table += r"\toprule Source & Pin & License & Asset & First extracted quantity\\\midrule" + "\n"
    table += "\n".join(source_rows) + "\n" + r"\bottomrule\end{tabular}" + "\n"
    (OUT / "sources-table.tex").write_text(table, encoding="utf-8")
    print("Created six figures, measured grid study and exact comparison table")


if __name__ == "__main__":
    main()
