import json
from typing import Any


UNKNOWN_MARKERS = {'unknown', 'not visible', 'not detected', 'not provided', 'n/a', 'na'}
DIMENSION_NAMES = ('width', 'height', 'depth')


def _is_unknown(value: Any) -> bool:
    return isinstance(value, str) and value.strip().lower() in UNKNOWN_MARKERS


def _format_value(value: Any) -> str:
    if isinstance(value, dict):
        return ', '.join(f'{key.replace("_", " ")}: {_format_value(item)}' for key, item in value.items())
    if isinstance(value, list):
        return ', '.join(_format_value(item) for item in value)
    if value is None:
        return 'not visible'
    return str(value)


def _normalize_text_item(value: Any) -> str:
    if isinstance(value, str):
        return value
    return _format_value(value)


def _normalize_list(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, list):
        return [_normalize_text_item(item) for item in value]
    return [_normalize_text_item(value)]


def _normalize_dimension(value: Any, unit: str | None, confidence: float) -> dict[str, Any] | None:
    if value is None or _is_unknown(value):
        return None

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return {
            'value': value,
            'unit': unit,
            'confidence': confidence,
            'source': 'visible_dimension',
        }

    if isinstance(value, dict):
        normalized = dict(value)
        nested_value = normalized.get('value')
        if nested_value is not None and isinstance(nested_value, dict):
            nested_value = nested_value.get('value')
        normalized['value'] = None if nested_value is None or _is_unknown(nested_value) else nested_value
        normalized.setdefault('unit', unit)
        normalized.setdefault('confidence', confidence if normalized['value'] is not None else 0.0)
        normalized.setdefault('source', 'visible_dimension' if normalized['value'] is not None else 'not_visible')
        return normalized

    return None


def normalize_drawing_problem(problem: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(problem)
    units = normalized.get('units')
    confidence = normalized.get('confidence', 0.0)
    if not isinstance(confidence, (int, float)):
        confidence = 0.0

    overall_dimensions = normalized.get('overall_dimensions') or {}
    normalized['overall_dimensions'] = {
        name: _normalize_dimension(overall_dimensions.get(name), units, float(confidence))
        for name in DIMENSION_NAMES
    }

    dimensions = normalized.get('dimensions') or {}
    normalized['dimensions'] = {}
    for name in DIMENSION_NAMES:
        value = dimensions.get(name)
        if isinstance(value, dict):
            value = value.get('value')
        normalized['dimensions'][name] = None if value is None or _is_unknown(value) else value

    for field in ('steps', 'slopes', 'geometric_features', 'surfaces', 'circles', 'arcs', 'construction_requirements', 'views_required'):
        if field in normalized:
            normalized[field] = _normalize_list(normalized[field])

    return normalized


def normalize_response_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(payload)
    problem = normalized.get('problem')
    if isinstance(problem, dict):
        normalized['problem'] = normalize_drawing_problem(problem)
    return normalized
