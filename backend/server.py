import os
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError

try:
    from backend.vision_service import OpenAIProviderError, analyze_image_with_openai
    from backend.schemas import DrawingProblemResponse
    from backend.normalization import normalize_response_payload
    from backend.research_service import research
    from backend.resource_service import resolve_resource
except ImportError:
    from vision_service import OpenAIProviderError, analyze_image_with_openai
    from schemas import DrawingProblemResponse
    from normalization import normalize_response_payload
    from research_service import research
    from resource_service import resolve_resource

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / '.env')

app = FastAPI(title='IA-Tutor AI Backend')
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
MAX_IMAGE_BYTES = 10 * 1024 * 1024
RESOURCE_HOST = 'learninghub.telecom.com.fj'


def validate_image_bytes(content_type: str, image_bytes: bytes) -> None:
    if not image_bytes:
        raise HTTPException(status_code=400, detail='The uploaded image is empty.')
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail='Image exceeds the 10 MiB upload limit.')
    is_png = image_bytes.startswith(b'\x89PNG\r\n\x1a\n')
    is_jpeg = image_bytes.startswith(b'\xff\xd8\xff')
    if (content_type == 'image/png' and not is_png) or (content_type in {'image/jpeg', 'image/jpg'} and not is_jpeg):
        raise HTTPException(status_code=400, detail='Image content does not match its declared JPG, JPEG, or PNG type.')


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
        'mode': 'demo', 'message': 'Vision AI is not configured. Using Demo Analysis.',
        'problem': {
            'drawing_type': 'orthographic_projection', 'projection_type': 'orthographic', 'units': 'mm', 'scale': '1:1',
            'overall_dimensions': {'width': {'value': 60, 'unit': 'mm', 'confidence': 0.95}, 'height': {'value': 40, 'unit': 'mm', 'confidence': 0.95}, 'depth': {'value': 60, 'unit': 'mm', 'confidence': 0.95}},
            'dimensions': {'width': 60, 'height': 40, 'depth': 60}, 'views_required': ['front', 'top', 'right'],
            'geometric_features': ['rectangular prism', 'orthographic projection'], 'surfaces': ['front face', 'top face', 'right face'],
            'steps': ['Draw the front elevation using width and height.', 'Extend the width into the top view and the depth into the side view.', 'Add dimension lines and final labels.'],
            'slopes': [], 'circles': [], 'arcs': [], 'construction_requirements': ['Maintain alignment between all three views.', 'Use standard line conventions for outlines and projection lines.', 'Label the front, top and right-side views clearly.'],
            'difficulty': 'Beginner', 'confidence': {'overall': 0.95, 'explanation': 'The dimensions and projection are clearly visible in the demo drawing.'},
            'explanation': 'OpenAI key is not configured, so the backend returned the demo problem structure for testing.'
        }, 'requires_confirmation': False,
    }))


class ResearchRequest(BaseModel):
    question: str
    year: str = 'Year 9'
    subject: str = 'Industrial Arts'


@app.get('/api/health')
async def health() -> dict[str, Any]:
    return {'status': 'ok'}


@app.get('/api/resource-link')
async def resource_link(filename: str) -> dict[str, str]:
    try:
        return resolve_resource(filename)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail='RESOURCE_SOURCE_UNAVAILABLE') from exc


@app.get('/api/resource-file')
async def resource_file(filename: str = Query(..., min_length=3, max_length=300), download: bool = False):
    """View or download an exact public PDF through IA-Tutor without committing a copy to GitHub."""
    try:
        resource = resolve_resource(filename)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail='RESOURCE_SOURCE_UNAVAILABLE') from exc

    source_url = resource['url']
    if not source_url.startswith(f'https://{RESOURCE_HOST}/'):
        raise HTTPException(status_code=400, detail='RESOURCE_SOURCE_NOT_ALLOWED')

    try:
        upstream = requests.get(
            source_url,
            timeout=30,
            stream=True,
            headers={'User-Agent': 'IA-Tutor-Resource-Viewer/1.0'},
        )
        upstream.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail='RESOURCE_DOWNLOAD_ERROR') from exc

    content_type = upstream.headers.get('content-type', 'application/pdf').split(';', 1)[0].strip().lower()
    if content_type not in {'application/pdf', 'application/octet-stream'}:
        upstream.close()
        raise HTTPException(status_code=415, detail='RESOURCE_IS_NOT_A_PDF')

    filename_only = Path(filename).name.replace('"', '')
    disposition = f'attachment; filename="{filename_only}"' if download else f'inline; filename="{filename_only}"'

    def stream():
        try:
            for chunk in upstream.iter_content(chunk_size=1024 * 256):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return StreamingResponse(
        stream(),
        media_type='application/pdf',
        headers={
            'Content-Disposition': disposition,
            'Cache-Control': 'private, max-age=3600',
            'X-IA-Tutor-Source': resource['source'],
        },
    )


@app.post('/api/research')
async def research_endpoint(request: ResearchRequest) -> dict[str, Any]:
    question = request.question.strip()
    if len(question) < 3:
        raise HTTPException(status_code=400, detail='Please enter a research question.')
    if len(question) > 1000:
        raise HTTPException(status_code=400, detail='Research question is too long.')
    try:
        return research(question, request.year, request.subject)
    except Exception as exc:
        raise HTTPException(status_code=502, detail='RESEARCH_SEARCH_ERROR') from exc


@app.post('/api/analyze-drawing', response_model=DrawingProblemResponse)
async def analyze_drawing(image: UploadFile = File(...)) -> DrawingProblemResponse:
    content_type = (image.content_type or '').lower()
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail='Unsupported image type. Please upload a JPG, JPEG, or PNG image.')
    image_bytes = await image.read(MAX_IMAGE_BYTES + 1)
    validate_image_bytes(content_type, image_bytes)
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        try:
            return build_demo_response()
        except ValidationError as exc:
            raise HTTPException(status_code=500, detail=f'Demo response validation failed: {exc}') from exc
    try:
        result = analyze_image_with_openai(image_bytes, image.filename or 'drawing.png', content_type, api_key)
        return DrawingProblemResponse.model_validate(normalize_response_payload(result))
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f'Vision response validation failed: {exc}') from exc
    except OpenAIProviderError as exc:
        status_code, category = classify_provider_error(exc)
        raise HTTPException(status_code=status_code, detail=category) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail='PROVIDER_ERROR') from exc


app.mount('/js', StaticFiles(directory=PROJECT_ROOT / 'js'), name='js')

@app.get('/styles.css')
async def styles() -> FileResponse:
    return FileResponse(PROJECT_ROOT / 'styles.css')

@app.get('/library.html')
async def library() -> FileResponse:
    return FileResponse(PROJECT_ROOT / 'library.html')

@app.get('/research.html')
async def research_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / 'research.html')

@app.get('/resource.html')
async def resource_page() -> FileResponse:
    return FileResponse(PROJECT_ROOT / 'resource.html')

@app.get('/')
async def index() -> FileResponse:
    return FileResponse(PROJECT_ROOT / 'index.html')
