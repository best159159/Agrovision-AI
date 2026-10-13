import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import build_assistant_evidence, extract_openai_output_text


class EvidenceAssistantTests(unittest.TestCase):
    def test_evidence_is_allow_listed_and_excludes_images(self):
        evidence = build_assistant_evidence({
            "id": "scan-1",
            "crop": "Cassava",
            "previewImage": "data:image/jpeg;base64,secret",
            "predictions": [{
                "disease": "CMD",
                "confidence": 0.72,
                "decisionStatus": "review_required",
                "description": "untrusted provider prose",
                "imageData": "data:image/jpeg;base64,secret",
            }],
            "summary": {"diseasesFound": ["CMD"]},
        })

        rendered = str(evidence)
        self.assertNotIn("base64", rendered)
        self.assertNotIn("untrusted provider prose", rendered)
        self.assertEqual(evidence["predictions"][0]["label"], "CMD")
        self.assertEqual(evidence["predictions"][0]["decisionStatus"], "review_required")

    def test_extracts_text_from_responses_api_output(self):
        payload = {
            "output": [
                {"type": "reasoning", "content": []},
                {"type": "message", "content": [{"type": "output_text", "text": "Grounded answer."}]},
            ]
        }
        self.assertEqual(extract_openai_output_text(payload), "Grounded answer.")

    def test_missing_output_returns_none(self):
        self.assertIsNone(extract_openai_output_text({"output": []}))


if __name__ == "__main__":
    unittest.main()
