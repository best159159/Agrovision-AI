# Thai/ASEAN External Validation Cohort — Sourcing Plan

## Why this exists

`RESEARCH_PROTOCOL.md` sets a claim gate: no accuracy, safety, or geographic-generalisation claim may reach the product UI until the model has been evaluated on a **geographically independent, expert-labelled** cassava field cohort from the target deployment region (Thailand/ASEAN). The training data (iCassava 2019) is East African. This document is the plan for closing that gap — it does not itself constitute the evaluation.

## Target cohort size

- **Minimum viable pilot:** 150–250 images total, roughly balanced across the 5 classes (CBB, CBSD, CGM, CMD, Healthy), from at least 2 distinct farms/sites. This is small enough to be realistic for a student timeline and still large enough to report per-class sensitivity with a 95% bootstrap CI, per protocol section 6.
- **Stronger cohort (stretch goal):** 500+ images, 4+ sites, spanning at least two collection sessions per site (protocol section 3: split by farm and session, not by near-duplicate image).
- Report the achieved N honestly — a small pilot cohort is still valid evidence if labelled correctly and its limitations are stated, per the protocol's "publish all exclusions" requirement (section 9).

## Sourcing options, ranked by realism for a TISIIF timeline

### 1. University plant pathology / agriculture faculty (highest priority)
Thailand has active cassava research groups that can plausibly provide labelled images or on-site access with a plant pathologist for identification:
- **Kasetsart University** (Bangkok/Kamphaeng Saen) — has a cassava breeding and pathology program; the Department of Plant Pathology can potentially provide expert labelling.
- **Rayong Field Crops Research Center** (Department of Agriculture, กรมวิชาการเกษตร) — a national cassava research station; Rayong province is a major cassava-growing area.
- **Khon Khaen University / Northeast agriculture faculties** — Northeast Thailand is the largest cassava-growing region domestically.

**Action:** email or ask a school science teacher/advisor to help make an introduction. Frame the ask narrowly: "May I visit with a camera and have a pathologist confirm ~5–10 leaf images per visit as CBB/CBSD/CGM/CMD/Healthy?" A short site visit repeated 2–3 times across different plots is enough for the pilot cohort.

### 2. Department of Agricultural Extension (กรมส่งเสริมการเกษตร) local office
Provincial agricultural extension offices work directly with cassava farmers and often already have disease-monitoring photos or can arrange a farm visit. Nakhon Ratchasima, Kamphaeng Phet, and Rayong provinces are Thailand's largest cassava producers and the most likely to have an active extension presence.

### 3. Direct farm visits with self-collected images + expert-reviewed labels
If no institution partner responds in time:
1. Identify 1–2 nearby cassava farms (ask family/school contacts, or provincial agriculture office for a list).
2. Photograph leaves under varied real conditions (per protocol section 8: vary lighting, device, symptom stage — do not cherry-pick clear/severe cases only).
3. Get labels reviewed by **two independent people with real plant-pathology background** (not yourself) — a university contact, agricultural extension officer, or DOA staff. Protocol section 4 requires two independent reviewers with a third to resolve disagreement; report inter-rater agreement (Cohen's kappa) even for a small cohort.

### 4. iNaturalist / GBIF Thailand records (fallback, weakest option)
The project's `/map/observations` endpoint already pulls iNaturalist data. Some Thailand-tagged cassava disease observations may exist and be usable as a **screening reference**, but:
- iNaturalist identifications are community-labelled, not expert-confirmed pathology — this does **not** satisfy the protocol's "two independent plant-pathology reviewers" requirement on its own.
- Usable only as a supplementary/negative-cohort source (e.g., healthy cassava photos, non-cassava plants for the OOD cohort), not as the primary external test cohort.

### 5. Published Thai/SE Asian cassava disease datasets (check availability, do not assume)
Search Mendeley Data, IEEE DataPort, and university repositories for an existing labelled Thai cassava disease image set before assuming one doesn't exist — but do not substitute a dataset of unknown provenance/labelling rigor for the protocol's expert-review requirement without documenting how it was labelled.

## Minimum process to satisfy the protocol once images are collected

Following `RESEARCH_PROTOCOL.md` sections 1–9 directly:
1. **Freeze the model checksum first** — record the SHA-256 of `model/cassava_competition_model_v2.keras` before any external label is opened (the `evaluate_cassava.py` script does this automatically).
2. Do not pre-filter to "good" photos — include blurry/ambiguous ones and let the quality gate (`inputQuality` in the API response) handle them, so selective-prediction coverage is measured honestly.
3. Two independent reviewers label each image; a third resolves disagreements; report agreement (kappa).
4. Run `python evaluate_cassava.py --dataset <path> --dataset-id thai-pilot-v1 --site <farm/province name> --output eval_results` (already updated to auto-detect this model's 320px input).
5. The resulting `eval_results/` artifact is what unlocks any "works in Thailand" language in the UI or a competition write-up — not before.

## Realistic timeline for TISIIF prep

| Week | Action |
|---|---|
| 1 | Reach out to 2–3 university/extension contacts in parallel; don't wait serially |
| 2 | First site visit or dataset arrives; begin independent labelling |
| 3 | Second reviewer pass, resolve disagreements, freeze cohort |
| 4 | Run `evaluate_cassava.py`, review results honestly (including if they're bad), update the poster/report with real numbers and limitations |

If nothing materializes in time for the fair deadline, the honest fallback is **not** to claim Thai deployment-readiness at all — present the iCassava-only result clearly labelled as such, and describe this sourcing plan as future work. That is still a defensible, honest scientific position (see the earlier discussion on not misrepresenting results to judges).
