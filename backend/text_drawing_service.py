import json
import os
from typing import Any

import requests

try:
    from backend.chat_service import TutorProviderError, _extract_output_text
except ImportError:
    from chat_service import TutorProviderError, _extract_output_text


def solve_text_drawing_question(question: str, year: str, subject: str) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise TutorProviderError("AI_CONFIGURATION_ERROR", 503)

    instructions = f"""You are the Industrial Arts CAD construction assistant for Fiji secondary students.
Student context: Year {year}, subject {subject}.
Return ONLY valid JSON with this structure:
{{
 "drawing_type": string,
 "projection_type": string,
 "units": string,
 "scale": string or null,
 "overall_dimensions": {{"width": null, "height": null, "depth": null}},
 "dimensions": {{"width": null, "height": null, "depth": null}},
 "views_required": [],
 "geometric_features": [],
 "surfaces": [],
 "steps": ["numbered construction instructions as plain strings"],
 "slopes": [],
 "circles": [],
 "arcs": [],
 "construction_requirements": [],
 "cad_geometry": [
   {{"type":"line","x1":0,"y1":0,"x2":100,"y2":100,"layer":"Object","construction":false}},
   {{"type":"polyline","points":[[0,0],[100,0],[50,80]],"layer":"Object"}},
   {{"type":"circle","cx":50,"cy":50,"r":20,"layer":"Construction"}}
 ],
 "difficulty": string,
 "confidence": {{"overall": number from 0 to 1, "explanation": string}},
 "explanation": string
}}
CAD coordinates must be in a 0..1000 drawing space, x increases right and y increases down.
Only include geometry when the requested construction can be reasonably derived from the text.
Never invent measurements that were not supplied. If dimensions are missing, construct a clearly labelled not-to-scale learning example only when the student explicitly asks to construct a named geometric figure (for example a regular hexagon); otherwise return cad_geometry=[] and explain what detail is needed.
For named geometry such as triangle, arrowhead, star, circle, ellipse, tangent, bisector or regular polygon, draw the actual requested construction with construction lines where appropriate, and give ordered construction steps.
For general written/theory questions, return cad_geometry=[].
Do not return Markdown fences or extra text."""
    payload = {
        "model": os.getenv("OPENAI_TUTOR_MODEL", "gpt-4o-mini"),
        "input": [
            {"role": "developer", "content": instructions},
            {"role": "user", "content": question},
        ],
        "max_output_tokens": 2400,
    }
    try:
        response = requests.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=90,
        )
    except requests.RequestException as exc:
        raise TutorProviderError("The AI provider could not be reached.", 502) from exc
    if response.status_code >= 400:
        raise TutorProviderError("AI_DRAWING_PROVIDER_ERROR", response.status_code)
    try:
        output = _extract_output_text(response.json())
        problem = json.loads(output)
    except (ValueError, TypeError) as exc:
        raise TutorProviderError("AI_DRAWING_INVALID_RESPONSE", 502) from exc
    if not isinstance(problem, dict) or not isinstance(problem.get("cad_geometry", []), list):
        raise TutorProviderError("AI_DRAWING_INVALID_RESPONSE", 502)
    problem.setdefault("drawing_type", "Industrial Arts construction")
    problem.setdefault("projection_type", "not specified")
    problem.setdefault("units", "mm")
    problem.setdefault("dimensions", {"width": None, "height": None, "depth": None})
    problem.setdefault("overall_dimensions", {"width": None, "height": None, "depth": None})
    problem.setdefault("views_required", [])
    problem.setdefault("geometric_features", [])
    problem.setdefault("surfaces", [])
    problem.setdefault("steps", [])
    problem.setdefault("slopes", [])
    problem.setdefault("circles", [])
    problem.setdefault("arcs", [])
    problem.setdefault("construction_requirements", [])
    problem.setdefault("difficulty", "To be confirmed")
    problem.setdefault("confidence", {"overall": 0.5, "explanation": "Text-based interpretation; check the construction before drawing."})
    problem.setdefault("explanation", "Review the interpretation before generating the CAD drawing.")
    return {"mode": "live_ai", "message": "Text question analysed. Confirm the interpretation before drawing.", "problem": problem, "requires_confirmation": True}
