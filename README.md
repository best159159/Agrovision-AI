# AgroVision AI

**Offline-first cassava disease intelligence platform** — AI diagnosis, outbreak mapping, drone monitoring, and field risk assessment with zero internet dependency.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange)](https://tensorflow.org)
[![Model](https://img.shields.io/badge/Model-EfficientNetV2B0-blue)](model/)

---

## What is AgroVision AI?

AgroVision AI is a research platform for cassava disease screening that works **fully offline**. It combines:

- *On-device AI** — EfficientNetV2B0 classifies 5 cassava diseases locally (no internet required)
- **Selective prediction** — model abstains when uncertain, preventing false diagnoses
- **Outbreak mapping** — pin confirmed disease locations and view risk hotspots
- **Risk engine** — GPS + weather + disease probability → outbreak risk score
- **Drone integration** — analyze RTSP video streams from agricultural drones
- **PDF reports** — generate structured field reports for agronomists

### Model Performance

| Metric | Value |
|--------|-------|
| Overall accuracy | 87.25% |
| Selective accuracy (85.2% coverage) | **91.78%** |
| Top-2 accuracy | 95.70% |
| ECE (calibrated) | 0.0712 |
| Farmer baseline | ~40–55% (literature) |
| TFLite model size | 11.8 MB |

---

## Quick Start

### 1. Frontend

```bash
npm ci
npm run dev
# Open: http://localhost:3000
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Using Docker (if OpenCV install fails)

```bash
docker build -f backend/Dockerfile -t agrovision-api .
docker run --env-file backend/.env -p 8000:8000 agrovision-api
```

---

## Project Structure

```
├── app/                    # Next.js 15 frontend
│   ├── about/              # Project overview page
│   ├── dashboard/          # Scan result dashboard
│   ├── drone/              # Drone RTSP monitor
│   ├── intelligence/       # Risk engine + early warning
│   ├── map/                # Outbreak map
│   └── scan/               # Scan (offline / online modes)
├── backend/
│   ├── main.py             # FastAPI server
│   ├── evaluate_cassava.py # Evaluation script (run to get metrics)
│   └── .env                # API keys and model paths
├── components/             # Shared React components
├── model/                  # Trained model + evaluation artifacts
│   ├── cassava_competition_model.keras
│   ├── cassava_labels.json
│   ├── calibration.json
│   ├── evaluation_metrics.json
│   └── confusion_matrix.png
├── ABSTRACT.md             # Competition abstract (250 words)
├── COMPARISON_TABLE.md     # Baseline comparison
├── MODEL_CARD.md           # Full model documentation
├── TECHNICAL_VALIDATION.md # Statistical validation methodology
└── RESEARCH_PROTOCOL.md    # Data collection and ethics protocol
```

---

## Running Evaluation

To reproduce evaluation metrics on your own test dataset:

```bash
cd backend
python evaluate_cassava.py \
  --dataset path/to/test/dataset \
  --output eval_results \
  --site "your-location"
```

Dataset must have one subfolder per class:
```
test_dataset/
  Cassava Bacterial Blight (CBB)/
  Cassava Brown Streak Disease (CBSD)/
  Cassava Green Mottle (CGM)/
  Cassava Mosaic Disease (CMD)/
  Healthy/
```

Output: `eval_results/cassava_eval_summary.json` with full metrics + SHA256 manifest.

---

## Key Innovations

| Feature | Description |
|---------|-------------|
| **Offline-first** | Zero internet required for diagnosis |
| **Selective prediction** | Abstains on uncertain cases (prevents false diagnoses) |
| **Calibrated confidence** | Temperature scaling (T=1.138) aligns confidence with accuracy |
| **Risk engine** | Multi-factor outbreak risk score using disease + weather + GPS |
| **Edge-ready** | TFLite FP16 model (11.8 MB) for Android/Raspberry Pi |
| **Drone support** | RTSP stream integration for aerial monitoring |

---

## Known Limitations

- Training data is from East Africa only (geographic bias)
- Bounding boxes are colour-threshold estimates, not neural network localisation
- Model confuses CMD and CGM in ~15% of cases with high confidence
- Cloud diagnosis requires Kindwise API key (not included)

See [MODEL_CARD.md](MODEL_CARD.md) for full documentation.

---

## Documentation

| File | Purpose |
|------|---------|
| [ABSTRACT.md](ABSTRACT.md) | 250-word competition abstract |
| [MODEL_CARD.md](MODEL_CARD.md) | Model architecture, metrics, limitations |
| [COMPARISON_TABLE.md](COMPARISON_TABLE.md) | Baseline comparison vs. cloud APIs and farmers |
| [TECHNICAL_VALIDATION.md](TECHNICAL_VALIDATION.md) | Statistical validation methodology |
| [RESEARCH_PROTOCOL.md](RESEARCH_PROTOCOL.md) | Data collection and ethics |

---

## License

Research use only. Model trained on [iCassava 2019](https://arxiv.org/abs/1908.02507) dataset.
