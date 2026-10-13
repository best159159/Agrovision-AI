import unittest
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from research_metrics import assess_image_quality, normalized_entropy, selective_decision, severity_from_visible_area


class ResearchMetricTests(unittest.TestCase):
    def test_confidence_never_controls_severity(self):
        self.assertEqual(severity_from_visible_area(None), ("Not assessed", False))
        self.assertEqual(severity_from_visible_area(5.86), ("Low", True))
        self.assertEqual(severity_from_visible_area(55), ("Critical", True))

    def test_visible_area_boundary_bands(self):
        self.assertEqual(severity_from_visible_area(9.99)[0], "Low")
        self.assertEqual(severity_from_visible_area(10)[0], "Moderate")
        self.assertEqual(severity_from_visible_area(25)[0], "High")
        self.assertEqual(severity_from_visible_area(50)[0], "Critical")

    def test_entropy_bounds(self):
        self.assertAlmostEqual(normalized_entropy([1, 0, 0, 0, 0]), 0.0, places=5)
        self.assertAlmostEqual(normalized_entropy([0.2] * 5), 1.0, places=5)

    def test_selective_prediction_accepts_clear_case(self):
        result = selective_decision([0.9, 0.04, 0.03, 0.02, 0.01], {"warnings": []})
        self.assertTrue(result["accepted"])

    def test_selective_prediction_rejects_ambiguous_case(self):
        result = selective_decision([0.36, 0.34, 0.1, 0.1, 0.1], {"warnings": []})
        self.assertFalse(result["accepted"])
        self.assertGreaterEqual(len(result["reasons"]), 2)

    def test_quality_gate_rejects_blank_frame(self):
        quality = assess_image_quality(np.zeros((224, 224, 3), dtype=np.uint8))
        self.assertFalse(quality["acceptable"])
        self.assertGreaterEqual(len(quality["warnings"]), 2)

    def test_quality_warning_forces_referral(self):
        result = selective_decision(
            [0.95, 0.02, 0.01, 0.01, 0.01],
            {"warnings": ["Image is under-exposed."]},
        )
        self.assertFalse(result["accepted"])


if __name__ == "__main__":
    unittest.main()
