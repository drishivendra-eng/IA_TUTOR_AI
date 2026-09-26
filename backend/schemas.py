from pydantic import BaseModel, Field, model_validator


class DimensionValue(BaseModel):
    value: float | None = Field(default=None)
    unit: str | None = Field(default=None)
    confidence: float = Field(default=0.0)
    source: str | None = Field(default=None)


class DrawingProblem(BaseModel):
    drawing_type: str
    projection_type: str
    units: str
    scale: str | None = None
    overall_dimensions: dict[str, DimensionValue | None] = Field(default_factory=dict)
    dimensions: dict[str, float | None] = Field(default_factory=dict)
    views_required: list[str] | None = None
    geometric_features: list[str] | None = None
    surfaces: list[str | dict[str, object]] | None = None
    steps: list[str] | None = None
    slopes: list[str] | None = None
    circles: list[str] | None = None
    arcs: list[str] | None = None
    construction_requirements: list[str] | None = None
    difficulty: str | int | float | None = None
    confidence: float
    explanation: str

    @model_validator(mode='before')
    @classmethod
    def normalize_unknown_dimensions(cls, values):
        if not isinstance(values, dict):
            return values

        normalized = dict(values)
        construction_requirements = normalized.get('construction_requirements')
        if isinstance(construction_requirements, str):
            normalized['construction_requirements'] = [construction_requirements]

        overall_dimensions = normalized.get('overall_dimensions') or {}
        normalized['overall_dimensions'] = {
            name: overall_dimensions.get(name)
            for name in ('width', 'height', 'depth')
        }

        dimensions = normalized.get('dimensions') or {}
        normalized['dimensions'] = {
            name: cls.normalize_dimension_value(dimensions.get(name))
            for name in ('width', 'height', 'depth')
        }
        return normalized

    @staticmethod
    def normalize_dimension_value(value):
        if isinstance(value, dict):
            return DrawingProblem.normalize_dimension_value(value.get('value'))
        if isinstance(value, str) and value.strip().lower() in {
            'unknown',
            'not visible',
            'not detected',
            'not provided',
            'n/a',
            'na',
        }:
            return None
        return value


class DrawingProblemResponse(BaseModel):
    mode: str = 'real'
    message: str = 'REAL AI ANALYSIS'
    problem: DrawingProblem
    requires_confirmation: bool = False
