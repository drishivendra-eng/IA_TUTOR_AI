import base64
import json
from typing import Any

import requests


class OpenAIProviderError(RuntimeError):
    def __init__(self, status_code: int, error_type: str | None = None, error_code: str | None = None):
        self.status_code = status_code
        self.error_type = error_type or ''
        self.error_code = error_code or ''
        super().__init__('OpenAI provider request failed.')


def analyze_image_with_openai(image_bytes: bytes, filename: str, mime_type: str, api_key: str) -> dict[str, Any]:
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    geometry_rules = (
        'Also return cad_geometry: a list of drawable CAD primitives using normalized coordinates from 0 to 1000. '
        'Use type line with x1,y1,x2,y2; circle with cx,cy,r; polyline with points:[[x,y],...]; '
        'dimension with x1,y1,x2,y2,label; and construction lines with construction=true. '
        'Reconstruct the actual visible solution shape, not merely a rectangular bounding box. '
        'Include centerlines, projection/construction lines, outlines, curves approximated by polylines, and dimensions when visible. '
        'Keep geometry proportional to the photographed drawing. If the exact geometry cannot be determined, return an empty cad_geometry list rather than inventing it.'
    )
    system_text = (
        'You are a technical drawing analysis assistant for an Industrial Arts education application. '
        'Analyse the uploaded image and return ONLY valid JSON matching the DrawingProblem schema. '
        'Do not limit the answer to width, height and depth. This application supports geometric construction, orthographic, isometric, oblique, perspective, development, dimensioning, symbols, angles, circles, arcs and arbitrary technical-drawing shapes. '
        'Never invent a missing dimension. ' + geometry_rules
    )
    user_text = (
        'Analyse this Industrial Arts technical drawing/worksheet. Identify the question, source-visible requirements, geometry and construction method. '
        'Return drawing_type, projection_type, units, scale, overall_dimensions, dimensions, views_required, geometric_features, surfaces, steps, slopes, circles, arcs, construction_requirements, cad_geometry, difficulty, confidence and explanation. '
        'For every unreadable measurement use null. ' + geometry_rules
    )
    payload = {
        'model': 'gpt-4o-mini',
        'input': [
            {'role': 'system', 'content': [{'type': 'input_text', 'text': system_text}]},
            {'role': 'user', 'content': [
                {'type': 'input_text', 'text': user_text},
                {'type': 'input_image', 'image_url': f'data:{mime_type};base64,{image_base64}'}
            ]}
        ]
    }
    response = requests.post('https://api.openai.com/v1/responses', headers=headers, json=payload, timeout=120)
    if response.status_code != 200:
        error_type = error_code = None
        try:
            error_data = response.json().get('error', {})
            error_type = error_data.get('type'); error_code = error_data.get('code')
        except (ValueError, AttributeError):
            pass
        raise OpenAIProviderError(response.status_code, error_type, error_code)
    response_json = response.json()
    text_output = response_json.get('output', [])
    if not text_output:
        raise RuntimeError('OpenAI API returned no output content.')
    content_text = ''
    for item in text_output:
        if item.get('type') == 'message':
            content_text = ''.join(part.get('text', '') for part in item.get('content', []) if part.get('type') == 'output_text')
            if content_text:
                break
    if not content_text:
        raise RuntimeError('OpenAI API returned an empty message payload.')
    parsed = json.loads(content_text)
    return {'mode': 'real', 'message': 'REAL AI ANALYSIS + CAD GEOMETRY', 'problem': parsed, 'requires_confirmation': False}
