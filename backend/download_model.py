"""
Download the plant-disease YOLO model from HuggingFace and save it to models/plant-disease.pt
Model: foduucom/plant-leaf-detection-and-classification (YOLOv8)
"""
import sys
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODELS_DIR / "plant-disease.pt"


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if MODEL_PATH.exists():
        print(f"[OK] Model already exists at {MODEL_PATH} ({MODEL_PATH.stat().st_size / 1e6:.1f} MB)")
        return

    print("[*] Downloading plant-disease YOLO model from HuggingFace ...")
    print("    Model: foduucom/plant-leaf-detection-and-classification")

    try:
        from ultralytics import YOLO
        model = YOLO("foduucom/plant-leaf-detection-and-classification")
        # Save a copy to our models directory
        import shutil
        # Find the cached .pt file ultralytics just downloaded
        src = Path(model.ckpt_path) if hasattr(model, "ckpt_path") and model.ckpt_path else None
        if src is None:
            # Fallback: try model.model.pt_path
            try:
                src = Path(model.model.pt_path)
            except Exception:
                src = None

        if src and src.exists():
            shutil.copy2(src, MODEL_PATH)
            print(f"[OK] Saved to {MODEL_PATH} ({MODEL_PATH.stat().st_size / 1e6:.1f} MB)")
        else:
            # Export the model directly
            print("[*] Exporting model weights ...")
            model.save(str(MODEL_PATH))
            print(f"[OK] Saved to {MODEL_PATH} ({MODEL_PATH.stat().st_size / 1e6:.1f} MB)")

        # Print class names so we know what diseases it can detect
        names = model.names
        print(f"\n[*] Model can detect {len(names)} classes:")
        for idx, name in names.items():
            print(f"    {idx:3d}: {name}")

    except Exception as e:
        print(f"[ERROR] {e}")
        print("\n[*] Trying alternative download via huggingface_hub ...")
        try:
            from huggingface_hub import hf_hub_download
            path = hf_hub_download(
                repo_id="foduucom/plant-leaf-detection-and-classification",
                filename="best.pt",
            )
            import shutil
            shutil.copy2(path, MODEL_PATH)
            print(f"[OK] Saved to {MODEL_PATH} ({MODEL_PATH.stat().st_size / 1e6:.1f} MB)")
        except Exception as e2:
            print(f"[ERROR] Alternative also failed: {e2}")
            sys.exit(1)


if __name__ == "__main__":
    main()
