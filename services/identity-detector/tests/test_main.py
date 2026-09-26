import os

os.environ.setdefault("IDENTITY_DETECTOR_TOKEN", "test-token")

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def image_bytes(brightness: int = 140) -> bytes:
    image = np.full((240, 380, 3), brightness, dtype=np.uint8)
    cv2.rectangle(image, (20, 20), (360, 220), (40, 40, 40), 4)
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    return encoded.tobytes()


def test_rejects_invalid_image() -> None:
    response = client.post("/v1/analyze", files={"file": ("bad.jpg", b"not-an-image", "image/jpeg")})
    assert response.status_code == 415


def test_returns_review_for_dark_document() -> None:
    response = client.post(
        "/v1/analyze?document_type=id-card",
        files={"file": ("id.jpg", image_bytes(10), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["documentType"] == "id-card"
    assert body["decision"] == "review"
    assert body["quality"]["readable"] is False


def test_face_analysis_never_passes_still_image() -> None:
    response = client.post(
        "/v1/analyze?document_type=face",
        files={"file": ("face.jpg", image_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200
    assert response.json()["decision"] == "review"


def test_birth_certificate_requires_plausible_quad() -> None:
    response = client.post(
        "/v1/analyze?document_type=birth-certificate",
        files={"file": ("certificate.jpg", image_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200
    assert response.json()["decision"] == "review"


def test_face_analysis_has_no_identity_matching() -> None:
    response = client.post(
        "/v1/analyze?document_type=face",
        files={"file": ("face.jpg", image_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body["face"]) >= {"faceDetected", "singleFace", "confidence"}
    assert "embedding" not in body["face"]
