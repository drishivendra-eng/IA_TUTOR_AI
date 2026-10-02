import html
import os
import re
from typing import Any
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import requests


class ResearchProviderError(RuntimeError):
    pass


def _clean(text: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(text or '')).strip()


def web_search(query: str, limit: int = 8) -> list[dict[str, str]]:
    url = f'https://www.bing.com/search?format=rss&q={quote_plus(query)}'
    response = requests.get(url, headers={'User-Agent': 'IA-Tutor/1.0'}, timeout=15)
    response.raise_for_status()
    root = ET.fromstring(response.text)
    results: list[dict[str, str]] = []
    for item in root.findall('./channel/item')[:limit]:
        title = _clean(item.findtext('title', ''))
        link = _clean(item.findtext('link', ''))
        description = _clean(item.findtext('description', ''))
        if title and link:
            results.append({'title': title, 'url': link, 'snippet': description})
    return results


def _openai_research(question: str, year: str, subject: str, results: list[dict[str, str]], api_key: str) -> str:
    source_text = '\n'.join(f"SOURCE {i}: {r['title']} | {r['url']} | {r['snippet']}" for i, r in enumerate(results, 1))
    prompt = f"""You are IA-Tutor AI, an Industrial Arts research assistant for Fiji secondary students.
Year: {year}
Subject: {subject}
Research question: {question}

Use ONLY the search results supplied below as evidence. Do not invent curriculum facts, statistics, quotations, page numbers or claims that are not supported. Clearly say when the search results are insufficient. Prefer official Fiji Ministry of Education sources when present. Give a concise research brief with:
1. Answer / overview
2. Key points
3. Fiji curriculum/source context (only if supported)
4. Materials, tools or processes (as relevant)
5. Safety/OHS (as relevant)
6. What to investigate next
7. Sources

Cite sources inline as [1], [2], etc., and list matching URLs at the end.

SEARCH RESULTS:
{source_text}
"""
    payload = {
        'model': 'gpt-4o-mini',
        'input': [
            {'role': 'system', 'content': [{'type': 'input_text', 'text': 'Return plain text only. Do not pretend to have accessed sources beyond the supplied search results.'}]},
            {'role': 'user', 'content': [{'type': 'input_text', 'text': prompt}]},
        ],
    }
    response = requests.post('https://api.openai.com/v1/responses', headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}, json=payload, timeout=90)
    if response.status_code != 200:
        raise ResearchProviderError(f'AI provider returned HTTP {response.status_code}.')
    data = response.json()
    for item in data.get('output', []):
        if item.get('type') == 'message':
            text = ''.join(p.get('text', '') for p in item.get('content', []) if p.get('type') == 'output_text')
            if text.strip():
                return text.strip()
    raise ResearchProviderError('AI provider returned no research text.')


def research(question: str, year: str, subject: str) -> dict[str, Any]:
    query = f'Fiji {year} Industrial Arts {subject} {question}'
    try:
        results = web_search(query)
        search_error = ''
    except Exception as exc:
        results = []
        search_error = str(exc)

    if len(results) < 4:
        try:
            official = web_search(f'site:education.gov.fj Industrial Arts {year} {subject} {question}', limit=6)
            seen = {r['url'] for r in results}
            results.extend(r for r in official if r['url'] not in seen)
        except Exception:
            pass

    api_key = os.getenv('OPENAI_API_KEY')
    if api_key and results:
        try:
            answer = _openai_research(question, year, subject, results, api_key)
            mode = 'ai_web_research'
        except ResearchProviderError as exc:
            answer = 'AI research could not be completed. The live search results are still available below.'
            mode = 'web_search_fallback'
            search_error = str(exc)
    elif results:
        answer = 'Live search is working. Add the OpenAI API key on the Render service to enable the AI-written research brief.'
        mode = 'web_search_only'
    else:
        answer = 'No live search results were returned. Try a more specific Industrial Arts question.'
        mode = 'search_unavailable'

    return {'mode': mode, 'query': query, 'answer': answer, 'sources': results, 'search_error': search_error}
