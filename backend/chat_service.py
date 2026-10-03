import os
from typing import Any

import requests


class TutorProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _extract_output_text(payload: dict[str, Any]) -> str:
    text = payload.get('output_text')
    if isinstance(text, str) and text.strip():
        return text.strip()
    parts: list[str] = []
    for item in payload.get('output', []) or []:
        for content in item.get('content', []) or []:
            value = content.get('text')
            if isinstance(value, str) and value.strip():
                parts.append(value.strip())
    return '\n'.join(parts).strip()


def ask_tutor(message: str, year: str, subject: str) -> dict[str, Any]:
    message = message.strip()
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return {
            'answer': (
                f'I’m ready to help with Year {year} {subject}. For a specific workbook worksheet, '
                'please upload the worksheet/photo in the Solution Workspace so I can read the exact questions. '
                'I will not invent missing questions, dimensions or answers.'
            ),
            'mode': 'no_api_key',
            'source_reference': f'Year {year} {subject} source material supplied to IA-Tutor',
            'needs_human': False,
        }

    model = os.getenv('OPENAI_TUTOR_MODEL', 'gpt-6-luna')
    system = f'''You are IA-Tutor, a Fiji Industrial Arts learning assistant.
The student is studying Year {year} {subject}.

Rules:
- Answer the student's actual question directly and at the student's level.
- For textbook/workbook questions, preserve the terminology and method of the supplied source material.
- Do not pretend you have read a textbook or worksheet unless its contents are actually provided in the request or connected source context.
- Never invent missing dimensions, question wording, page numbers, diagrams, or answers.
- If the student asks for a specific worksheet that is not available to you, ask them to upload that worksheet in the Solution Workspace.
- For Technical Drawing, explain construction in ordered steps and include CAD construction instructions where useful.
- If the question is ambiguous or unreadable, state exactly what is missing.
- Keep answers clear, practical and suitable for a secondary-school Industrial Arts student.
- If a reliable answer cannot be established, say so and route the student to human support rather than fabricating an answer.
'''
    payload = {
        'model': model,
        'input': [
            {'role': 'developer', 'content': system},
            {'role': 'user', 'content': message},
        ],
        'max_output_tokens': 1400,
    }
    try:
        response = requests.post(
            'https://api.openai.com/v1/responses',
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json=payload,
            timeout=60,
        )
    except requests.RequestException as exc:
        raise TutorProviderError('The AI provider could not be reached.') from exc

    if response.status_code >= 400:
        try:
            detail = response.json().get('error', {}).get('message', 'AI provider request failed.')
        except ValueError:
            detail = 'AI provider request failed.'
        raise TutorProviderError(detail, response.status_code)

    try:
        data = response.json()
    except ValueError as exc:
        raise TutorProviderError('AI provider returned invalid JSON.') from exc

    answer = _extract_output_text(data)
    if not answer:
        raise TutorProviderError('AI provider returned no tutor answer.')
    return {
        'answer': answer,
        'mode': 'live_ai',
        'source_reference': f'Year {year} {subject} source-aware tutor',
        'needs_human': False,
    }
