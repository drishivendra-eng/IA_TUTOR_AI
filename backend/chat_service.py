import os
from typing import Any

import requests

try:
    from backend.source_library import search_year9_sources
except ImportError:
    from source_library import search_year9_sources


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


def ask_tutor(message: str, year: str, subject: str, source_priority: str | None = None) -> dict[str, Any]:
    message = message.strip()
    year_text = str(year).strip()
    subject_text = str(subject).strip()
    is_year9_basic_technology = year_text.lower().replace('year ', '').strip() in {'9', '09'} and any(topic in subject_text.lower() for topic in ('basic technology', 'technical drawing', 'basic graphics technology', 'industrial arts'))

    source_result: dict[str, Any] = {
        'matches': [],
        'source_status': {},
        'source_found': False,
        'searched_sources': [],
    }
    if is_year9_basic_technology:
        source_result = search_year9_sources(message, source_priority)

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return {
            'answer': (
                f'I’m ready to help with Year {year} {subject}, but live AI is not configured on this deployment. '
                'Please check the backend OPENAI_API_KEY setting. For a specific worksheet, upload the exact page '
                'in the Solution Workspace so the system can analyse the question rather than guessing.'
            ),
            'mode': 'no_api_key',
            'source_reference': source_result.get('matches', []),
            'sources_searched': source_result.get('searched_sources', []),
            'source_status': source_result.get('source_status', {}),
            'source_found': source_result.get('source_found', False),
            'needs_human': True,
        }

    source_context = ''
    source_matches = source_result.get('matches', [])
    if source_matches:
        source_context = '\n\nVERIFIED SOURCE EXCERPTS (retrieved from the configured Year 9 PDFs):\n' + '\n\n'.join(
            f"[Source: {item['title']}, printed PDF page {item['page']}]\n{item['excerpt']}"
            for item in source_matches
        )
    elif is_year9_basic_technology:
        source_context = (
            '\n\nSOURCE RETRIEVAL STATUS: No relevant searchable text was extracted from the configured Year 9 '
            'textbook/workbook for this query. Do not claim that an answer comes from those documents. '
            'For an exact worksheet or Sheet 3 question, ask the student to upload the actual page/image.'
        )

    system = f'''You are IA-Tutor, a Fiji Industrial Arts learning assistant.
The student is studying Year {year} {subject}.

Rules:
- Answer the student's actual question directly and at the student's level.
- For textbook/workbook questions, use the verified source excerpts supplied below first and preserve the source terminology and method.
- Clearly identify the source title and PDF page only when an excerpt is provided. Do not invent page numbers or citations.
- The configured Year 9 source files are the Fiji Year 9 Basic Technology Textbook and Workbook. Only claim to have used a source when its excerpt is actually included.
- If a student asks for "Sheet 3" or a particular worksheet but the exact question/diagram is not in the retrieved source excerpts, ask for a photo/upload of the exact sheet. Do not guess its exercises.
- Never invent missing dimensions, question wording, diagrams, page numbers, or answers.
- For Technical Drawing, explain construction in ordered steps and include CAD construction instructions where useful.
- If the question is ambiguous or unreadable, state exactly what is missing.
- Keep answers clear, practical and suitable for a secondary-school Industrial Arts student.
- If a reliable answer cannot be established, say so and route the student to human support rather than fabricating an answer.
{source_context}
'''
    payload = {
        'model': os.getenv('OPENAI_TUTOR_MODEL', 'gpt-4o-mini'),
        'input': [
            {'role': 'developer', 'content': system},
            {'role': 'user', 'content': message},
        ],
        'max_output_tokens': 1800,
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
        'mode': 'live_ai_source_aware' if source_matches else 'live_ai',
        'source_reference': [
            {'title': item['title'], 'page': item['page'], 'url': item['url']}
            for item in source_matches
        ],
        'sources_searched': source_result.get('searched_sources', []),
        'source_status': source_result.get('source_status', {}),
        'source_found': source_result.get('source_found', False),
        'needs_human': not bool(source_matches) and is_year9_basic_technology,
    }
