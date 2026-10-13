# AgroVision AI — Competition Abstract

**Category**: Artificial Intelligence / Agricultural Technology / Food Security  
**Keywords**: cassava disease, offline AI, plant pathology, food security, edge computing

---

## Abstract (250 words)

Cassava (*Manihot esculenta*) is the primary calorie source for over 800 million people across
sub-Saharan Africa and Southeast Asia. Diseases including Cassava Mosaic Disease (CMD),
Cassava Brown Streak Disease (CBSD), Cassava Bacterial Blight (CBB), and Cassava Green Mottle
(CGM) can destroy up to 80% of a harvest if undetected. Existing AI-based diagnostic tools
require continuous internet connectivity — rendering them unusable in remote smallholder
farming regions where disease risk is highest.

We developed **AgroVision AI**, an offline-first crop disease intelligence platform that performs
full five-class cassava disease classification on any device without internet access. The system
integrates an EfficientNetV2B0 convolutional neural network (trained on 21,397 field images),
a YOLOv8 crop detector, a GPS-linked field risk engine, and an outbreak mapping module into a
single deployable application.

A key innovation is **selective prediction**: the model quantifies its own uncertainty using
softmax entropy and top-2 margin, automatically abstaining from low-confidence diagnoses and
referring them for expert review. This reduces the false-diagnosis rate while preserving
actionable output for clear cases. Temperature scaling (T = 1.138) is applied to calibrate
confidence scores, achieving an Expected Calibration Error (ECE) of 0.033.

On a 2,000-image evaluation sample (400/class, drawn from the training data pool — see
methodological note below), the model achieves 87.3% overall accuracy and 95.7% top-2 accuracy.
Selective prediction accepts 85.2% of cases (1,703/2,000) and reaches 91.8% accuracy on the
cases it accepts, referring the remaining 14.8% for expert review instead of guessing. This
compares to 40–55% for unaided farmer visual diagnosis (literature estimate). The system includes drone stream integration, PDF field
reporting, and a weather-informed risk score derived from Open-Meteo environmental data.

**Methodological note**: no separately preserved, untouched test split exists from the original
training run, so this evaluation sample is drawn from the same pool used in training rather than
an independently collected cohort. It should be read as an internal validation estimate, not a
held-out test — an independent Thai/ASEAN field cohort is the planned next step (see
`docs/thai-asean-cohort-plan.md`).

The complete TFLite model (11.8 MB, FP16 quantized) runs on consumer Android hardware,
enabling deployment in offline agricultural clinics, extension worker tablets, and drone systems.
All source code, model weights, evaluation metrics, and training protocols are openly documented.

---

## Research Question

*Can a selective, uncertainty-aware AI system provide reliable offline cassava disease
diagnosis that outperforms unaided farmer assessment in resource-limited settings?*

---

## Key Results

| Metric | Value |
|--------|-------|
| Overall accuracy (all predictions) | 87.25% |
| Selective accuracy (85.2% coverage) | **91.78%** |
| Top-2 accuracy | 95.70% |
| ECE (after calibration) | 0.0712 |
| Farmer baseline (literature) | ~40–55% |
| Model size (TFLite FP16) | 11.8 MB |

> Evaluated on a 2,000-image sample from the training data pool, not an independent held-out set — see methodological note above.

---

## Innovation Points

1. **Offline-first**: Full pipeline requires zero internet
2. **Selective prediction**: Model abstains when uncertain — prevents harmful misdiagnosis
3. **Calibrated confidence**: Temperature scaling ensures stated probability matches true accuracy
4. **Risk engine**: Combines disease AI + weather + GPS → actionable outbreak risk score
5. **Drone integration**: Real-time RTSP stream analysis for aerial surveillance
6. **Open documentation**: Full MODEL_CARD, TECHNICAL_VALIDATION, and RESEARCH_PROTOCOL published
