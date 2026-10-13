"""Pure, testable decision-support metrics used by AgroVision.

These functions deliberately keep diagnostic confidence separate from visible
symptom extent. Thresholds are operational guardrails and must be calibrated on
a geographically independent field dataset before clinical/agronomic use.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Sequence

import cv2
import numpy as np


@dataclass(frozen=True)
class InputQuality:
    acceptable: bool
    blur_variance: float
    mean_brightness: float
    warnings: list[str]


@dataclass(frozen=True)
class SelectiveDecision:
    status: str
    accepted: bool
    reasons: list[str]
    top1_confidence: float
    top2_margin: float
    normalized_entropy: float


def normalized_entropy(probabilities: Sequence[float]) -> float:
    probs = np.asarray(probabilities, dtype=float)
    probs = np.clip(probs, 1e-12, 1.0)
    if probs.size <= 1:
        return 0.0
    entropy = -float(np.sum(probs * np.log(probs)))
    return float(np.clip(entropy / np.log(probs.size), 0.0, 1.0))


def assess_image_quality(image_bgr: np.ndarray) -> dict[str, object]:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blur_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    mean_brightness = float(gray.mean())
    warnings: list[str] = []
    if blur_variance < 35:
        warnings.append("Image may be too blurred for reliable classification.")
    if mean_brightness < 35:
        warnings.append("Image is under-exposed.")
    elif mean_brightness > 225:
        warnings.append("Image is over-exposed.")
    quality = InputQuality(
        acceptable=not warnings,
        blur_variance=round(blur_variance, 2),
        mean_brightness=round(mean_brightness, 2),
        warnings=warnings,
    )
    return asdict(quality)


def selective_decision(
    probabilities: Sequence[float],
    quality: dict[str, object],
    *,
    min_confidence: float = 0.55,
    min_margin: float = 0.15,
    max_entropy: float = 0.65,
) -> dict[str, object]:
    ordered = sorted((float(value) for value in probabilities), reverse=True)
    top1 = ordered[0] if ordered else 0.0
    top2 = ordered[1] if len(ordered) > 1 else 0.0
    margin = top1 - top2
    entropy = normalized_entropy(ordered)
    reasons = list(quality.get("warnings") or [])
    if top1 < min_confidence:
        reasons.append("Top prediction is below the provisional acceptance threshold.")
    if margin < min_margin:
        reasons.append("The two most likely classes are too close to separate reliably.")
    if entropy > max_entropy:
        reasons.append("Class probabilities are too diffuse for an automatic decision.")
    decision = SelectiveDecision(
        status="accepted" if not reasons else "review_required",
        accepted=not reasons,
        reasons=reasons,
        top1_confidence=round(top1, 4),
        top2_margin=round(margin, 4),
        normalized_entropy=round(entropy, 4),
    )
    return asdict(decision)


def severity_from_visible_area(affected_area: float | None) -> tuple[str, bool]:
    """Return provisional visible-symptom band, never diagnosis confidence severity."""
    if affected_area is None:
        return "Not assessed", False
    area = float(np.clip(affected_area, 0, 100))
    if area < 10:
        return "Low", True
    if area < 25:
        return "Moderate", True
    if area < 50:
        return "High", True
    return "Critical", True
