import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import build_summary


class SummaryContractTests(unittest.TestCase):
    def test_unknown_area_stays_unknown(self):
        frames = [{
            "timestamp": 0,
            "predictions": [{
                "disease": "Cassava Mosaic Disease (CMD)",
                "diagnosisType": "disease",
                "confidence": 0.51,
                "affectedArea": None,
                "riskScore": None,
                "decisionAccepted": False,
            }],
        }]
        summary = build_summary(frames)
        self.assertIsNone(summary["affectedAreaEstimate"])
        self.assertIsNone(summary["riskScore"])
        self.assertEqual(summary["riskLevel"], "Not assessed")


if __name__ == "__main__":
    unittest.main()
