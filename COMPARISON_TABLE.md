# AgroVision AI — Baseline Comparison Table

This table documents how AgroVision AI compares against common baselines for cassava disease classification.

---

## How to Complete This Table

1. **AgroVision (Cassava AI)**: Run `backend/evaluate_cassava.py --dataset <frozen_test_dir>` and copy results here.
2. **Kindwise Crop.health API**: Submit the same test images via the `/scan` endpoint with `PREFERRED_CLOUD_AI=kindwise_crop` and collect `confidence` values.
3. **Plant.id API**: Submit via `/scan` with `PREFERRED_CLOUD_AI=plant_id`.
4. **Farmer (unaided)**: Collect farmer labels during field pilot — ask farmers to classify images without any tool.
5. **Agronomist (unaided)**: Same image set reviewed by a trained plant pathologist; treat as ground truth upper bound.

---

## Classification Accuracy — Cassava Disease (5 classes)

| Approach | Overall Accuracy | Macro F1 | Top-2 Accuracy | ECE (↓ better) | Notes |
|---|:---:|:---:|:---:|:---:|---|
| **AgroVision — Cassava AI** (EfficientNetV2B0) | **87.25%** | **87.32%** | **95.70%** | **0.0712** | Evaluated on 2,000 images (400/class) sampled from the same iCassava/Kaggle cassava-leaf-disease pool used in training — **not an independently collected test set**. See caveat below. |
| **AgroVision — Selective Prediction** | **91.78%** on accepted | — | — | — | Coverage 85.15% (1,703/2,000 accepted). Abstains when confidence < 0.55, margin < 0.15, or entropy > 0.65. |
| Kindwise Crop.health API | [PENDING] | [PENDING] | — | — | Cloud-only; requires API key |
| Plant.id v3 API | [PENDING] | [PENDING] | — | — | Cloud-only; requires API key |
| Farmer (unaided visual) | ~40–55%¹ | — | — | — | Literature estimate for smallholder farmers |
| Agronomist (unaided visual) | ~85–92%¹ | — | — | — | Upper bound; literature for trained pathologists |

¹ *Estimated from Mwebaze et al. (2019) and Ramcharan et al. (2017) field studies. Replace with actual field pilot data before competition submission.*

> [!IMPORTANT]
> The AgroVision metrics above come from a **2,000-image sample drawn from the same public dataset pool used to train this model** (iCassava 2019 / Kaggle "cassava-leaf-disease-classification", 21,397 images total). No separately preserved, untouched test split exists from the original training run, so this number likely **overstates** real-world accuracy on genuinely unseen images — treat it as an internal validation estimate, not a held-out test. An independent Southeast Asian evaluation cohort (see `docs/thai-asean-cohort-plan.md`) is required before making deployment claims outside this training population.

---

## Per-Class F1 — Cassava AI (from evaluate_cassava.py, n=2,000, 400/class)

| Class | Precision | Recall | F1 | Support |
|-------|:---------:|:------:|:--:|:-------:|
| Cassava Bacterial Blight (CBB) | 91.92% | 82.50% | 86.96% | 400 |
| Cassava Brown Streak Disease (CBSD) | 90.13% | 89.00% | 89.56% | 400 |
| Cassava Green Mottle (CGM) | 92.99% | 86.25% | 89.49% | 400 |
| Cassava Mosaic Disease (CMD) | 86.65% | 92.50% | 89.48% | 400 |
| Healthy | 76.79% | 86.00% | 81.13% | 400 |
| **Macro avg** | **87.70%** | **87.25%** | **87.32%** | 2,000 |

Mean latency: 507.2 ms/image · P95 latency: 756.4 ms/image (CPU inference, no GPU — see limitations).

> [!NOTE]
> This class-balanced sample (400/class, not proportional to the real-world 61.5% CMD skew) makes minority-class performance easier to read but is not representative of the deployment-time class distribution. Healthy has the weakest precision (76.8%), meaning the model's single largest error mode is over-calling Healthy leaves as diseased — worth stating plainly rather than only citing the flattering classes.

---

## Key Differentiators (Qualitative)

| Capability | AgroVision AI | Kindwise API | Plant.id API | Farmer |
|---|:---:|:---:|:---:|:---:|
| Works fully offline | ✅ | ❌ | ❌ | ✅ |
| Video / drone stream | ✅ | ❌ | ❌ | ❌ |
| Field outbreak map | ✅ | ❌ | ❌ | ❌ |
| Risk score + spread forecast | ✅ | ❌ | ❌ | ❌ |
| Uncertainty estimate | ✅ | ❌ | ❌ | ❌ |
| Selective prediction (abstain if uncertain) | ✅ | ❌ | ❌ | ❌ |
| Explainable risk formula | ✅ | ❌ | ❌ | ✅ (intuition) |
| Treatment recommendation | ✅ | ✅ | ✅ | ✅ (local knowledge) |
| Multi-crop support | ✅ (YOLO) | ✅ | ✅ | ✅ |
| PDF field report | ✅ | ❌ | ❌ | ❌ |
| No internet required | ✅ | ❌ | ❌ | ✅ |
| Free to operate | ✅ | ❌ (paid API) | ❌ (paid API) | ✅ |

---

## Field Pilot Metrics (fill after pilot)

> [!IMPORTANT]
> These metrics require a prospective field pilot. Document at least 2 weeks of real-field use before competition submission.

| Metric | AgroVision AI | Agronomist | Farmer |
|--------|:---:|:---:|:---:|
| Time-to-detection (days) | [PENDING] | [PENDING] | [PENDING] |
| False-alert rate (%) | [PENDING] | [PENDING] | [PENDING] |
| Treatment lead time saved (days) | [PENDING] | — | — |
| Estimated crop loss avoided (%) | [PENDING] | — | — |
| Cost per hectare assessed (USD) | [PENDING] | [PENDING] | [PENDING] |

---

## References

- Mwebaze, E., et al. (2019). iCassava 2019 Fine-Grained Visual Categorization Challenge. arXiv:1908.02507.
- Ramcharan, A., et al. (2017). Deep learning for image-based cassava disease detection. *Frontiers in Plant Science*, 8:1852.
- Hughes, D., & Salathé, M. (2015). An open access repository of images on plant health. arXiv:1511.08060.
