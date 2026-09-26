from __future__ import annotations

import os
from typing import Literal

import cv2
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

MAX_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
MAX_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", str(20_000_000)))
SERVICE_TOKEN = os.getenv("IDENTITY_DETECTOR_TOKEN", "")

app = FastAPI(title="Arhat Identity Detector", version="1.0.0")


class QualityResult(BaseModel):
    readable: bool
    brightness: float = Field(ge=0, le=255)
    blur: float = Field(ge=0)
    documentDetected: bool
    reason: str | None = None


class FaceResult(BaseModel):
    faceDetected: bool
    singleFace: bool
    confidence: float = Field(ge=0, le=1)
    livenessSupported: bool = False
    livenessPassed: bool = False
    reason: str | None = None


class AnalysisResponse(BaseModel):
    schemaVersion: Literal["1"] = "1"
    documentType: Literal["id-card", "birth-certificate", "face"]
    quality: QualityResult
    face: FaceResult
    decision: Literal["review", "pass", "fail"]
    modelVersion: str = "opencv-baseline-1"


def authorize(token: str | None) -> None:
    # Detector нь нүүр/иргэний үнэмлэхийн зурагтай тул token тохируулаагүй
    # production service-г санамсаргүй public болгох ёсгүй.
    if not SERVICE_TOKEN or token != f"Bearer {SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def decode_image(data: bytes) -> np.ndarray:
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image is empty or too large")
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=415, detail="Unsupported image")
    height, width = image.shape[:2]
    if height * width > MAX_PIXELS:
        raise HTTPException(status_code=413, detail="Image dimensions are too large")
    return image


def _quad_is_plausible(polygon: np.ndarray, expected_ratio: float, tolerance: float) -> bool:
    points = polygon.reshape(4, 2).astype(np.float32)
    center = points.mean(axis=0)
    ordered = sorted(points, key=lambda p: float(np.arctan2(p[1] - center[1], p[0] - center[0])))
    ordered_points = np.array(ordered, dtype=np.float32)
    sides = np.roll(ordered_points, -1, axis=0) - ordered_points
    lengths = np.linalg.norm(sides, axis=1)
    if float(lengths.min()) < 1:
        return False
    opposite_similarity = min(lengths[0], lengths[2]) / max(lengths[0], lengths[2])
    opposite_similarity = min(opposite_similarity, min(lengths[1], lengths[3]) / max(lengths[1], lengths[3]))
    if opposite_similarity < 0.45:
        return False
    ratio = max(float(lengths)) / max(1.0, min(float(lengths)))
    normalized_expected = max(expected_ratio, 1.0 / expected_ratio)
    return abs(ratio - normalized_expected) <= tolerance


def quality(image: np.ndarray, document_type: str) -> QualityResult:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    readable = 35 <= brightness <= 235 and blur >= 35
    document_detected = document_type == "face"
    if document_type != "face":
        edges = cv2.Canny(gray, 60, 160)
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        height, width = gray.shape[:2]
        image_area = float(width * height)
        # Төрсний гэрчилгээний хэлбэр өөр байж болох ч хэт нарийн/өргөн
        # object-ийг баримт гэж зөвшөөрөхгүй.
        expected_ratio = 1.585 if document_type == "id-card" else 1.30
        for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:30]:
            area = cv2.contourArea(contour)
            if area < image_area * 0.12:
                continue
            perimeter = cv2.arcLength(contour, True)
            polygon = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
            if len(polygon) != 4 or not cv2.isContourConvex(polygon):
                continue
            x, y, w, h = cv2.boundingRect(polygon)
            ratio = max(w, h) / max(1, min(w, h))
            center_x = (x + w / 2) / width
            center_y = (y + h / 2) / height
            if not (0.2 <= center_x <= 0.8 and 0.2 <= center_y <= 0.8):
                continue
            contour_ratio = expected_ratio if document_type == "id-card" else max(1.0, ratio)
            tolerance = 0.42 if document_type == "id-card" else 0.8
            if not _quad_is_plausible(polygon, contour_ratio, tolerance):
                continue
            document_detected = True
            break
    reason = None
    if not readable:
        reason = "Image is too dark, bright, or blurry"
    elif not document_detected:
        reason = "Document boundary was not detected"
    return QualityResult(
        readable=readable,
        brightness=brightness,
        blur=blur,
        documentDetected=document_detected,
        reason=reason,
    )


def detect_face(image: np.ndarray) -> FaceResult:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
    count = len(faces)
    detected = count > 0
    single = count == 1
    return FaceResult(
        faceDetected=detected,
        singleFace=single,
        confidence=0.65 if single else 0.0,
        reason=None if single else ("No face detected" if not detected else "Multiple faces detected"),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/analyze", response_model=AnalysisResponse)
async def analyze(
    document_type: Literal["id-card", "birth-certificate", "face"] = "id-card",
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> AnalysisResponse:
    authorize(authorization)
    data = await file.read(MAX_BYTES + 1)
    image = decode_image(data)
    quality_result = quality(image, document_type)
    face_result = detect_face(image) if document_type == "face" else FaceResult(
        faceDetected=False, singleFace=False, confidence=0.0, reason="Face analysis not requested"
    )
    # Still image нь liveness нотолж чадахгүй. Face үр дүн хэзээ ч pass биш,
    # харин admin review-д орох чанарын дохио байна.
    # Automated analysis is assistive only. Human review remains mandatory for
    # every identity document and every face capture.
    decision = "review"
    return AnalysisResponse(
        documentType=document_type,
        quality=quality_result,
        face=face_result,
        decision=decision,
    )
