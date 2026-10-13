# AgroVision Cassava Study Protocol

## Status

AgroVision is a research prototype for offline cassava leaf screening. It is not a validated diagnostic device and must not be used as the sole basis for pesticide, eradication, or quarantine decisions.

## Current model

The deployed model (`model/cassava_competition_model_v2.keras`) is an **EfficientNetV2M** backbone fine-tuned at **320x320** input resolution, trained on a single stratified split of the iCassava 2019 training set (5 classes: CBB, CBSD, CGM, CMD, Healthy). This supersedes the earlier EfficientNetV2B0 (224x224) model referenced in prior drafts of this protocol.

Informal internal result (single held-out stratified split, **not** the frozen external cohort described below): val_accuracy 82.87% at epoch 29/35 of fine-tuning. This number describes fit to a split of the same source distribution (East African iCassava images) and must not be reported as a generalisation or deployment-readiness claim per the claim gate below.

## Primary research question

On a geographically independent, expert-labelled cassava field cohort, what are the five-class macro-F1, per-class sensitivity, calibration error, and selective-prediction coverage of the frozen EfficientNetV2M model?

## Frozen evaluation design

1. Freeze the model checksum before opening the test labels.
2. Enrol consecutive eligible field images; do not select only clear or severe symptoms.
3. Split by farm and collection session, never by near-duplicate image.
4. Require two independent plant-pathology reviewers. Resolve disagreements by a third reviewer and report inter-rater agreement.
5. Keep the external test cohort untouched by training, threshold selection, and temperature scaling.
6. Report accuracy, balanced accuracy, macro-F1, per-class precision/recall/F1, confusion matrix, top-2 accuracy, ECE, latency, and 95% bootstrap confidence intervals.
7. Report selective accuracy and coverage under the frozen abstention policy: top-1 >= 0.55, top-2 margin >= 0.15, normalized entropy <= 0.65, and acceptable image quality.
8. Stratify results by farm/site, device, lighting, blur, cultivar when known, and symptom stage.
9. Publish all exclusions, corrupt files, missing labels, and failure cases.

## Required cohorts

- Development cohort: training and model selection only.
- Calibration cohort: threshold and optional temperature-scaling selection only.
- Internal test cohort: frozen before final model selection.
- External Thai/target-region cohort: required before claims about local deployment. **Status: not yet collected.** See `docs/thai-asean-cohort-plan.md` for the sourcing plan.
- Negative/OOD cohort: non-cassava plants, soil, hands, blank frames, and common nutrient or pest damage.

## Ground truth for visible extent

The current HSV regions are exploratory proposals, not lesion ground truth. Any affected-area claim requires expert pixel masks and must be evaluated with Dice/IoU and absolute area error. Until then, the UI reports the value as a provisional visible-symptom estimate or `Not assessed`.

## Reproducible command

```bash
cd backend
python evaluate_cassava.py --dataset <frozen-test-root> --dataset-id <version> --site <site-name> --output eval_results
```

The evaluator writes model and dataset SHA-256 identifiers, a file manifest, environment versions, confusion matrices, calibration plots, selective-prediction metrics, and machine-readable JSON.

The evaluator auto-detects the model's expected input resolution from `model.input_shape` at load time (it no longer assumes 224x224), so it works unmodified against both the retired EfficientNetV2B0 (224px) and current EfficientNetV2M (320px) checkpoints.

## Claim gate

No final accuracy, safety, geographic generalisation, severity, or outbreak-forecast claim may be placed in the product UI until the corresponding frozen evaluation artifact exists and is reviewed.
