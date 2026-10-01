# IA Tutor AI

IA Tutor AI is a technical-drawing tutor for Industrial Arts students. It combines image-based drawing analysis with deterministic orthographic geometry and SVG output.

## Features

- JPG, JPEG, and PNG question upload with image preview
- REAL Vision AI analysis through the FastAPI backend, plus a demo fallback
- Structured DrawingProblem validation and an explicit confirmation step
- Manual width, height, and depth solver
- Front, Top, and Right-Side orthographic views
- Feature-aware step/slope geometry and construction instructions
- SVG preview and download

## Architecture

The FastAPI application serves both the static frontend and API from one origin. The browser calls relative API paths, so local and Codespaces use the same connection model:

- `GET /` serves `index.html`
- `/styles.css` and `/js/*` serve frontend assets
- `GET /api/health` checks the backend
- `POST /api/analyze-drawing` accepts an image multipart field named `image`

The API key is read by the backend only. The frontend never receives it.

## Requirements

- Python venv/pip support (on Debian/Ubuntu, install the matching `python3.12-venv` package if `venv` cannot bootstrap pip)
- An OpenAI API key configured as the environment variable `OPENAI_API_KEY` for REAL Vision AI; without it, the backend returns its validated demo response

## Local Installation

From the repository root with the backend virtual environment activated:

```bash
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
```

Create a local `.env` from `.env.example` and configure `OPENAI_API_KEY` there or through the process environment. Never commit `.env`; it is ignored by Git. Do not put credentials in frontend files.

## Run Locally

From the repository root with the virtual environment active:

```bash
PYTHONPATH=. uvicorn backend.server:app --host 0.0.0.0 --port 8000
```

Open `http://127.0.0.1:8000/`. In GitHub Codespaces, open forwarded port 8000. The same server serves the page and `/api/*` endpoints. Avoid starting a separate static server on the same port.

## Testing

From the repository root:

```bash
node --check js/main.js
node --check js/visionAIService.js
node --check js/geometry.js
node --check js/render.js
node js/geometry.test.mjs
node js/visionAIService.test.mjs
python3 -m py_compile backend/server.py backend/normalization.py backend/schemas.py
python -m unittest backend/test_server.py
```

## Deployment

Deploy the FastAPI application as the single web service, bind it to `0.0.0.0`, and use the port required by the hosting platform (port 8000 in this project’s Codespaces setup). Install dependencies from `backend/requirements.txt`, configure `OPENAI_API_KEY` using the host’s secret/environment-variable settings, and enable HTTPS. Do not upload `.env` as a public artifact or commit it.

For production, use a persistent application host with health checks, request logging that excludes credentials and image contents, and appropriate upload-size limits. The current backend accepts PNG/JPEG MIME types and returns structured JSON errors.

## Custom Domain: rohilaitutor.com

Use a production host that supports custom domains; a Codespaces forwarded URL is for development and is not a production domain target. Add `rohilaitutor.com` (and optionally `www.rohilaitutor.com`) in the hosting provider’s domain settings, copy the provider’s required DNS records into the domain registrar’s DNS panel, wait for DNS propagation, and enable the provider-managed TLS certificate. Keep the frontend and API behind the same HTTPS origin so relative `/api/*` requests continue to work. Configure secrets on the hosting provider, not in DNS or frontend code.