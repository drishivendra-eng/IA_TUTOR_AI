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


def analyze_image_with_openai(
    image_bytes: bytes,
    filename: str,
    mime_type: str,
    api_key: str,
) -> dict[str, Any]:
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }

    payload = {
        'model': 'gpt-4o-mini',
        'input': [
            {
                'role': 'system',
                'content': [
                    {
                        'type': 'input_text',
                        'text': (
                            'You are a technical drawing analysis assistant for an Industrial Arts education application. '
                            'Analyse the uploaded image and return ONLY valid JSON that matches the DrawingProblem schema. '
                            'Do not generate any SVG coordinates.\n'
                            'Important rules:\n'
                            '1. Identify the technical drawing type.\n'
                            '2. Read visible dimensions and units.\n'
                            '3. Identify the projection or elevation type.\n'
                            '4. Identify visible geometric features, surfaces, steps, slopes, circles and arcs.\n'
                            '5. Estimate dimensions only when they are visible or reliably inferable.\n'
                            '6. Never invent a dimension if it is not visible or cannot be reliably inferred.\n'
                            '7. For any uncertain measurement, use value: null and confidence: 0 with source: not_visible.\n'
                            '8. Provide a confidence value between 0 and 1 for important extracted information.\n'
                            '9. Use field names exactly as the schema requires.\n'
                            '10. The response must be a valid JSON object, not Markdown.'
                        )
                    }
                ],
            },
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'input_text',
                        'text': (
                            'Analyse this image for an Industrial Arts technical drawing. '
                            'Return a structured DrawingProblem JSON object with these fields: '
                            'drawing_type, projection_type, units, scale, overall_dimensions, dimensions, views_required, '
                            'geometric_features, surfaces, steps, slopes, circles, arcs, construction_requirements, difficulty, '
                            'confidence, explanation. '
                            'For any measurement that cannot be determined from the image, set value to null, confidence to 0, and note source as not_visible. '
                            'Do not invent dimensions that are not visible or reliably inferable.'
                        )
                    },
                    {
                        'type': 'input_image',
                        'image_url': f'data:{mime_type};base64,{image_base64}',
                    },
                ],
            }
        ],
    }

    response = requests.post(
        'https://api.openai.com/v1/responses',
        headers=headers,
        json=payload,
        timeout=120,
    )

    if response.status_code != 200:
        error_type = None
        error_code = None
        try:
            error_data = response.json().get('error', {})
            error_type = error_data.get('type')
            error_code = error_data.get('code')
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

    return {
        'mode': 'real',
        'message': 'REAL AI ANALYSIS',
        'problem': parsed,
        'requires_confirmation': False,
    }
