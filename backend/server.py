import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import ValidationError

try:
    from backend.vision_service import OpenAIProviderError, analyze_image_with_openai
    from backend.schemas import DrawingProblemResponse
    from backend.normalization import normalize_response_payload
except ImportError:  # pragma: no cover - fallback for direct script execution
    from vision_service import OpenAIProviderError, analyze_image_with_openai
    from schemas import DrawingProblemResponse
    from normalization import normalize_response_payload

PROJECT_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(PROJECT_ROOT / '.env')

app = FastAPI(title='IA-Tutor AI Backend')

# Same-origin architecture: the frontend and API are served from one origin, so
# cross-origin requests from the browser are no longer required for normal use.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r'^https://.*-8000\.app\.github\.dev$|^http://(localhost|127\.0\.0\.1)(:\d+)?$',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware('http')
async def no_cache_frontend_assets(request, call_next):
    response = await call_next(request)
    if not request.url.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-cache, must-revalidate'
    return response

SUPPORTED_IMAGE_TYPES = {'image/jpeg', 'image/jpg', 'image/png'}


def classify_provider_error(error: OpenAIProviderError) -> tuple[int, str]:
    error_type = error.error_type.lower()
    error_code = error.error_code.lower()

    if error.status_code in (401, 403) or 'auth' in error_type or 'api_key' in error_code:
        return 502, 'AUTHENTICATION_ERROR'
    if error.status_code == 429 and ('quota' in error_type or 'credit' in error_code):
        return 429, 'BILLING_ERROR'
    if error.status_code == 429:
        return 429, 'RATE_LIMIT_ERROR'
    if 'model' in error_type or 'model' in error_code:
        return 502, 'MODEL_ACCESS_ERROR'
    if 'image' in error_type or 'image' in error_code:
        return 400, 'IMAGE_INPUT_ERROR'
    if 400 <= error.status_code < 500:
        return 400, 'INVALID_REQUEST_ERROR'
    return 502, 'PROVIDER_ERROR'


def build_demo_response() -> DrawingProblemResponse:
    return DrawingProblemResponse.model_validate(normalize_response_payload({
        'mode': 'demo',
        'message': 'Vision AI is not configured. Using Demo Analysis.',
        'problem': {
            'drawing_type': 'orthographic_projection',
            'projection_type': 'orthographic',
            'units': 'mm',
            'scale': '1:1',
            'overall_dimensions': {
                'width': {'value': 120, 'unit': 'mm', 'confidence': 0.95},
                'height': {'value': 80, 'unit': 'mm', 'confidence': 0.95},
                'depth': {'value': 60, 'unit': 'mm', 'confidence': 0.95},
            },
            'dimensions': {'width': 120, 'height': 80, 'depth': 60},
            'views_required': ['front', 'top', 'right'],
            'geometric_features': ['rectangular prism', 'orthographic projection'],
            'surfaces': ['front face', 'top face', 'right face'],
            'steps': [
                'Draw the front elevation using width and height.',
                'Extend the width into the top view and the depth into the side view.',
                'Add dimension lines and final labels.'
            ],
            'slopes': [],
            'circles': [],
            'arcs': [],
            'construction_requirements': [
                'Maintain alignment between all three views.',
                'Use standard line conventions for outlines and projection lines.',
                'Label the front, top and right-side views clearly.'
            ],
            'difficulty': 'Beginner',
            'confidence': 0.95,
            'explanation': 'OpenAI key is not configured, so the backend returned the demo problem structure for testing.',
        },
        'requires_confirmation': False,
    }))


@app.get('/api/health')
async def health() -> dict[str, Any]:
    return {'status': 'ok'}


@app.post('/api/analyze-drawing', response_model=DrawingProblemResponse)
async def analyze_drawing(image: UploadFile = File(...)) -> DrawingProblemResponse:
    content_type = (image.content_type or '').lower()
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail='Unsupported image type. Please upload a JPG, JPEG, or PNG image.')

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        try:
            return build_demo_response()
        except ValidationError as exc:
            raise HTTPException(status_code=500, detail=f'Demo response validation failed: {exc}') from exc

    image_bytes = await image.read()

    try:
        result = analyze_image_with_openai(
            image_bytes,
            image.filename or 'drawing.png',
            content_type,
            api_key,
        )
        return DrawingProblemResponse.model_validate(normalize_response_payload(result))
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f'Vision response validation failed: {exc}') from exc
    except OpenAIProviderError as exc:
        status_code, category = classify_provider_error(exc)
        raise HTTPException(status_code=status_code, detail=category) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail='PROVIDER_ERROR') from exc


# Static frontend assets, mounted after the /api routes so they never shadow the API.
app.mount('/js', StaticFiles(directory=PROJECT_ROOT / 'js'), name='js')


@app.get('/styles.css')
async def styles() -> FileResponse:
    return FileResponse(PROJECT_ROOT / 'styles.css')


@app.get('/')
async def index() -> FileResponse:
    return FileResponse(PROJECT_ROOT / 'index.html')
