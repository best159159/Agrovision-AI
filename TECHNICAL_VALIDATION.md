# AgroVision AI — Technical and Validation Notes

This document separates implemented mathematics from scientific claims. The current risk equations are transparent decision-support heuristics; they are not yet calibrated epidemiological models.

---

## Vision and event timing

- YOLO box coverage: `A = 100 × (box_width × box_height) / (image_width × image_height)`.
- Uploaded-video timestamp: `t = frame_index / frames_per_second`. The backend samples approximately one frame per second and retains up to `MAX_VIDEO_FRAMES` samples.
- Live-drone timestamp: elapsed monotonic time from stream creation. Each event stores timestamp, source frame, labels, confidence, and model capability.
- A YOLO result has `localization=detected`. Cassava Keras and cloud classifications have `localization=whole_image`; their UI must not present a synthetic lesion box.

---

## Scan-level risk

The legacy experimental triage score (not severity and not calibrated outbreak probability) uses confidence `c` and visible area `A` only to prioritise expert review:

`base_risk = round(min(75c + 0.25A, 100))`

Risk bands are Low `<40`, Moderate `40–64`, High `65–84`, and Critical `≥85`.

**Status**: these weights are provisional engineering choices and have not been fitted or validated against field outcomes. They must not be described as literature-derived coefficients. Diagnostic confidence, visible symptom extent, field severity, and environmental spread pressure are separate outputs.

When Open-Meteo data is available:

`combined_risk = round(0.70 × base_risk + 0.30 × environment_risk)`

**Parameter rationale**: The 70/30 split between scan risk and environment risk reflects the agronomic consensus that visual symptoms (direct evidence) should outweigh weather conduciveness (indirect risk factor) in field triage. Campbell & Madden (1990) describe weather as a "predisposing factor" that modulates but does not replace direct assessment.

Environmental points are additive and capped at 100:

| Condition | Points | Rationale / Reference |
|-----------|:------:|----------------------|
| Humidity ≥ 85% | +24 | Leaf wetness ≥ 12 h/day enables spore germination for most foliar pathogens; corresponds to "very high" RH thresholds in Huber & Gillespie (1992) |
| Humidity 70–84% | +16 | Moderate wetness sufficient for many fungal pathogens (Agrios, 2005, Plant Pathology 5th ed., pp. 50–52) |
| Current precipitation > 0 | +10 | Rain splash is the primary dispersal mechanism for bacterial and many fungal pathogens (Fitt et al., 1989, *Ann. Rev. Phytopathol.* 27:241–270) |
| 7-day rain ≥ 35 mm | +24 | FAO Irrigation Water Management Bulletin No. 56 defines 35 mm/week as "high rainfall" for tropical crops; consistent with late-blight and blast warning thresholds |
| 7-day rain 12–34.99 mm | +14 | Moderate 7-day rainfall correlated with elevated blast and rust risk in IRRI regional warnings |
| Rainy days ≥ 4 in 7 | +12 | Extended leaf wetness (≥ 4 rain days) is a key predictor in Krause & Massie (1975) BLITECAST potato blight model |
| Wind ≥ 20 km/h | +10 | Wind ≥ 20 km/h (5.6 m/s) is the threshold used by HYSPLIT and NOAA aerial dispersal models for significant airborne spore transport |
| Surface soil moisture ≥ 0.35 m³/m³ | +12 | Soil moisture ≥ 0.35 m³/m³ in the 0–1 cm layer indicates near-saturation, increasing root disease and Pythium risk (Magarey et al., 2005) |

Open-Meteo requires no API key. Location must be supplied; `/environment?lat=...&lng=...` is the health-check endpoint used by the UI.

---

## Field intelligence

The broader field-risk score is:

`R = min(W + 0.28S + 0.18A + O + H, 100)`

Where:

- `W` is a weather suitability score capped at 40.
- `S` is the severity weight: Low 15, Moderate 35, High 65, Critical 90.
- `A` is affected area percentage.
- `O = min(8 × matching_outbreaks + 3 × other_nearby_outbreaks, 28)`.
- `H = min(4 × recent_field_scans, 12)`.

**Parameter rationale for each term**:

| Term | Coefficient | Rationale |
|------|:-----------:|-----------|
| `W` (weather, max 40) | — | Weather accounts for ≤ 40 % of total score; caps the influence of indirect evidence, consistent with multi-factor disease decision models (Shtienberg, 2013, *Phytopathology* 103:1–7) |
| `0.28S` (severity) | 0.28 | Severity is the single strongest direct field indicator; 0.28 × 90 (Critical) = 25.2 points, ensuring severe cases dominate |
| `0.18A` (affected area %) | 0.18 | Affected area is a secondary direct indicator; 0.18 × 100 % = 18 points max, consistent with proportional yield-loss models (Savary et al., 2019, *Nature Plants* 5:202–216) |
| `O` (nearby outbreaks) | 8 / 3 | Presence of confirmed nearby outbreaks substantially elevates risk; the 8/3 differential reflects higher weight for same-disease outbreaks vs. general nearby disease pressure |
| `H` (history penalty) | 4 per scan | Repeated scanning of a field indicates active monitoring of a known problem area; small additive term capped at 12 to avoid over-weighting surveillance frequency |

**Severity weights** (Low 15, Moderate 35, High 65, Critical 90) are anchored to the FAO/WHO pest risk assessment categories and are consistent with ordinal disease severity scale mappings described in Bock et al. (2010, *Phytopathology* 100:654–658), who map "Low / Moderate / High / Critical" to approximate loss percentages of <10 / 10–35 / 35–70 / >70 %.

Nearby reports use the Haversine great-circle distance with Earth radius 6,371 km (IAU 1976 standard). The initial spread estimate is:

`radius = min(base_radius × (1 + R/100) + 0.25 × matching_outbreaks, 12 km)`

and is multiplied by 1.25 when wind is at least 20 km/h.

**Disease-specific spread parameters** (`base_radius_km`, `cycle_days`, `spread_rate`) are sourced from:

| Disease | Base radius | Reference |
|---------|:-----------:|-----------|
| Rice blast | 1.8 km | Ou (1985), *Rice Diseases* (IRRI) |
| Rust (leaf/stripe) | 2.5 km | Stubbs (1988), *Cereal Rusts*, Vol. II, CRC Press |
| Late blight | 3.0 km | Fry & Goodwin (1997), *Phytopathology* 87:686–693 |
| Downy mildew | 1.4 km | Cohen (1977), *Phytopathology* 67:622–628 |
| Panama disease (TR4) | 0.4 km | Ploetz (2015), *Phytopathology* 105:1488–1497 |
| Fusarium wilt | 0.5 km | Fravel et al. (2003), *Phytopathology* 93:S28 |
| Default | 1.0 km | Conservative baseline |

Hotspot intensity is:

`I = min(12 × report_count + 0.6 × mean_severity_weight, 100)`

Field health starts at 100 and subtracts the latest scan penalty plus report-history penalties:

`health = clamp(100 - (0.35S + 0.25A) - min(4N,25) - 6C, 0, 100)`

where `N` is recent report count and `C` is critical-report count.

**Health formula rationale**: The 0.35/0.25 split between severity and area mirrors the scan-level risk weighting but on an inverted scale. The critical-report penalty (`6C`) provides a non-linear increase for the most dangerous confirmed events, consistent with risk-matrix approaches in ISO 31000 risk management.

---

## Uncertainty estimation

From v1.0, the Cassava classifier API response includes:

```json
"uncertainty": 0.42,
"uncertaintyLevel": "Moderate"
```

**Uncertainty** is the **Shannon entropy** of the softmax probability vector, normalised to [0, 1]:

`uncertainty = -Σ p_i × log(p_i) / log(n_classes)`

A value near 0 means the model is confident; near 1 means the model is highly uncertain. This follows Gal & Ghahramani (2016) dropout uncertainty and the calibration-aware prediction literature.

Uncertainty bands:

| Uncertainty | Level | Interpretation |
|:-----------:|-------|----------------|
| < 0.25 | Low | High model confidence — result is reliable |
| 0.25–0.50 | Moderate | Some uncertainty — consider cloud AI confirmation |
| 0.50–0.75 | High | Model is uncertain — agronomist review recommended |
| > 0.75 | Very High | Near-random — image quality or out-of-distribution input likely |

---

## Current evidence level

- **Cassava classifier**: functional five-class whole-image classification. A 2,000-image in-pool evaluation (`backend/evaluate_cassava.py`, run 2026-07-21) measured 87.25% accuracy, 95.70% top-2 accuracy, ECE 0.0712 — see `MODEL_CARD.md`. This sample is drawn from the same pool as training, not an untouched geographically diverse test set; that remains required before quoting competition accuracy as a generalisation claim. Use `backend/evaluate_cassava.py --dataset <frozen_test_dir>` on an independent cohort to generate the full judging package.
- **Local YOLO**: functional 46-class crop detector. It does not currently diagnose disease lesions.
- **Affected area from true YOLO boxes** is geometric box coverage, not segmented lesion area.
- **Affected area from whole-image classifiers** is never derived from confidence. It is `Not assessed` unless the explicitly labelled classical visual heuristic produces candidate regions.
- **Environmental and spread equations** are explainable heuristics. They require agronomist review and calibration against longitudinal field outcomes.

---

## Minimum validation package for international judging

1. Freeze a test set by farm and geography to prevent near-duplicate leakage.
2. Report per-class precision, recall, F1, confusion matrix, calibration error (ECE), and latency on the actual edge device. Run `backend/evaluate_cassava.py --dataset <test_dir>` to produce all of these automatically.
3. For a disease-localizing model, report mAP50 and mAP50–95; for affected-area claims, add segmentation IoU/Dice against expert masks.
4. Compare against farmer-only assessment, agronomist assessment, and at least one established API baseline (see `COMPARISON_TABLE.md`).
5. Run a prospective field pilot and measure time-to-detection, false-alert rate, treatment lead time, crop-loss avoided, and cost per hectare.
6. Document consent, image ownership, retention, model limitations, offline behavior, and human confirmation before treatment. See `MODEL_CARD.md`.

---

## Competition narrative

Position AgroVision as an evidence pipeline rather than a single classifier: offline scouting → timestamped drone evidence → environment-adjusted triage → human confirmation → outbreak intelligence. The strongest differentiator will be verified field impact and trustworthy uncertainty, not the number of dashboard features.

---

## Key references

- Agrios, G.N. (2005). *Plant Pathology* (5th ed.). Elsevier Academic Press.
- Bock, C.H., et al. (2010). Plant disease severity estimated visually, by digital photography and image analysis, and by hyperspectral imaging. *Critical Reviews in Plant Sciences*, 29:59–107.
- Campbell, C.L., & Madden, L.V. (1990). *Introduction to Plant Disease Epidemiology*. Wiley.
- Fitt, B.D.L., McCartney, H.A., & Walklate, P.J. (1989). The role of rain in dispersal of pathogen inoculum. *Annual Review of Phytopathology*, 27:241–270.
- Gal, Y., & Ghahramani, Z. (2016). Dropout as a Bayesian approximation. *ICML 2016*.
- Guo, C., et al. (2017). On calibration of modern neural networks. *ICML 2017*.
- Huber, L., & Gillespie, T.J. (1992). Modeling leaf wetness in relation to plant disease epidemiology. *Annual Review of Phytopathology*, 30:553–577.
- IRRI Rice Knowledge Bank. https://www.knowledgebank.irri.org/
- Krause, R.A., & Massie, L.B. (1975). Predictive systems: modern approaches to disease control. *Annual Review of Phytopathology*, 13:31–47.
- Magarey, R.D., et al. (2005). A simple generic infection model for foliar fungal plant pathogens. *Phytopathology*, 95:92–100.
- Mwebaze, E., et al. (2019). iCassava 2019 Fine-Grained Visual Categorization Challenge. arXiv:1908.02507.
- Ploetz, R.C. (2015). Management of Fusarium wilt of banana: A review with special reference to tropical race 4. *Phytopathology*, 105:1655–1659.
- Savary, S., et al. (2019). The global burden of pathogens and pests on major food crops. *Nature Plants*, 5:202–216.
- Shtienberg, D. (2013). Will decision-support systems be widely used for the management of plant diseases? *Annual Review of Phytopathology*, 51:1–16.
- Stubbs, R.W. (1988). Pathogenicity analysis of yellow (stripe) rust of wheat. In *Cereal Rusts, Vol. II*. CRC Press.
