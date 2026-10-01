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

The project is configured as one Render web service: FastAPI serves the frontend and `/api/*` from the same origin. This avoids cross-origin browser requests and keeps the API key on the server. `render.yaml` defines the service, Python version, build/start commands, health check, and a dashboard-managed `OPENAI_API_KEY` variable.

### Render Dashboard Setup

1. Push the deployment branch to GitHub if it is not already available there.
2. In Render, choose **New** → **Blueprint**, connect the `IA_TUTOR_AI` GitHub repository, and select the deployment branch.
3. Review the `ia-tutor-ai` web service from `render.yaml`. The configured `starter` plan is intended for an always-on production service; select a different plan only if its availability and sleep behavior suit your use.
4. Create the service. In its **Environment** settings, enter the value for the variable named `OPENAI_API_KEY` using Render's secret environment-variable field. Never put the key in this repository, the Blueprint, a browser setting, or DNS.
5. Deploy and wait for the service health check at `/api/health` to pass. Test the generated Render URL at `/` and `/api/health` before configuring a custom domain.

Render provides HTTPS for its service hostname and provisions HTTPS certificates for verified custom domains. Keep frontend and API on the same service/origin. The app binds to `0.0.0.0` and uses Render's injected `PORT` value.

### Namecheap Custom Domain: rohilaitutor.com

Do not change DNS until the Render service is deployed and healthy.

1. In the Render service dashboard, open **Settings** → **Custom Domains** and add `rohilaitutor.com`. Add `www.rohilaitutor.com` too if you want both hostnames.
2. In Namecheap, open **Domain List** → **Manage** for `rohilaitutor.com` → **Advanced DNS** → **Host Records**.
3. Add the apex record shown by Render. For Render's standard IPv4 apex target, this is an **A Record** with **Host** `@` and **Value** `216.24.57.1`. If Render displays a different target in the domain instructions, use the current dashboard value instead.
4. If using `www`, add a **CNAME Record** with **Host** `www` and **Value** equal to the exact `*.onrender.com` service hostname shown on the Render service page (without `https://` or a path).
5. Remove conflicting Namecheap parking/URL-redirect records or duplicate `@`/`www` records, save the DNS changes, and wait for Render to verify the domain and issue its managed TLS certificate.
6. In Render, choose the preferred canonical hostname and verify both the website and `/api/health` over HTTPS. Because requests use relative paths, the API remains on that same origin.

DNS propagation and certificate issuance can take time. Do not publish credentials in DNS records or commit `.env`; configure secrets only in Render's environment settings.