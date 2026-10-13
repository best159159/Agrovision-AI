"""
evaluate_cassava.py — AgroVision AI  Cassava Model Evaluation
==============================================================
Generates the validation package required for international judging:
  • Per-class precision, recall, F1-score, support
  • Confusion matrix (raw counts + normalised)
  • Top-2 accuracy
  • Expected Calibration Error (ECE)
  • Per-class confidence histogram
  • Latency statistics (ms/image)
  • Summary JSON  → eval_results/cassava_eval_summary.json
  • Plots         → eval_results/*.png

Usage
-----
Place your TEST images under a directory structured as:
    dataset/
        Cassava Bacterial Blight (CBB)/
            img1.jpg  img2.jpg ...
        Cassava Brown Streak Disease (CBSD)/
            ...
        Cassava Green Mottle (CGM)/
            ...
        Cassava Mosaic Disease (CMD)/
            ...
        Healthy/
            ...

Then run:
    cd backend
    python evaluate_cassava.py --dataset path/to/dataset [--output eval_results]

The subfolder names are matched against cassava_labels.json automatically;
capitalisation and partial matches are handled.

Requirements (already in requirements.txt):
    tensorflow, numpy, opencv-python-headless, pillow
Additional (auto-installed if missing):
    scikit-learn, matplotlib, seaborn
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Paths relative to this file (same as main.py conventions)
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
CASSAVA_OUTPUT_DIR = BASE_DIR.parent / "cassava_ai_outputs_fast"
MODEL_DIR = BASE_DIR.parent / "model"

# Labels: prefer model/ directory (newly trained), fall back to cassava_ai_outputs_fast
if (MODEL_DIR / "cassava_labels.json").exists():
    CASSAVA_LABELS_PATH = MODEL_DIR / "cassava_labels.json"
else:
    CASSAVA_LABELS_PATH = CASSAVA_OUTPUT_DIR / "cassava_labels.json"

# Model: prefer the latest trained model in model/, fall back to old cassava_ai_outputs_fast runs
if (MODEL_DIR / "cassava_competition_model_v2.keras").exists():
    DEFAULT_MODEL_PATH = MODEL_DIR / "cassava_competition_model_v2.keras"
elif (MODEL_DIR / "cassava_competition_model.keras").exists():
    DEFAULT_MODEL_PATH = MODEL_DIR / "cassava_competition_model.keras"
elif (CASSAVA_OUTPUT_DIR / "cassava_best_model.compat.keras").exists():
    DEFAULT_MODEL_PATH = CASSAVA_OUTPUT_DIR / "cassava_best_model.compat.keras"
else:
    DEFAULT_MODEL_PATH = CASSAVA_OUTPUT_DIR / "cassava_best_model.keras"

# Default only — the actual value used at runtime is auto-detected from the
# loaded model's input_shape (see main()), since different training runs have
# used 224px (EfficientNetV2B0) and 320px (EfficientNetV2M) inputs.
IMG_SIZE = 320
N_CALIBRATION_BINS = 10


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_deps() -> None:
    """Fail clearly instead of mutating the research environment at runtime."""
    import importlib
    missing = []
    for pkg, import_name in [("scikit-learn", "sklearn"), ("matplotlib", "matplotlib"), ("seaborn", "seaborn")]:
        if importlib.util.find_spec(import_name) is None:
            missing.append(pkg)
    if missing:
        raise RuntimeError(f"Missing pinned evaluation dependencies: {missing}. Run pip install -r requirements.txt.")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dataset_manifest(paths: list[Path], root: Path) -> tuple[str, list[dict[str, object]]]:
    rows = [
        {"path": str(path.relative_to(root)).replace("\\", "/"), "bytes": path.stat().st_size, "sha256": sha256_file(path)}
        for path in sorted(paths)
    ]
    payload = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest(), rows


def bootstrap_interval(values: np.ndarray, statistic, *, samples: int = 2000, seed: int = 20260702) -> list[float]:
    rng = np.random.default_rng(seed)
    estimates = []
    for _ in range(samples):
        indices = rng.integers(0, len(values), len(values))
        estimates.append(float(statistic(indices)))
    low, high = np.percentile(estimates, [2.5, 97.5])
    return [round(float(low), 4), round(float(high), 4)]


def load_labels(labels_path: Path) -> dict[int, str]:
    raw = json.loads(labels_path.read_text(encoding="utf-8"))
    return {int(k): str(v) for k, v in raw.items()}


def match_folder_to_label(folder_name: str, labels: dict[int, str]) -> int | None:
    """Return label index whose name best matches folder_name (case-insensitive)."""
    fn = folder_name.lower().strip()
    for idx, name in labels.items():
        if fn == name.lower().strip():
            return idx
    # Partial match fallback (e.g. "CBB" inside "Cassava Bacterial Blight (CBB)")
    for idx, name in labels.items():
        abbrev = "".join(c for c in name if c.isupper()).lower()  # e.g. "cbb"
        if fn == abbrev or abbrev in fn or fn in name.lower():
            return idx
    return None


def load_dataset(dataset_dir: Path, labels: dict[int, str]) -> tuple[list[Path], list[int]]:
    """Return (image_paths, true_label_indices) for all matched subfolders."""
    paths: list[Path] = []
    truths: list[int] = []
    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    for folder in sorted(dataset_dir.iterdir()):
        if not folder.is_dir():
            continue
        idx = match_folder_to_label(folder.name, labels)
        if idx is None:
            print(f"[eval] WARNING: folder '{folder.name}' did not match any label — skipped.")
            continue
        images = [f for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTS]
        if not images:
            print(f"[eval] WARNING: folder '{folder.name}' has no supported images — skipped.")
            continue
        paths.extend(images)
        truths.extend([idx] * len(images))
        print(f"[eval] Loaded {len(images):>5} images for class {idx}: {labels[idx]}")
    return paths, truths


def load_unlabelled_images(dataset_dir: Path) -> list[Path]:
    extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    return sorted(path for path in dataset_dir.rglob("*") if path.is_file() and path.suffix.lower() in extensions)


def selective_mask(probs: np.ndarray) -> np.ndarray:
    confidence = np.max(probs, axis=1)
    sorted_probs = np.sort(probs, axis=1)
    margins = sorted_probs[:, -1] - sorted_probs[:, -2]
    entropy = -np.sum(np.clip(probs, 1e-12, 1) * np.log(np.clip(probs, 1e-12, 1)), axis=1) / np.log(probs.shape[1])
    return (confidence >= 0.55) & (margins >= 0.15) & (entropy <= 0.65)


def preprocess(image_path: Path) -> np.ndarray | None:
    bgr = cv2.imread(str(image_path))
    if bgr is None:
        return None
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA).astype("float32")
    return resized


def run_inference(model, paths: list[Path], batch_size: int = 32) -> tuple[np.ndarray, list[float]]:
    """Return (all_probabilities [N, C], per_image_latency_ms)."""
    import tensorflow as tf

    all_probs: list[np.ndarray] = []
    latencies: list[float] = []

    for start in range(0, len(paths), batch_size):
        batch_paths = paths[start: start + batch_size]
        batch_images = []
        for p in batch_paths:
            img = preprocess(p)
            if img is None:
                img = np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype="float32")
            batch_images.append(img)
        batch_arr = np.stack(batch_images, axis=0)
        t0 = time.perf_counter()
        output = model.predict(batch_arr, verbose=0)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies.extend([elapsed_ms / len(batch_paths)] * len(batch_paths))

        if float(np.min(output)) < 0 or float(np.max(output)) > 1 or abs(float(np.sum(output[0])) - 1.0) > 0.05:
            output = tf.nn.softmax(output).numpy()

        all_probs.append(output)
        done = min(start + batch_size, len(paths))
        print(f"[eval] Processed {done}/{len(paths)} images …", end="\r")

    print()
    return np.concatenate(all_probs, axis=0), latencies


def compute_ece(probs: np.ndarray, truths: list[int], n_bins: int = N_CALIBRATION_BINS) -> float:
    """Expected Calibration Error (Guo et al., 2017)."""
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    correct = (predictions == np.array(truths)).astype(float)
    ece = 0.0
    bin_edges = np.linspace(0, 1, n_bins + 1)
    for index, (lo, hi) in enumerate(zip(bin_edges[:-1], bin_edges[1:])):
        mask = (confidences >= lo) & ((confidences <= hi) if index == n_bins - 1 else (confidences < hi))
        if mask.sum() == 0:
            continue
        bin_acc = correct[mask].mean()
        bin_conf = confidences[mask].mean()
        ece += mask.sum() / len(truths) * abs(bin_acc - bin_conf)
    return float(ece)


def save_confusion_matrix(cm: np.ndarray, class_names: list[str], out_dir: Path) -> None:
    import matplotlib.pyplot as plt
    import seaborn as sns

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    for ax, data, title, fmt in [
        (axes[0], cm, "Confusion Matrix (counts)", "d"),
        (axes[1], cm.astype(float) / cm.sum(axis=1, keepdims=True).clip(min=1), "Confusion Matrix (row-normalised)", ".2f"),
    ]:
        sns.heatmap(data, annot=True, fmt=fmt, cmap="Blues", xticklabels=class_names,
                    yticklabels=class_names, ax=ax, linewidths=0.5)
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        ax.set_title(title)
    plt.tight_layout()
    path = out_dir / "confusion_matrix.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    print(f"[eval] Saved → {path}")


def save_calibration_plot(probs: np.ndarray, truths: list[int], out_dir: Path) -> None:
    import matplotlib.pyplot as plt

    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    correct = (predictions == np.array(truths)).astype(float)

    bin_edges = np.linspace(0, 1, N_CALIBRATION_BINS + 1)
    bin_acc, bin_conf = [], []
    for lo, hi in zip(bin_edges[:-1], bin_edges[1:]):
        mask = (confidences >= lo) & (confidences < hi)
        if mask.sum() == 0:
            continue
        bin_acc.append(correct[mask].mean())
        bin_conf.append(confidences[mask].mean())

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
    ax.bar(bin_conf, bin_acc, width=1 / N_CALIBRATION_BINS, alpha=0.7, color="steelblue", label="Model")
    ax.set_xlabel("Mean confidence")
    ax.set_ylabel("Fraction correct")
    ax.set_title("Reliability Diagram (Calibration)")
    ax.legend()
    path = out_dir / "calibration_plot.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    print(f"[eval] Saved → {path}")


def save_class_confidence_histogram(probs: np.ndarray, labels: dict[int, str], out_dir: Path) -> None:
    import matplotlib.pyplot as plt

    n_classes = probs.shape[1]
    fig, axes = plt.subplots(1, n_classes, figsize=(4 * n_classes, 4), sharey=True)
    if n_classes == 1:
        axes = [axes]
    for idx, ax in enumerate(axes):
        ax.hist(probs[:, idx], bins=20, range=(0, 1), color="mediumseagreen", edgecolor="white")
        ax.set_title(labels.get(idx, f"class-{idx}"), fontsize=8)
        ax.set_xlabel("P(class)")
    axes[0].set_ylabel("Count")
    fig.suptitle("Per-class Confidence Distribution", y=1.02)
    plt.tight_layout()
    path = out_dir / "confidence_histograms.png"
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[eval] Saved → {path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the AgroVision Cassava model on a labelled test set.")
    parser.add_argument("--dataset", required=True, help="Root directory with one subfolder per class.")
    parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH), help="Path to .keras model file.")
    parser.add_argument("--output", default="eval_results", help="Output directory for plots and JSON summary.")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--dataset-id", default="unspecified", help="Immutable dataset/version identifier.")
    parser.add_argument("--site", default="unspecified", help="Geographic collection site or external cohort name.")
    parser.add_argument("--ood-dataset", help="Optional negative/out-of-distribution image directory.")
    args = parser.parse_args()

    _ensure_deps()

    from sklearn.metrics import (
        classification_report,
        confusion_matrix,
        f1_score,
        top_k_accuracy_score,
    )
    import tensorflow as tf

    dataset_dir = Path(args.dataset)
    model_path = Path(args.model)
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_dir.is_dir():
        print(f"[eval] ERROR: dataset directory not found: {dataset_dir}")
        sys.exit(1)
    if not model_path.exists():
        print(f"[eval] ERROR: model not found: {model_path}")
        sys.exit(1)
    if not CASSAVA_LABELS_PATH.exists():
        print(f"[eval] ERROR: cassava_labels.json not found at: {CASSAVA_LABELS_PATH}")
        sys.exit(1)

    labels = load_labels(CASSAVA_LABELS_PATH)
    n_classes = len(labels)
    class_names = [labels[i] for i in range(n_classes)]

    print(f"\n[eval] Model    : {model_path}")
    print(f"[eval] Dataset  : {dataset_dir}")
    print(f"[eval] Labels   : {class_names}\n")

    paths, truths = load_dataset(dataset_dir, labels)
    if not paths:
        print("[eval] ERROR: No images found. Check subfolder names match cassava_labels.json.")
        sys.exit(1)
    print(f"\n[eval] Total images: {len(paths)}\n")

    print("[eval] Loading model …")
    try:
        model = tf.keras.models.load_model(str(model_path), compile=False)
    except TypeError as exc:
        if "quantization_config" not in str(exc):
            raise
        # Newer Keras save format than this TF/Keras runtime understands — strip the
        # unrecognised key from config.json inside the .keras archive and retry once.
        import zipfile
        print("[eval] Model saved with a newer Keras version — patching quantization_config …")
        compat_path = model_path.with_name(f"{model_path.stem}.compat{model_path.suffix}")

        def _strip(value):
            if isinstance(value, dict):
                value.pop("quantization_config", None)
                for child in value.values():
                    _strip(child)
            elif isinstance(value, list):
                for child in value:
                    _strip(child)

        with zipfile.ZipFile(model_path, "r") as src, zipfile.ZipFile(compat_path, "w", zipfile.ZIP_DEFLATED) as dst:
            for item in src.infolist():
                data = src.read(item.filename)
                if item.filename == "config.json":
                    cfg = json.loads(data.decode("utf-8"))
                    _strip(cfg)
                    data = json.dumps(cfg, separators=(",", ":")).encode("utf-8")
                dst.writestr(item, data)
        model = tf.keras.models.load_model(str(compat_path), compile=False)

    detected_size = model.input_shape[1]
    if detected_size and detected_size != IMG_SIZE:
        print(f"[eval] Model expects {detected_size}x{detected_size} input — overriding IMG_SIZE={IMG_SIZE}")
        globals()["IMG_SIZE"] = detected_size

    print("[eval] Running inference …")
    probs, latencies = run_inference(model, paths, batch_size=args.batch_size)

    predictions = np.argmax(probs, axis=1)
    truths_arr = np.array(truths)

    # --- Metrics ---
    class_indices = list(range(n_classes))
    report_dict = classification_report(truths_arr, predictions, labels=class_indices, target_names=class_names, output_dict=True, zero_division=0)
    report_str = classification_report(truths_arr, predictions, labels=class_indices, target_names=class_names, digits=4, zero_division=0)
    cm = confusion_matrix(truths_arr, predictions, labels=class_indices)
    top2_acc = top_k_accuracy_score(truths_arr, probs, k=2, labels=class_indices)
    ece = compute_ece(probs, truths)

    overall_acc = float(report_dict["accuracy"])
    macro_f1 = float(report_dict["macro avg"]["f1-score"])
    accepted = selective_mask(probs)
    selective_coverage = float(accepted.mean())
    selective_accuracy = float((predictions[accepted] == truths_arr[accepted]).mean()) if accepted.any() else None
    accuracy_ci = bootstrap_interval(truths_arr, lambda idx: np.mean(predictions[idx] == truths_arr[idx]))
    macro_f1_ci = bootstrap_interval(truths_arr, lambda idx: f1_score(truths_arr[idx], predictions[idx], labels=class_indices, average="macro", zero_division=0))
    dataset_sha256, manifest_rows = dataset_manifest(paths, dataset_dir)
    ood_summary = None
    if args.ood_dataset:
        ood_root = Path(args.ood_dataset)
        ood_paths = load_unlabelled_images(ood_root)
        if not ood_paths:
            raise RuntimeError(f"No supported OOD images found under {ood_root}")
        ood_probs, ood_latencies = run_inference(model, ood_paths, batch_size=args.batch_size)
        ood_accepted = selective_mask(ood_probs)
        ood_hash, ood_manifest = dataset_manifest(ood_paths, ood_root)
        (out_dir / "ood_dataset_manifest.json").write_text(json.dumps(ood_manifest, indent=2), encoding="utf-8")
        ood_summary = {
            "n_images": len(ood_paths),
            "dataset_manifest_sha256": ood_hash,
            "false_acceptance_rate": round(float(ood_accepted.mean()), 4),
            "referral_rate": round(float((~ood_accepted).mean()), 4),
            "latency_mean_ms": round(float(np.mean(ood_latencies)), 2),
        }

    # --- Print results ---
    print("\n" + "=" * 70)
    print("  CASSAVA MODEL EVALUATION RESULTS")
    print("=" * 70)
    print(report_str)
    print(f"  Top-2 Accuracy     : {top2_acc:.4f}")
    print(f"  ECE (calibration)  : {ece:.4f}  (lower = better; 0 = perfect)")
    print(f"  Mean latency       : {np.mean(latencies):.1f} ms/image")
    print(f"  P95  latency       : {np.percentile(latencies, 95):.1f} ms/image")
    print("=" * 70)

    # --- Save plots ---
    save_confusion_matrix(cm, class_names, out_dir)
    save_calibration_plot(probs, truths, out_dir)
    save_class_confidence_histogram(probs, labels, out_dir)

    # --- Save JSON summary ---
    summary = {
        "model_path": str(model_path),
        "model_sha256": sha256_file(model_path),
        "dataset_path": str(dataset_dir),
        "dataset_id": args.dataset_id,
        "collection_site": args.site,
        "dataset_manifest_sha256": dataset_sha256,
        "n_images": len(paths),
        "n_classes": n_classes,
        "class_names": class_names,
        "overall_accuracy": round(overall_acc, 4),
        "overall_accuracy_95ci": accuracy_ci,
        "top2_accuracy": round(top2_acc, 4),
        "macro_f1": round(macro_f1, 4),
        "macro_f1_95ci": macro_f1_ci,
        "ece": round(ece, 4),
        "selective_prediction": {
            "policy": {"min_confidence": 0.55, "min_top2_margin": 0.15, "max_normalized_entropy": 0.65},
            "coverage": round(selective_coverage, 4),
            "accuracy_on_accepted": round(selective_accuracy, 4) if selective_accuracy is not None else None,
            "n_accepted": int(accepted.sum()),
            "n_referred": int((~accepted).sum()),
        },
        "out_of_distribution": ood_summary,
        "latency_mean_ms": round(float(np.mean(latencies)), 2),
        "latency_p95_ms": round(float(np.percentile(latencies, 95)), 2),
        "per_class": {
            name: {
                "precision": round(report_dict[name]["precision"], 4),
                "recall": round(report_dict[name]["recall"], 4),
                "f1": round(report_dict[name]["f1-score"], 4),
                "support": int(report_dict[name]["support"]),
            }
            for name in class_names
        },
        "confusion_matrix": cm.tolist(),
        "reproducibility": {
            "python": platform.python_version(),
            "tensorflow": tf.__version__,
            "numpy": np.__version__,
            "bootstrap_seed": 20260702,
        },
    }
    summary_path = out_dir / "cassava_eval_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    (out_dir / "dataset_manifest.json").write_text(json.dumps(manifest_rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[eval] Saved → {summary_path}")
    print(f"\n[eval] ✅  All outputs saved to: {out_dir.resolve()}\n")


if __name__ == "__main__":
    main()
