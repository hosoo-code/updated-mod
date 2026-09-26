# Arhat identity detector

Private FastAPI service for server-side image quality and detection checks.

It does not perform face recognition, embeddings, or identity matching. A `pass` result is only an automated quality signal; the Arhat admin remains the final reviewer.

## Run

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
IDENTITY_DETECTOR_TOKEN=change-me uvicorn app.main:app --reload --port 8080
```

The Next.js server calls `POST /v1/analyze` with a multipart image and the `document_type` query parameter. Keep this service private and configure `PYTHON_VERIFICATION_URL`, `PYTHON_VERIFICATION_TOKEN`, and `PYTHON_VERIFICATION_ENABLED=true` only on the server.
