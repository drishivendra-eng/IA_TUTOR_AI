"""Retrieval for the Year 9 Basic Technology PDFs stored on the repository main branch.

The deployed application branch may differ from the branch holding the source PDFs. Fetch only the
two configured source files, cache extracted page text in-process, and never fabricate a source hit.
"""
from __future__ import annotations

import io
import re
from functools import lru_cache
from typing import Any

import requests

SOURCES = (
    {
        "key": "year9_textbook",
        "title": "Year 9 Basic Technology Textbook",
        "url": "https://raw.githubusercontent.com/drishivendra-eng/IA_TUTOR_AI/main/docs/moe/year9/YEAR%209%20Basic%20Technology%20Txt%20Bk%20Amended%20(1)%20-%20eidted.pdf",
        "source_type": "textbook",
    },
    {
        "key": "year9_workbook",
        "title": "Year 9 Basic Technology Workbook",
        "url": "https://raw.githubusercontent.com/drishivendra-eng/IA_TUTOR_AI/main/docs/moe/year9/BT%20Yr%209%20Workbook.pdf",
        "source_type": "workbook",
    },
)
MAX_PDF_BYTES = 24 * 1024 * 1024


def _terms(text: str) -> list[str]:
    return [word for word in re.findall(r"[a-z0-9]+", text.lower()) if len(word) > 2]


@lru_cache(maxsize=2)
def _load_pages(source_key: str) -> tuple[dict[str, Any], ...]:
    source = next((item for item in SOURCES if item["key"] == source_key), None)
    if not source:
        return ()
    try:
        response = requests.get(source["url"], timeout=45, headers={"User-Agent": "IA-Tutor-SourceLibrary/1.0"}, stream=True)
        response.raise_for_status()
        content = bytearray()
        for chunk in response.iter_content(256 * 1024):
            if chunk:
                content.extend(chunk)
                if len(content) > MAX_PDF_BYTES:
                    raise ValueError("Source PDF exceeds the configured download limit.")
        response.close()
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(bytes(content)))
        pages = []
        for page_number, page in enumerate(reader.pages, start=1):
            try:
                page_text = (page.extract_text() or "").strip()
            except Exception:
                page_text = ""
            if page_text:
                pages.append({"page": page_number, "text": page_text})
        return tuple(pages)
    except Exception:
        # Source failure must be explicit; the tutor may ask for an upload instead.
        return ()


def search_year9_sources(question: str, source_priority: str | None = None, limit: int = 5) -> dict[str, Any]:
    """Return ranked source passages and source status for a Year 9 Basic Technology question."""
    priority = (source_priority or "").lower()
    prefer_workbook = any(term in priority for term in ("workbook", "worksheet", "sheet"))
    preferred = ("year9_workbook", "year9_textbook") if prefer_workbook else ("year9_textbook", "year9_workbook")
    query_terms = set(_terms(question))
    matches: list[dict[str, Any]] = []
    status: dict[str, str] = {}
    for key in preferred:
        source = next(item for item in SOURCES if item["key"] == key)
        pages = _load_pages(key)
        status[source["title"]] = "available" if pages else "unavailable_or_no_extractable_text"
        for page in pages:
            page_terms = _terms(page["text"])
            if not page_terms:
                continue
            counts = {}
            for term in page_terms:
                if term in query_terms:
                    counts[term] = counts.get(term, 0) + 1
            score = sum(min(count, 4) for count in counts.values())
            # Boost exact topic phrases and explicit sheet/worksheet requests.
            normalized = re.sub(r"\s+", " ", question.lower()).strip()
            text_lower = page["text"].lower()
            for phrase in ("technical drawing", "geometrical drawing", "plane geometry", "workshop safety", "sheet 3", "worksheet 3"):
                if phrase in normalized and phrase in text_lower:
                    score += 5
            if score:
                matches.append({
                    "title": source["title"],
                    "source_type": source["source_type"],
                    "page": page["page"],
                    "score": score,
                    "excerpt": page["text"][:2200],
                    "url": source["url"],
                })
    matches.sort(key=lambda item: item["score"], reverse=True)
    selected = matches[:limit]
    return {
        "matches": selected,
        "source_status": status,
        "source_found": bool(selected),
        "searched_sources": [item["title"] for item in SOURCES],
    }
